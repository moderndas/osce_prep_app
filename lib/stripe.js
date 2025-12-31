// lib/stripe.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default stripe;

export const CREDIT_PACK_PRICES = {
  PACK3: process.env.STRIPE_PRICE_PACK3, // $20 one-time
  PACK10: process.env.STRIPE_PRICE_PACK10, // $52 one-time
};

export const createCheckoutSessionForPack = async (
  priceId,
  customerId,
  metadata = {}
) => {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "http://localhost:3000");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    client_reference_id: metadata?.clerkUserId || undefined, // ✅ helpful
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/dashboard/subscription?canceled=true`,
    metadata,
  });

  return session;
};
