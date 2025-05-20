import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';

// Import the client-only component that contains all browser-specific code
// No need for SSR on this component
const StationDetail = dynamic(() => import('../../components/StationDetail'), {
  ssr: false,
});

export default function StationDetailPage({ station, error }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isFetchingStation, setIsFetchingStation] = useState(false);
  
  // Protect the route
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (status === 'loading' || isFetchingStation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg"></span>
          <div className="text-xl">Loading station...</div>
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-base-200 p-4">
        <div className="alert alert-error max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

// Server-side data fetching
export async function getServerSideProps(context) {
  const { id } = context.params;
  const session = await getServerSession(context.req, context.res, authOptions);

  // Check for authentication
  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }
  
  try {
    // Connect to the database directly
    const { connectDB } = await import('../../lib/mongodb');
    const { ObjectId } = await import('mongodb');
    const db = await connectDB();
    
    // Safely convert the ID string to a MongoDB ObjectId
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (err) {
      throw new Error('Invalid station ID format');
    }
    
    // Get the station from the database
    const stationData = await db.collection('stations').findOne({ _id: objectId });
    
    if (!stationData) {
      throw new Error('Station not found');
    }
    
    // Convert MongoDB document to plain object with properly stringified _id
    const station = JSON.parse(JSON.stringify({
      ...stationData,
      id: stationData._id.toString()
    }));
    
    return {
      props: {
        station: station || null,
      },
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    
    return {
      props: {
        station: null,
        error: error.message || 'Failed to load station',
      },
    };
  }
} 