import { requireAuth } from '../../../lib/auth-clerk';
import dbConnect from '../../../lib/db';
import User from '../../../models/User';
import Subscription from '../../../models/Subscription';
import stripe, { cancelSubscription } from '../../../lib/stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await requireAuth(req, res);
    if (!auth) return; // requireAuth already sends error response

    await dbConnect();
    
    // User is already available from requireAuth
    const user = auth.user;
    
    // Check if user has an active subscription
    if (user.subscriptionStatus !== 'active') {
      return res.status(400).json({ error: 'No active subscription to cancel' });
    }
    
    // Find the subscription in our database
    const subscription = await Subscription.findOne({ 
      userId: user._id,
      status: 'active' 
    });
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    // Cancel the subscription in Stripe
    // This will cancel at period end by default
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    });
    
    // Update our records
    subscription.cancelAtPeriodEnd = true;
    await subscription.save();
    
    return res.status(200).json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period'
    });
    
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return res.status(500).json({ error: 'Failed to cancel subscription', message: error.message });
  }
} 