import { useState } from 'react';
import { useRouter } from 'next/router';

// Pricing plans data
const pricingPlans = [
  {
    id: 'free',
    name: "Free",
    price: "$0",
    period: "/forever",
    features: [
      "Up to 5 OSCE stations",
      "Basic feedback",
      "Community support"
    ],
    isPopular: false,
    buttonText: "Current Plan",
    headerClass: "bg-emerald-500"
  },
  {
    id: 'pro',
    name: "OSCE Pro",
    price: "$79",
    period: "/month",
    features: [
      "Unlimited OSCE stations",
      "Advanced AI feedback",
      "Performance analytics",
      "Priority support",
      "Additional medical scenarios"
    ],
    isPopular: true,
    buttonText: "Subscribe to OSCE Pro",
    headerClass: "bg-pink-500"
  },
  {
    id: 'promax',
    name: "Pro Max",
    price: "$24.99",
    period: "/month",
    features: [
      "Everything in Pro",
      "Extended scenario library",
      "Specialized case studies",
      "In-depth performance metrics",
      "Premium support"
    ],
    isPopular: false,
    buttonText: "Coming Soon",
    comingSoon: true,
    headerClass: "bg-emerald-500"
  }
];

export default function SubscriptionPlans({ 
  userSubscription = { status: 'none', plan: 'none' }, 
  onSubscribe,
  onCancelSubscription,
  loading = false 
}) {
  const router = useRouter();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {pricingPlans.map((plan) => {
        const isCurrentPlan = 
          (plan.id === 'free' && userSubscription.status !== 'active') || 
          (userSubscription.status === 'active' && userSubscription.plan === plan.id && !userSubscription.cancelAtPeriodEnd);
          
        const canResubscribe = userSubscription.status === 'active' && 
                              userSubscription.plan === plan.id && 
                              userSubscription.cancelAtPeriodEnd;
        
        // Determine card header text
        let headerText = '';
        if (plan.isPopular) {
          headerText = 'Popular';
        } else if (plan.comingSoon) {
          headerText = 'Coming Soon';
        }
        
        return (
          <div 
            key={plan.id} 
            className={`bg-white border ${isCurrentPlan ? 'border-primary border-2' : 'border-border'} rounded-lg shadow-sm overflow-hidden flex flex-col`}
          >
            {/* Plan Header */}
            <div className={`${plan.headerClass} text-white px-6 py-4`}>
              {headerText && (
                <div className="text-xs font-semibold uppercase tracking-wider mb-1">
                  {headerText}
                </div>
              )}
              <h3 className="text-xl sm:text-2xl font-semibold leading-none tracking-tight text-foreground mb-4">{plan.name}</h3>
            </div>
            
            {/* Plan Price */}
            <div className="px-6 py-8 border-b border-border">
              <div className="flex items-end">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground ml-1">{plan.period}</span>
              </div>
            </div>
            
            {/* Features List */}
            <div className="px-6 py-6 flex-grow">
              <ul className="space-y-4">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <svg className="w-5 h-5 text-primary flex-shrink-0 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Action Button */}
            <div className="px-6 py-6 border-t border-border">
              {isCurrentPlan ? (
                <div className="bg-accent px-4 py-2 text-center rounded-md text-accent-foreground font-medium">
                  Current Plan
                </div>
              ) : canResubscribe ? (
                <button 
                  onClick={() => onSubscribe(plan.id)}
                  className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium transition-colors hover:bg-primary/90 disabled:opacity-50"
                  disabled={loading || plan.comingSoon}
                >
                  {loading ? 'Processing...' : 'Resubscribe'}
                </button>
              ) : (
                <button 
                  onClick={() => onSubscribe(plan.id)}
                  className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium transition-colors hover:bg-primary/90 disabled:opacity-50"
                  disabled={loading || plan.comingSoon}
                >
                  {plan.comingSoon ? 'Coming Soon' : loading ? 'Processing...' : plan.buttonText}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
} 