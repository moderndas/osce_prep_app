import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  clerkUserId: {
    type: String,
    required: [true, 'Clerk User ID is required'],
    unique: true,
    index: true
  },
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