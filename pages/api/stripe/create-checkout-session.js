// pages/api/stripe/create-checkout-session.js
import { requireAuth } from "../../../lib/auth-clerk";
import dbConnect from "../../../lib/db";
import User from "../../../models/User";
import stripe, {
  CREDIT_PACK_PRICES,
  createCheckoutSessionForPack,
} from "../../../lib/stripe";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const { pack } = req.body; // "pack3" or "pack10"
    if (!pack || !["pack3", "pack10"].includes(pack)) {
      return res.status(400).json({ error: "Invalid pack selected" });
    }

    await dbConnect();
    const user = auth.user;

    if (user.restricted) {
      return res
        .status(403)
        .json({ error: "Account restricted. Please contact support." });
    }

    const priceId =
      pack === "pack3" ? CREDIT_PACK_PRICES.PACK3 : CREDIT_PACK_PRICES.PACK10;

    if (!priceId || !String(priceId).startsWith("price_")) {
      return res.status(500).json({ error: "Stripe price id missing/invalid" });
    }

    // ✅ One consistent tag for OSCEHelp across everything
    const appTag = "oscehelp";

    // Ensure Stripe customer
    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          app: appTag, // ✅ so you can filter customers too
          userId: user._id.toString(),
          clerkUserId: user.clerkUserId,
        },
      });
      user.stripeCustomerId = customer.id;
      await user.save();
    } else {
      // ✅ Optional (recommended): ensure existing customer is tagged too
      // (Safe even if it already exists)
      try {
        await stripe.customers.update(user.stripeCustomerId, {
          metadata: {
            app: appTag,
            userId: user._id.toString(),
            clerkUserId: user.clerkUserId,
          },
        });
      } catch (e) {
        // don't block checkout if metadata update fails
        console.warn(
          "Stripe customer metadata update failed:",
          e?.message || e
        );
      }
    }

    // ✅ Metadata is the key: this is what lets you filter OSCE-only payments
    const session = await createCheckoutSessionForPack(
      priceId,
      user.stripeCustomerId,
      {
        app: appTag, // ✅ OSCE filter tag
        userId: user._id.toString(),
        clerkUserId: user.clerkUserId,
        pack, // pack3 / pack10
      }
    );

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return res.status(500).json({
      error: "Failed to create checkout session",
      message: error.message,
    });
  }
}
