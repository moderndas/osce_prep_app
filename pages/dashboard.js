import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// Theme toggle component
const ThemeToggle = () => {
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <label className="swap swap-rotate">
      <input type="checkbox" onChange={toggleTheme} checked={theme === 'dark'} />
      <svg className="swap-on w-8 h-8 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"/></svg>
      <svg className="swap-off w-8 h-8 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z"/></svg>
    </label>
  );
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(null);

  const fetchStations = async () => {
    try {
      const response = await fetch('/api/stations');
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message);
      
      setStations(data.data);
    } catch (err) {
      setError('Failed to load stations');
      console.error('Error loading stations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchStations();
    }
  }, [session]);

  const handleDelete = async (stationId) => {
    if (!confirm('Are you sure you want to delete this station?')) return;

    setDeleteLoading(stationId);
    try {
      const response = await fetch(`/api/stations?stationId=${stationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete station');
      }

      // Refresh stations list
      fetchStations();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteLoading(null);
    }
  };

  const startAnalysis = (stationId) => {
    // Navigate to the station session page with the stationId
    router.push(`/stationSession?stationId=${stationId}`);
  };

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg"></span>
          <div className="text-xl">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Theme Toggle and Logout */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">
            Welcome, {session?.user?.name || session?.user?.email}
          </h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="btn btn-error"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Create New Station Button */}
        <div className="mb-8">
          {stations.length >= 5 ? (
            <div className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>You have reached the limit of 5 stations</span>
            </div>
          ) : (
            <Link 
              href="/stations/new"
              className="btn btn-primary"
            >
              Create New Station
            </Link>
          )}
        </div>

        {/* Stations List */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-xl mb-6">My Stations ({stations.length}/5)</h2>
            
            {error && (
              <div className="alert alert-error mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
              </div>
            )}

            {stations.length === 0 ? (
              <div className="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>No stations created yet.</span>
              </div>
            ) : (
              <div className="space-y-6">
                {stations.map((station) => (
                  <div 
                    key={station._id} 
                    className="card bg-base-200"
                  >
                    <div className="card-body">
                      {/* Station Name */}
                      <h3 className="card-title text-primary">
                        {station.stationName}
                      </h3>

                      {/* Clinical Background */}
                      <div className="mb-4">
                        <h4 className="font-medium">Clinical Background:</h4>
                        <p className="mt-1">{station.clinicalBackground}</p>
                      </div>

                      {/* Expected Answers */}
                      <div className="mb-4">
                        <h4 className="font-medium">Expected Answers:</h4>
                        <ul className="mt-1 list-disc list-inside">
                          {station.expectedAnswers.map((answer, index) => (
                            <li key={index}>{answer}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Initial Question (10 seconds) */}
                      {station.initialQuestion && (
                        <div className="mb-4">
                          <h4 className="font-medium">Initial Question (10 seconds):</h4>
                          <p className="mt-1">{station.initialQuestion}</p>
                        </div>
                      )}

                      {/* Five Minute Question */}
                      {station.fiveMinuteQuestion && (
                        <div className="mb-4">
                          <h4 className="font-medium">Five Minute Question:</h4>
                          <p className="mt-1">{station.fiveMinuteQuestion}</p>
                        </div>
                      )}

                      {/* Created Date */}
                      <div className="text-sm opacity-70">
                        Created: {new Date(station.createdAt).toLocaleDateString()}
                      </div>

                      {/* Action Buttons */}
                      <div className="card-actions justify-end mt-4">
                        <button
                          onClick={() => startAnalysis(station._id)}
                          className="btn btn-success"
                        >
                          Start Analysis
                        </button>
                        <button
                          onClick={() => handleDelete(station._id)}
                          disabled={deleteLoading === station._id}
                          className="btn btn-error"
                        >
                          {deleteLoading === station._id ? (
                            <>
                              <span className="loading loading-spinner"></span>
                              Deleting...
                            </>
                          ) : 'Delete Station'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 