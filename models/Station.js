import mongoose from 'mongoose';

const StationSchema = new mongoose.Schema({
  stationName: {
    type: String,
    required: [true, 'Station name is required'],
    trim: true,
  },
  clinicalBackground: {
    type: String,
    required: [true, 'Clinical background is required'],
  },
  expectedAnswers: {
    type: [String],
    required: [true, 'At least one expected answer is required'],
  },
  stationInstructions: {
    type: String,
    required: false,
  },
  initialQuestion: {
    type: String,
    required: false,
    description: 'Question to be presented after 10 seconds'
  },
  fiveMinuteQuestion: {
    type: String,
    required: false,
    description: 'Question to be presented at 5 minutes'
  },
  timeLimit: {
    type: Number,
    required: false,
    default: 15, // Default 15 minutes
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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

// Update the updatedAt timestamp before saving
StationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.models.Station || mongoose.model('Station', StationSchema); 