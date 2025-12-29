// pages/api/clerk-webhook.js
import { Webhook } from "svix";
import { buffer } from "micro";
import { createUserFromWebhook } from "../../lib/auth-clerk";
import dbConnect from "../../lib/db";
import User from "../../models/User";

// ✅ Email
import EmailLog from "../../models/EmailLog";
import { sendWelcomeEmail } from "../../lib/postmark";

// Important: Set this environment variable with your Clerk webhook signing secret
const CLERK_WEBHOOK_SIGNING_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

export const config = {
  api: {
    bodyParser: false, // We need the raw body to verify the signature
  },
};

// tiny helper
function firstNameFromFullName(fullName) {
  const first = String(fullName || "")
    .trim()
    .split(/\s+/)[0];
  return first || "there";
}

export default async function handler(req, res) {
  console.log("🔔 Clerk webhook received:", req.method, req.url);

  if (req.method !== "POST") {
    console.log("❌ Invalid method:", req.method);
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  if (!CLERK_WEBHOOK_SIGNING_SECRET) {
    console.error("❌ CLERK_WEBHOOK_SIGNING_SECRET is not set.");
    return res
      .status(500)
      .json({ error: "Server configuration error: Missing webhook secret." });
  }

  // Get the Svix headers for verification
  const svix_id = req.headers["svix-id"];
  const svix_timestamp = req.headers["svix-timestamp"];
  const svix_signature = req.headers["svix-signature"];

  console.log("🔍 Svix headers:", {
    svix_id,
    svix_timestamp,
    svix_signature: svix_signature ? "***" : "missing",
  });

  // If any of the Svix headers are missing, it's a bad request
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("❌ Missing Svix headers");
    return res.status(400).json({ error: "Missing Svix headers" });
  }

  // Read the raw request body
  const body = (await buffer(req)).toString();
  console.log("📦 Webhook body length:", body.length);

  // Create a new Svix webhook instance
  const wh = new Webhook(CLERK_WEBHOOK_SIGNING_SECRET);

  let evt;
  try {
    // Verify the webhook signature
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
    console.log("✅ Webhook signature verified successfully");
  } catch (err) {
    console.error("❌ Error verifying webhook signature:", err.message);
    return res
      .status(400)
      .json({ error: "Webhook signature verification failed" });
  }

  // Handle the event
  const { type, data } = evt;
  console.log(`🎯 Processing Clerk webhook event: ${type}`);
  console.log("📋 Event data keys:", Object.keys(data));

  // Ensure database connection
  try {
    await dbConnect();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return res.status(500).json({ error: "Database connection failed" });
  }

  // ✅ helper: send welcome once per user (best-effort)
  // IMPORTANT: Ensure EmailLog has a UNIQUE index on { userId, type } to guarantee "once".
  async function sendWelcomeOnce(mongoUser) {
    try {
      if (!mongoUser?._id || !mongoUser?.email) return;

      // 1) Create a unique log (upsert). If it already exists, skip sending.
      const up = await EmailLog.updateOne(
        { userId: mongoUser._id, type: "welcome" },
        { $setOnInsert: { status: "pending" } },
        { upsert: true }
      );

      // Support both possible shapes depending on driver/version
      const inserted = up?.upsertedCount === 1 || Boolean(up?.upsertedId);

      // If NOT inserted, it means welcome was already attempted/logged earlier
      if (!inserted) {
        console.log(
          "📨 Welcome email already logged, skipping:",
          mongoUser.email
        );
        return;
      }

      const firstName = firstNameFromFullName(mongoUser.name);

      // 2) Send email (best effort)
      const resp = await sendWelcomeEmail({
        toEmail: mongoUser.email,
        firstName, // ✅ matches your "Hi {{first_name}}" structure
      });

      // Postmark typically returns MessageID (capitalized)
      const messageId = resp?.MessageID || resp?.messageId || "";

      // 3) Mark as sent
      await EmailLog.updateOne(
        { userId: mongoUser._id, type: "welcome" },
        { $set: { status: "sent", providerMessageId: messageId } }
      );

      console.log("✅ Welcome email sent:", {
        to: mongoUser.email,
        messageId: messageId || null,
      });
    } catch (e) {
      console.error("❌ Welcome email failed:", e?.message || e);

      // Mark as failed (but DON'T break signup)
      try {
        await EmailLog.updateOne(
          { userId: mongoUser._id, type: "welcome" },
          { $set: { status: "failed", error: String(e?.message || e) } }
        );
      } catch {}
    }
  }

  switch (type) {
    case "user.created":
      try {
        const {
          id: clerkUserId,
          email_addresses,
          first_name,
          last_name,
        } = data;

        console.log("👤 Processing user.created:", {
          clerkUserId,
          email: email_addresses?.[0]?.email_address,
          firstName: first_name,
          lastName: last_name,
          totalEmailAddresses: email_addresses?.length,
        });

        if (!clerkUserId) {
          console.error("❌ Webhook user.created: Missing clerkUserId in data");
          return res
            .status(400)
            .json({ error: "Missing clerkUserId in webhook data" });
        }

        // Create/update Mongo user
        const mongoUser = await createUserFromWebhook(data);

        console.log("✅ MongoDB user created/updated:", {
          mongoId: mongoUser._id,
          clerkUserId: mongoUser.clerkUserId,
          name: mongoUser.name,
          email: mongoUser.email,
          role: mongoUser.role,
          subscriptionStatus: mongoUser.subscriptionStatus,
        });

        // ✅ NEW: send welcome email once (best-effort)
        // Not awaited to keep webhook fast; failures are logged in EmailLog.
        sendWelcomeOnce(mongoUser);

        return res.status(200).json({
          success: true,
          message: "User created event processed successfully",
          mongoUserId: mongoUser._id,
        });
      } catch (error) {
        console.error(
          "❌ Webhook user.created: Error processing event:",
          error
        );
        return res.status(500).json({
          error: "Failed to process user.created event",
          details: error.message,
        });
      }

    case "user.updated":
      try {
        const { id: clerkUserId } = data;

        console.log("🔄 Processing user.updated:", { clerkUserId });

        if (!clerkUserId) {
          console.error("❌ Webhook user.updated: Missing clerkUserId in data");
          return res
            .status(400)
            .json({ error: "Missing clerkUserId in webhook data" });
        }

        const mongoUser = await createUserFromWebhook(data);

        console.log("✅ MongoDB user updated:", {
          mongoId: mongoUser._id,
          clerkUserId: mongoUser.clerkUserId,
          name: mongoUser.name,
          email: mongoUser.email,
          role: mongoUser.role,
          updatedAt: mongoUser.updatedAt,
        });

        return res.status(200).json({
          success: true,
          message: "User updated event processed successfully",
          mongoUserId: mongoUser._id,
        });
      } catch (error) {
        console.error(
          "❌ Webhook user.updated: Error processing event:",
          error
        );
        return res.status(500).json({
          error: "Failed to process user.updated event",
          details: error.message,
        });
      }

    case "user.deleted":
      try {
        const { id: clerkUserId } = data;

        console.log("🗑️ Processing user.deleted:", { clerkUserId });

        if (!clerkUserId) {
          console.error("❌ Webhook user.deleted: Missing clerkUserId in data");
          return res
            .status(400)
            .json({ error: "Missing clerkUserId in webhook data" });
        }

        const existingUser = await User.findOne({ clerkUserId });

        if (!existingUser) {
          console.log(
            "⚠️ User not found in MongoDB, may have been already deleted:",
            clerkUserId
          );
          return res.status(200).json({
            success: true,
            message:
              "User not found in database (may have been already deleted)",
          });
        }

        console.log("📋 User found for deletion:", {
          mongoId: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
        });

        const deleteResult = await User.deleteOne({ clerkUserId });

        if (deleteResult.deletedCount === 1) {
          console.log("✅ MongoDB user deleted successfully:", {
            clerkUserId,
            mongoId: existingUser._id,
          });

          return res.status(200).json({
            success: true,
            message: "User deleted event processed successfully",
            deletedUserId: existingUser._id,
          });
        }

        console.error("❌ Failed to delete user from MongoDB:", {
          clerkUserId,
          deletedCount: deleteResult.deletedCount,
        });

        return res.status(500).json({
          error: "Failed to delete user from database",
          details: `Expected to delete 1 user, but deleted ${deleteResult.deletedCount}`,
        });
      } catch (error) {
        console.error(
          "❌ Webhook user.deleted: Error processing event:",
          error
        );
        return res.status(500).json({
          error: "Failed to process user.deleted event",
          details: error.message,
        });
      }

    default:
      console.log(`⚠️ Webhook received but not handled: ${type}`);
      return res.status(200).json({
        success: true,
        message: `Webhook received but no action taken for event type: ${type}`,
      });
  }
}
