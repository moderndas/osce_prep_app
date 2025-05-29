import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import UserDashboardLayout from '../../components/UserDashboardLayout';
import SubscriptionPlans from '../../components/SubscriptionPlans';

// Load Stripe outside of component render cycle
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function SubscriptionPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userSubscription, setUserSubscription] = useState({
    status: 'none',
    plan: 'none'
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  // Fetch user subscription status on load
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchSubscriptionStatus();
    }
  }, [isLoaded, isSignedIn]);

  // Check for success/canceled URL params
  useEffect(() => {
    if (router.query.success) {
      setMessage({ type: 'success', text: 'Payment successful! Your subscription has been activated.' });
      // Immediately fetch subscription status after successful payment
      fetchSubscriptionStatus();
      
      // Add a second fetch after a slight delay to account for webhook processing
      const timer = setTimeout(() => {
        fetchSubscriptionStatus();
      }, 2000);
      
      return () => clearTimeout(timer);
    } else if (router.query.canceled) {
      setMessage({ type: 'info', text: 'Payment canceled. Your subscription has not changed.' });
    }

    // Clear query params after displaying message
    if (router.query.success || router.query.canceled) {
      const { pathname } = router;
      router.replace(pathname, undefined, { shallow: true });
    }
  }, [router.query]);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/user/subscription');
      if (response.ok) {
        const data = await response.json();
        setUserSubscription({
          status: data.subscriptionStatus || 'none',
          plan: data.subscriptionPlan || 'none',
          cancelAtPeriodEnd: data.subscription?.cancelAtPeriodEnd || false,
          currentPeriodEnd: data.subscription?.currentPeriodEnd || null
        });
      }
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
    }
  };

  // Handle subscription
  const handleSubscribe = async (priceId) => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userEmail: user.primaryEmailAddress?.emailAddress
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create checkout session');
      }
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to start subscription process'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
      });
      
      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: 'Your subscription has been canceled. You will have access until the end of your billing period.' 
        });
        fetchSubscriptionStatus();
      } else {
        const error = await response.json();
        setMessage({ 
          type: 'error', 
          text: `Failed to cancel subscription: ${error.message}` 
        });
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to cancel subscription. Please try again later.' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Protect the route
  if (isLoaded && !isSignedIn) {
    router.push('/auth/signin');
    return null;
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <div className="text-xl text-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <UserDashboardLayout>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">Choose the right plan for your OSCE preparation needs.</h2>
        
        {message.text && (
          <div className={`alert ${message.type === 'success' ? 'alert-success' : message.type === 'info' ? 'alert-info' : 'alert-error'} mt-4`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>{message.text}</span>
          </div>
        )}
        
        {userSubscription.status === 'active' && (
          <div className="bg-white border border-border rounded-lg shadow-sm p-6 mt-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-foreground">Active Subscription</h3>
                <div className="text-muted-foreground mt-1">
                  You are currently on the {userSubscription.plan.charAt(0).toUpperCase() + userSubscription.plan.slice(1)} plan.
                </div>
                {userSubscription.cancelAtPeriodEnd && (
                  <div className="mt-2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm inline-block">
                    Your subscription will end on {new Date(userSubscription.currentPeriodEnd).toLocaleDateString()}
                  </div>
                )}
              </div>
              
              {!userSubscription.cancelAtPeriodEnd && (
                <button 
                  className="btn btn-outline" 
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel your subscription? You will still have access until the end of your billing period.')) {
                      handleCancelSubscription();
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Cancel Plan'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      
      <SubscriptionPlans 
        userSubscription={userSubscription}
        onSubscribe={handleSubscribe}
        onCancelSubscription={handleCancelSubscription}
        loading={loading}
      />
    </UserDashboardLayout>
  );
} 