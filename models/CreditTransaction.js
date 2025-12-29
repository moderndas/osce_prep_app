// models/CreditTransaction.js
import mongoose from "mongoose";

const CreditTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Stripe refs for audit + idempotency
    stripeEventId: { type: String, index: true },

    stripeCheckoutSessionId: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
    },

    stripePaymentIntentId: {
      type: String,
      index: true,
      sparse: true,
    },

    // extra Stripe refs (useful for refunds/disputes)
    stripeChargeId: { type: String, index: true, default: null },
    stripeRefundId: { type: String, index: true, default: null },
    stripeDisputeId: { type: String, index: true, default: null },

    // Pack + credits
    packType: {
      type: String,
      enum: ["PACK3", "PACK10", "ADJUSTMENT"],
      required: true,
      index: true,
    },
    creditsDelta: { type: Number, required: true }, // +3, +10, negative for reversals

    // kind of transaction
    kind: {
      type: String,
      enum: ["purchase", "refund", "dispute", "manual"],
      default: "purchase",
      index: true,
    },

    relatedTxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CreditTransaction",
      default: null,
      index: true,
    },

    stationsBalanceBefore: { type: Number, default: null },
    stationsBalanceAfter: { type: Number, default: null },

    amountCents: { type: Number, default: 0 },
    currency: { type: String, default: "cad" },

    status: {
      type: String,
      enum: ["succeeded", "refunded", "disputed", "blocked_restricted"],
      default: "succeeded",
      index: true,
    },

    note: { type: String, default: "" },

    // ✅ You no longer need manual createdAt; timestamps will add createdAt + updatedAt
    // createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ✅ Safer idempotency indexes:

// 1) Purchases: unique checkout session id already guarantees "one purchase row per session"

// 2) Refunds/disputes: prevent duplicates if Stripe retries
CreditTransactionSchema.index(
  { stripeRefundId: 1 },
  { unique: true, sparse: true }
);
CreditTransactionSchema.index(
  { stripeDisputeId: 1 },
  { unique: true, sparse: true }
);

// 3) One row per Stripe event per kind (recommended)
CreditTransactionSchema.index(
  { stripeEventId: 1, kind: 1 },
  { unique: true, sparse: true }
);

export default mongoose.models.CreditTransaction ||
  mongoose.model("CreditTransaction", CreditTransactionSchema);
