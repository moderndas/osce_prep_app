// models/User.js
import mongoose from "mongoose";

const TRIAL_CAP_SECONDS = 120;

const UserSchema = new mongoose.Schema(
  {
    clerkUserId: {
      type: String,
      required: [true, "Clerk User ID is required"],
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },

    stripeCustomerId: {
      type: String,
      default: null,
      index: true,
    },

    stationsBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    trialSecondsUsed: {
      type: Number,
      default: 0,
      min: 0,
      max: TRIAL_CAP_SECONDS, // ✅ hard cap
    },

    restricted: {
      type: Boolean,
      default: false,
      index: true,
    },

    restrictedAt: { type: Date, default: null },
    restrictedReason: { type: String, default: "" },

    checkoutBlockedUntil: { type: Date, default: null },
    checkoutBlockReason: { type: String, default: "" },

    stripeRisk: {
      failedPayments: { type: Number, default: 0, min: 0 },
      lastFailedPaymentAt: { type: Date, default: null },

      refunds: { type: Number, default: 0, min: 0 },
      lastRefundAt: { type: Date, default: null },

      disputes: { type: Number, default: 0, min: 0 },
      lastDisputeAt: { type: Date, default: null },
    },

    subscriptionStatus: {
      type: String,
      enum: ["none", "active", "canceled", "past_due", "trialing"],
      default: "none",
    },
    subscriptionPlan: {
      type: String,
      enum: ["none", "pro", "promax", "monthly", "annual", "quarterly"],
      default: "none",
    },
  },
  { timestamps: true } // ✅ adds createdAt + updatedAt
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
