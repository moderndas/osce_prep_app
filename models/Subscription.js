import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  stripeCustomerId: {
    type: String,
    required: true,
  },
  stripeSubscriptionId: {
    type: String,
    required: true,
  },
  stripePriceId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired'],
    default: 'active',
  },
  plan: {
    type: String,
    enum: ['monthly', 'annual', 'quarterly', 'none'],
    default: 'none',
  },
  currentPeriodStart: {
    type: Date,
  },
  currentPeriodEnd: {
    type: Date,
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false,
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

// Update timestamp on save
SubscriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema); 