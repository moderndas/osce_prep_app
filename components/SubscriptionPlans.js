// components/SubscriptionPlans.js
import { useRouter } from "next/router";

const packs = [
  {
    id: "pack3",
    name: "3 Stations",
    price: "$24.99",
    features: ["3 station attempts", "Use anytime", "CAD one-time payment"],
    isPopular: false,
    buttonText: "Buy 3 Stations",
    headerClass: "bg-emerald-500",
  },
  {
    id: "pack10",
    name: "10 Stations",
    price: "$69.99",
    features: ["10 station attempts", "Best value", "CAD one-time payment"],
    isPopular: true,
    buttonText: "Buy 10 Stations",
    headerClass: "bg-pink-500",
  },
];

export default function SubscriptionPlans({
  access = {
    restricted: false,
    stationsBalance: 0,
    trialSecondsRemaining: 120,
  },
  onBuyPack,
  loading = false,
}) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {packs.map((pack) => (
        <div
          key={pack.id}
          className="bg-white border border-border rounded-lg shadow-sm overflow-hidden flex flex-col"
        >
          <div className={`${pack.headerClass} text-white px-6 py-4`}>
            {pack.isPopular && (
              <div className="text-xs font-semibold uppercase tracking-wider mb-1">
                Popular
              </div>
            )}
            <h3 className="text-xl sm:text-2xl font-semibold leading-none tracking-tight mb-2">
              {pack.name}
            </h3>
          </div>

          <div className="px-6 py-8 border-b border-border">
            <div className="flex items-end">
              <span className="text-4xl font-bold text-foreground">
                {pack.price}
              </span>
              <span className="text-muted-foreground ml-2">one-time</span>
            </div>
          </div>

          <div className="px-6 py-6 flex-grow">
            <ul className="space-y-4">
              {pack.features.map((feature, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="w-2 h-2 rounded-full bg-primary mt-2 mr-2"></span>
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="px-6 py-6 border-t border-border">
            <button
              onClick={() => onBuyPack(pack.id)}
              className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium transition-colors hover:bg-primary/90 disabled:opacity-50"
              disabled={loading || access.restricted}
            >
              {loading ? "Processing..." : pack.buttonText}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
