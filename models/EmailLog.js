// models/EmailLog.js
import mongoose from "mongoose";

const EmailLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: { type: String, enum: ["welcome"], required: true, index: true },

    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
      index: true,
    },
    providerMessageId: { type: String, default: "" },
    error: { type: String, default: "" },
  },
  { timestamps: true }
);

// ✅ prevents duplicates: only one “welcome” log per user
EmailLogSchema.index({ userId: 1, type: 1 }, { unique: true });

export default mongoose.models.EmailLog ||
  mongoose.model("EmailLog", EmailLogSchema);
