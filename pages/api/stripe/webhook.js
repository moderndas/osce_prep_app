import { buffer } from 'micro';
import Stripe from 'stripe';
import dbConnect from '../../../lib/db';
import User from '../../../models/User';
import Subscription from '../../../models/Subscription';

// Disable Next.js body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method not allowed');
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const signature = req.headers['stripe-signature'];
    const buf = await buffer(req);
    
    // Verify the event came from Stripe
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        buf.toString(),
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Connect to database
    await dbConnect();

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { userId, plan } = session.metadata;
        
        if (!userId) {
          console.error('No userId in session metadata');
          return res.status(400).send('Missing userId in metadata');
        }
        
        // Get subscription details
        const subscriptionId = session.subscription;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        // Update user subscription status
        const user = await User.findById(userId);
        if (!user) {
          console.error(`User not found: ${userId}`);
          return res.status(404).send('User not found');
        }
        
        user.subscriptionStatus = 'active';
        user.subscriptionPlan = plan || 'monthly';
        await user.save();
        
        // Create or update subscription record
        await Subscription.findOneAndUpdate(
          { userId },
          {
            userId,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: subscription.items.data[0].price.id,
            status: subscription.status,
            plan: plan,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
          { upsert: true, new: true }
        );
        
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;
        
        // Find subscription in database
        const dbSubscription = await Subscription.findOne({ stripeSubscriptionId: subscriptionId });
        if (!dbSubscription) {
          console.error(`Subscription not found: ${subscriptionId}`);
          return res.status(404).send('Subscription not found');
        }
        
        // Update subscription record
        dbSubscription.status = subscription.status;
        dbSubscription.currentPeriodStart = new Date(subscription.current_period_start * 1000);
        dbSubscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        dbSubscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;
        await dbSubscription.save();
        
        // Update user subscription status
        const user = await User.findById(dbSubscription.userId);
        if (user) {
          user.subscriptionStatus = subscription.status;
          await user.save();
        }
        
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;
        
        // Find subscription in database
        const dbSubscription = await Subscription.findOne({ stripeSubscriptionId: subscriptionId });
        if (!dbSubscription) {
          console.error(`Subscription not found: ${subscriptionId}`);
          return res.status(404).send('Subscription not found');
        }
        
        // Update subscription record
        dbSubscription.status = 'canceled';
        await dbSubscription.save();
        
        // Update user subscription status
        const user = await User.findById(dbSubscription.userId);
        if (user) {
          user.subscriptionStatus = 'none';
          user.subscriptionPlan = 'none';
          await user.save();
        }
        
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).send(`Webhook Error: ${error.message}`);
  }
} 