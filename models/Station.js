// models/Station.js
import mongoose from "mongoose";

const FiveMinuteRulesSchema = new mongoose.Schema(
  {
    // What intent should we force on the NEXT user turn after the 5-min question fires?
    // (You already use this in StationDetail.jsx)
    defaultNextIntentType: {
      type: String,
      enum: ["confirm", "question", "script"],
      default: "confirm",
    },

    // Keywords that indicate the pharmacist is asking a counter-question
    // e.g. "what do you mean", "why are you asking"
    counterQuestionKeywords: {
      type: [String],
      default: [],
    },

    // ✅ NEW: Keywords that indicate pharmacist is trying to end the talk
    // e.g. "any other questions", "anything else", "that's all"
    endConversationKeywords: {
      type: [String],
      default: [],
    },

    // ✅ NEW: Deterministic replies (must also exist as an "Assistant:" line somewhere in systemPrompt)
    // If they don't exist in Assistant lines, script enforcement will fall back to confirm.
    counterQuestionReply: {
      type: String,
      default: "I just want to know when I should expect to feel better.",
    },
    endConversationReply: {
      type: String,
      default: "No, that's all.",
    },
    defaultReply: {
      type: String,
      default: "Okay",
    },
  },
  { _id: false }
);

const StationSchema = new mongoose.Schema({
  stationName: {
    type: String,
    required: [true, "Station name is required"],
    trim: true,
  },
  clinicalBackground: {
    type: String,
    required: [true, "Clinical background is required"],
  },
  difficulty: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium",
    description: "Difficulty level of the station",
  },
  systemPrompt: {
    type: String,
    required: false,
    description: "System prompt for station instructions and questions",
  },
  analysisPrompt: {
    type: String,
    required: false,
    description: "Prompt for analysis and evaluation of responses",
  },

  // ✅ HeyGen
  heygenAvatarName: {
    type: String,
    default: "Anastasia_Grey_Shirt_public",
    description:
      'HeyGen Streaming Avatar "avatarName" (e.g., Anastasia_Grey_Shirt_public)',
  },

  personaId: {
    type: String,
    default: "",
    description: "The ID of the persona associated with this station",
  },

  // ✅ 5-minute interrupt question (admin editable)
  fiveMinuteQuestion: {
    type: String,
    default:
      "Do you have any other concerns or questions about this medication?",
    description:
      "Question the avatar asks at ~5 minutes to simulate a patient prompt.",
  },

  // ✅ Future-proof rules for the 5-min branch
  fiveMinuteRules: {
    type: FiveMinuteRulesSchema,
    default: () => ({}),
  },

  isPublic: {
    type: Boolean,
    default: true,
    description: "Whether the station is available to all users",
  },

  createdBy: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

StationSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.models.Station ||
  mongoose.model("Station", StationSchema);
