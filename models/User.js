import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  stripeCustomerId: {
    type: String,
    default: null
  },
  subscriptionStatus: {
    type: String,
    enum: ['none', 'active', 'canceled', 'past_due', 'trialing'],
    default: 'none'
  },
  subscriptionPlan: {
    type: String,
    enum: ['none', 'pro', 'promax', 'monthly', 'annual', 'quarterly'],
    default: 'none'
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.models.User || mongoose.model('User', UserSchema); 