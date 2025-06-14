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
  difficulty: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
    description: 'Difficulty level of the station'
  },
  systemPrompt: {
    type: String,
    required: false,
    description: 'System prompt for station instructions and questions'
  },
  analysisPrompt: {
    type: String,
    required: false,
    description: 'Prompt for analysis and evaluation of responses'
  },
  personaId: {
    type: String,
    default: '',
    description: 'The ID of the persona associated with this station'
  },
  isPublic: {
    type: Boolean,
    default: true,
    description: 'Whether the station is available to all users'
  },
  createdBy: {
    type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and string
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