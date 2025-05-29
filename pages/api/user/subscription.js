import { requireAuth } from '../../../lib/auth-clerk';
import dbConnect from '../../../lib/db';
import User from '../../../models/User';
import Subscription from '../../../models/Subscription';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await requireAuth(req, res);
    if (!auth) return; // requireAuth already sends error response

    await dbConnect();
    
    // User is already available from requireAuth
    const user = auth.user;
    
    // Get subscription details if active
    let subscriptionDetails = null;
    if (user.subscriptionStatus === 'active') {
      subscriptionDetails = await Subscription.findOne({ 
        userId: user._id,
        status: 'active' 
      });
    }
    
    return res.status(200).json({
      subscriptionStatus: user.subscriptionStatus,
      subscriptionPlan: user.subscriptionPlan,
      subscription: subscriptionDetails ? {
        currentPeriodEnd: subscriptionDetails.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptionDetails.cancelAtPeriodEnd
      } : null
    });
    
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return res.status(500).json({ error: 'Failed to fetch subscription data', message: error.message });
  }
} 