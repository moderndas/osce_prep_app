// pages/api/stripe/webhook.js
import { buffer } from "micro";
import Stripe from "stripe";
import dbConnect from "../../../lib/db";
import User from "../../../models/User";
import CreditTransaction from "../../../models/CreditTransaction";
import { CREDIT_PACK_PRICES } from "../../../lib/stripe";

// ✅ keep Clerk publicMetadata.restricted in sync
import { syncClerkRestrictedFlag } from "../../../lib/auth-clerk";

export const config = { api: { bodyParser: false } };

function packCreditsFromPriceId(priceId) {
  if (!priceId) return null;
  if (priceId === CREDIT_PACK_PRICES.PACK3)
    return { packType: "PACK3", credits: 3, pack: "pack3" };
  if (priceId === CREDIT_PACK_PRICES.PACK10)
    return { packType: "PACK10", credits: 10, pack: "pack10" };
  return null;
}

function num(n, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function asStr(v, fallback = "") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method not allowed");

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).send("Missing STRIPE_SECRET_KEY");
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).send("Missing STRIPE_WEBHOOK_SECRET");
  }

  const signature = req.headers["stripe-signature"];
  if (!signature) {
    return res.status(400).send("Missing stripe-signature header");
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let event;
  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(
      buf.toString(),
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await dbConnect();

    switch (event.type) {
      // =========================================================
      // ✅ PURCHASE -> grant credits (idempotent)
      // =========================================================
      case "checkout.session.completed": {
        const session = event.data.object;

        // Only process paid one-time payments
        if (session.mode !== "payment" || session.payment_status !== "paid")
          break;

        const { userId, pack } = session.metadata || {};
        if (!userId) return res.status(400).send("Missing userId in metadata");

        // ✅ Idempotency: "one purchase row per Stripe event"
        // (your index is { stripeEventId, kind } unique sparse)
        const existingByEvent = await CreditTransaction.findOne({
          stripeEventId: event.id,
          kind: "purchase",
        });
        if (existingByEvent) break;

        // ✅ Idempotency: one purchase row per checkout session id
        const existingBySession = await CreditTransaction.findOne({
          stripeCheckoutSessionId: session.id,
        });
        if (existingBySession) break;

        // Retrieve full session with line items to get price id
        const fullSession = await stripe.checkout.sessions.retrieve(
          session.id,
          {
            expand: ["line_items.data.price", "payment_intent"],
          }
        );

        const priceId = fullSession?.line_items?.data?.[0]?.price?.id;
        const packInfo = packCreditsFromPriceId(priceId);

        if (!packInfo) {
          console.error("Unknown priceId in webhook:", priceId);
          return res.status(400).send("Unknown priceId");
        }

        // ✅ Cross-check pack metadata vs actual price
        if (pack && pack !== packInfo.pack) {
          console.error("Pack mismatch:", { metadataPack: pack, priceId });
          return res.status(400).send("Pack mismatch");
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).send("User not found");

        const before = num(user.stationsBalance, 0);

        // ✅ Robust payment_intent id extraction (can be expanded object or string)
        const pi = fullSession?.payment_intent;
        const paymentIntentId = typeof pi === "string" ? pi : asStr(pi?.id, "");

        // If restricted, record tx but do NOT grant credits.
        if (user.restricted) {
          try {
            await CreditTransaction.create({
              userId: user._id,
              stripeEventId: event.id,
              stripeCheckoutSessionId: session.id,
              stripePaymentIntentId: paymentIntentId || undefined,
              packType: packInfo.packType,
              creditsDelta: 0,
              amountCents: num(fullSession?.amount_total, 0),
              currency: asStr(fullSession?.currency, "usd"),
              status: "blocked_restricted",
              kind: "purchase",
              stationsBalanceBefore: before,
              stationsBalanceAfter: before,
            });
          } catch (e) {
            // ignore duplicate key errors (idempotency)
            if (e?.code !== 11000) throw e;
          }
          break;
        }

        // Grant credits
        const after = before + num(packInfo.credits, 0);
        user.stationsBalance = after;
        await user.save();

        try {
          await CreditTransaction.create({
            userId: user._id,
            stripeEventId: event.id,
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: paymentIntentId || undefined,
            packType: packInfo.packType,
            creditsDelta: num(packInfo.credits, 0),
            amountCents: num(fullSession?.amount_total, 0),
            currency: asStr(fullSession?.currency, "usd"),
            status: "succeeded",
            kind: "purchase",
            stationsBalanceBefore: before,
            stationsBalanceAfter: after,
          });
        } catch (e) {
          if (e?.code !== 11000) throw e;
        }

        break;
      }

      // =========================================================
      // ✅ DISPUTE -> restrict (fraud/abuse)
      // =========================================================
      case "charge.dispute.created": {
        const dispute = event.data.object;

        // Stripe dispute object usually has payment_intent + charge + id
        const paymentIntentId = asStr(dispute?.payment_intent, "");
        if (!paymentIntentId) break;

        // Find the original purchase tx (by payment_intent)
        const tx = await CreditTransaction.findOne({
          stripePaymentIntentId: paymentIntentId,
          kind: "purchase",
        });

        if (tx) {
          // Mark original tx
          tx.status = "disputed";
          await tx.save();

          const user = await User.findById(tx.userId);
          if (user) {
            user.restricted = true;
            await user.save();

            // ✅ Sync to Clerk so middleware can block immediately
            await syncClerkRestrictedFlag(user.clerkUserId, true);
          }

          // Record a dispute marker tx (audit + idempotent)
          try {
            await CreditTransaction.create({
              userId: tx.userId,
              stripeEventId: event.id,
              stripePaymentIntentId: paymentIntentId,
              stripeChargeId: asStr(dispute?.charge, "") || undefined,
              stripeDisputeId: asStr(dispute?.id, "") || undefined,
              packType: "ADJUSTMENT",
              creditsDelta: 0,
              amountCents: 0,
              currency: "cad",
              status: "disputed",
              kind: "dispute",
              relatedTxId: tx._id,
              note: "Stripe dispute created; user restricted.",
            });
          } catch (e) {
            if (e?.code !== 11000) throw e;
          }
        }

        break;
      }

      // =========================================================
      // ✅ REFUND -> remove credits WITHOUT restricting (if possible)
      // If credits already used -> restrict (policy abuse)
      // =========================================================
      case "charge.refunded": {
        // ✅ Event-level idempotency (per kind)
        const existingRefundEvent = await CreditTransaction.findOne({
          stripeEventId: event.id,
          kind: "refund",
        });
        if (existingRefundEvent) break;

        const charge = event.data.object;
        const paymentIntentId = asStr(charge?.payment_intent, "");
        if (!paymentIntentId) break;

        // Find the original purchase tx
        const tx = await CreditTransaction.findOne({
          stripePaymentIntentId: paymentIntentId,
          kind: "purchase",
        });

        // Only reverse if we previously granted credits successfully
        if (!tx || tx.status !== "succeeded") break;

        const user = await User.findById(tx.userId);
        if (!user) break;

        const before = num(user.stationsBalance, 0);
        const purchasedCredits = Math.max(0, num(tx.creditsDelta, 0));

        // If balance is lower than what this purchase granted, they already spent some of it
        const canFullyRevoke = before >= purchasedCredits;

        const revoke = canFullyRevoke ? purchasedCredits : before; // clamp
        const after = Math.max(0, before - revoke);

        user.stationsBalance = after;

        // honest refund: can fully revoke => no restriction
        // abuse: refund but credits already used => restrict
        if (!canFullyRevoke) {
          user.restricted = true;
        }

        await user.save();

        // ✅ Sync to Clerk (safe to call always; merges metadata)
        await syncClerkRestrictedFlag(user.clerkUserId, !!user.restricted);

        // Mark original purchase tx as refunded (so we don't reverse again)
        tx.status = "refunded";
        await tx.save();

        // Get a refund id (if present)
        const refunds = charge?.refunds?.data || [];
        const refundId =
          asStr(refunds?.[0]?.id, "") ||
          asStr(refunds?.[refunds.length - 1]?.id, "") ||
          "";

        // Record the reversal (audit + idempotent by refundId/eventId+kind)
        try {
          await CreditTransaction.create({
            userId: tx.userId,
            stripeEventId: event.id,
            stripePaymentIntentId: paymentIntentId,
            stripeChargeId: asStr(charge?.id, "") || undefined,
            stripeRefundId: refundId || undefined,
            packType: "ADJUSTMENT",
            creditsDelta: -Math.max(0, revoke),
            amountCents: -num(charge?.amount_refunded, 0),
            currency: asStr(charge?.currency, "usd"),
            status: "refunded",
            kind: "refund",
            relatedTxId: tx._id,
            stationsBalanceBefore: before,
            stationsBalanceAfter: after,
            note: canFullyRevoke
              ? "Refund processed; credits reversed."
              : "Refund processed; credits already used -> user restricted.",
          });
        } catch (e) {
          if (e?.code !== 11000) throw e;
        }

        break;
      }

      default:
        // ignore other events
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).send(`Webhook Error: ${error.message}`);
  }
}
