import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import dynamic from "next/dynamic";

// Import the client-only component that contains all browser-specific code
// No need for SSR on this component
const StationDetail = dynamic(() => import("../../components/StationDetail"), {
  ssr: false,
});

export default function StationDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isLoaded, isSignedIn } = useUser();
  const [station, setStation] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Protect the route
  // Protect the route (redirect after render)
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) router.push("/auth/signin");
  }, [isLoaded, isSignedIn, router]);

  // While redirecting (or waiting for auth), render nothing
  if (isLoaded && !isSignedIn) return null;

  // Fetch station data
  useEffect(() => {
    if (!id || !isSignedIn) return;

    const fetchStation = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/stations/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch station");
        }

        setStation(data.data);
      } catch (err) {
        console.error("Error fetching station:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStation();
  }, [id, isSignedIn]);

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg"></span>
          <div className="text-xl">Loading station...</div>
        </div>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-base-200 p-4">
        <div className="alert alert-error max-w-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error || "Station not found"}</span>
        </div>
        <Link href="/dashboard/stations" className="btn btn-primary">
          Return to Stations
        </Link>
      </div>
    );
  }

  // Pass the station data to the client-only component
  return (
    <div className="min-h-screen bg-base-100 p-4">
      <StationDetail station={station} />
    </div>
  );
}
