import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default stripe;

// Price IDs for different subscription plans (filled in with placeholder values)
export const SUBSCRIPTION_PRICES = {
  PRO: process.env.STRIPE_PRICE_PRO || 'price_test_pro',
  PROMAX: process.env.STRIPE_PRICE_PROMAX || 'price_test_promax',
};

// Helper functions for Stripe
export const createCheckoutSession = async (priceId, customerId, metadata = {}) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    customer: customerId,
    success_url: `${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/dashboard/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/dashboard/subscription?canceled=true`,
    metadata,
  });

  return session;
};

export const createCustomer = async (email, name) => {
  const customer = await stripe.customers.create({
    email,
    name,
  });

  return customer;
};

export const getSubscription = async (subscriptionId) => {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
};

export const cancelSubscription = async (subscriptionId) => {
  const subscription = await stripe.subscriptions.del(subscriptionId);
  return subscription;
}; 