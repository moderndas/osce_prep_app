import { requireAuth } from '../../../lib/auth-clerk';
import stripe, { createCheckoutSession, SUBSCRIPTION_PRICES } from '../../../lib/stripe';
import dbConnect from '../../../lib/db';
import User from '../../../models/User';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use Clerk authentication
    const auth = await requireAuth(req, res);
    if (!auth) return; // requireAuth already sends error response

    const { plan } = req.body;
    
    if (!plan || !['pro', 'promax'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    await dbConnect();
    
    // Get the price ID based on the selected plan
    let priceId;
    switch (plan) {
      case 'pro':
        priceId = SUBSCRIPTION_PRICES.PRO;
        break;
      case 'promax':
        priceId = SUBSCRIPTION_PRICES.PROMAX;
        break;
      default:
        return res.status(400).json({ error: 'Invalid plan selected' });
    }
    
    // User is already available from requireAuth
    const user = auth.user;
    
    // If user doesn't have a Stripe customer ID, create one
    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString()
        }
      });
      
      user.stripeCustomerId = customer.id;
      await user.save();
    }
    
    // Create a checkout session
    const checkoutSession = await createCheckoutSession(
      priceId,
      user.stripeCustomerId,
      {
        userId: user._id.toString(),
        plan
      }
    );
    
    return res.status(200).json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url
    });
    
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({ error: 'Failed to create checkout session', message: error.message });
  }
} 