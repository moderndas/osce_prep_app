// pages/dashboard/subscription.js
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import UserDashboardLayout from "../../components/UserDashboardLayout";
import SubscriptionPlans from "../../components/SubscriptionPlans";

export default function SubscriptionPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [access, setAccess] = useState({
    restricted: false,
    stationsBalance: 0,
    trialSecondsRemaining: 120,
  });
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (isLoaded && isSignedIn) fetchAccess();
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (router.query.success) {
      setMessage({
        type: "success",
        text: "Payment successful! Credits will appear shortly.",
      });
      fetchAccess();
      const timer = setTimeout(fetchAccess, 2000);
      return () => clearTimeout(timer);
    } else if (router.query.canceled) {
      setMessage({ type: "info", text: "Payment canceled." });
    }

    if (router.query.success || router.query.canceled) {
      const { pathname } = router;
      router.replace(pathname, undefined, { shallow: true });
    }
  }, [router.query]);

  const fetchAccess = async () => {
    try {
      const response = await fetch("/api/user/subscription"); // kept same path to minimize changes
      if (!response.ok) return;
      const data = await response.json();
      setAccess({
        restricted: !!data.restricted,
        stationsBalance: data.stationsBalance || 0,
        trialSecondsRemaining: data.trialSecondsRemaining ?? 120,
      });
    } catch (e) {
      console.error("Failed to fetch access:", e);
    }
  };

  const handleBuyPack = async (pack) => {
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack }), // "pack3" or "pack10"
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to start checkout");

      window.location.href = data.url;
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Checkout failed" });
    } finally {
      setLoading(false);
    }
  };

  if (isLoaded && !isSignedIn) {
    router.push("/auth/signin");
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
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-4">
          Buy station packs (CAD)
        </h2>

        {message.text && (
          <div
            className={`alert ${
              message.type === "success"
                ? "alert-success"
                : message.type === "info"
                ? "alert-info"
                : "alert-error"
            } mt-4`}
          >
            <span>{message.text}</span>
          </div>
        )}

        <div className="bg-white border border-border rounded-lg shadow-sm p-6 mt-6">
          <div className="flex flex-col gap-2">
            {access.restricted && (
              <div className="bg-red-100 text-red-800 px-3 py-2 rounded text-sm">
                Your account is restricted. Please contact support.
              </div>
            )}
            <div className="text-muted-foreground">
              <b>Stations remaining:</b> {access.stationsBalance}
            </div>
            <div className="text-muted-foreground">
              <b>Trial remaining:</b> {access.trialSecondsRemaining}s (2 minutes
              total)
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              <b>Important:</b> Starting a station uses 1 credit (unless trial
              is remaining). Once a station starts, you can’t go back.
            </div>
          </div>
        </div>
      </div>

      <SubscriptionPlans
        access={access}
        onBuyPack={handleBuyPack}
        loading={loading}
      />
    </UserDashboardLayout>
  );
}
