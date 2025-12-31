// models/StationUsage.js
import mongoose from "mongoose";

const StationUsageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // We store as string so it works whether your station id is ObjectId or string
    stationId: {
      type: String,
      required: true,
      index: true,
    },

    // trial = within first 120 seconds total lifetime
    // paid  = one credit deducted on start
    mode: {
      type: String,
      enum: ["trial", "paid"],
      required: true,
      index: true,
    },

    // 0 for trial, 1 for paid (since 1 credit = 1 station)
    chargedCredits: {
      type: Number,
      default: 0,
      enum: [0, 1], // ✅ lock policy
    },

    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // null means "active session"
    endedAt: {
      type: Date,
      default: null,
      index: true,
    },

    // what the client reports; server clamps in /end
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Optional metadata for debugging / abuse forensics (safe + minimal)
    requestId: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// ✅ Supports: “only 1 active station per user” + “latest active”
StationUsageSchema.index({ userId: 1, endedAt: 1, startedAt: -1 });

// ✅ Optional fast-path index for active lookup (keep if you don’t mind 1 extra index)
StationUsageSchema.index({ userId: 1, endedAt: 1 });

export default mongoose.models.StationUsage ||
  mongoose.model("StationUsage", StationUsageSchema);
