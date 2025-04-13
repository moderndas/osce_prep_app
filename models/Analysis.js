import mongoose from 'mongoose';

const AnalysisSchema = new mongoose.Schema({
  stationId: {
    type: String,
    required: true,
  },
  videoId: {
    type: String,
    required: true,
  },
  transcript: {
    type: String,
  },
  facialAnalysis: {
    type: Object,
  },
  postureAnalysis: {
    type: Object,
  },
  eyeContactAnalysis: {
    type: Object,
  },
  voiceAnalysis: {
    type: Object,
  },
  overallScore: {
    type: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Analysis || mongoose.model('Analysis', AnalysisSchema); 