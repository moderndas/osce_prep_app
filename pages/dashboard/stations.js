import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import UserDashboardLayout from '../../components/UserDashboardLayout';
import Link from 'next/link';

export default function StationsPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);

  // Function to handle Practice Now button click
  const handlePracticeNow = (station) => {
    setSelectedStation(station);
    setShowTipsModal(true);
  };

  // Function to proceed to station after reading tips
  const proceedToStation = () => {
    setShowTipsModal(false);
    if (selectedStation) {
      router.push(`/stations/${selectedStation._id}`);
    }
  };

  // Fetch stations
  useEffect(() => {
    if (isSignedIn && user) {
      const fetchStations = async () => {
        try {
          const response = await fetch('/api/stations');
          const data = await response.json();
          
          if (!response.ok) throw new Error(data.message);
          
          // Use the actual stations data from API
          setStations(data.data || []);
        } catch (err) {
          setError('Failed to load stations');
          console.error('Error loading stations:', err);
          // Only use sample data if there's a network error and no real data
          setStations([]);
        } finally {
          setLoading(false);
        }
      };
      
      fetchStations();
    }
  }, [isSignedIn, user]);

  // Protect the route
  if (isLoaded && !isSignedIn) {
    router.push('/auth/signin');
    return null;
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <div className="text-xl text-foreground">Loading stations...</div>
        </div>
      </div>
    );
  }

  // Function to truncate text with ellipsis
  const truncateText = (text, maxLength = 150) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <UserDashboardLayout>
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-4">Available OSCE Stations</h2>
        <p className="text-muted-foreground">Practice with our collection of OSCE stations.</p>
      </div>
      
      {error && (
        <div className="alert alert-error mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      
      {stations.length === 0 ? (
        <div className="bg-white border border-border rounded-lg shadow p-6 text-center">
          <h3 className="text-xl sm:text-2xl font-semibold leading-none tracking-tight text-foreground mb-4">No Stations Available</h3>
          <p className="mt-2 text-muted-foreground">There are currently no OSCE stations available for practice.</p>
          <p className="mt-2 text-sm text-muted-foreground">Please check back later for new content.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stations.map((station) => (
            <div key={station._id} className="bg-white border border-border rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-warm-600 mb-2">{station.stationName}</h3>
                  <span className="px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap" 
                    style={{ 
                      backgroundColor: station.difficulty === 'Low' ? '#dcfce7' : 
                                      station.difficulty === 'Medium' ? '#fef3c7' : 
                                      '#fee2e2',
                      color: station.difficulty === 'Low' ? '#166534' : 
                             station.difficulty === 'Medium' ? '#d97706' : 
                             '#dc2626'
                    }}>
                    Level - {station.difficulty || 'Medium'}
                  </span>
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground mt-2 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{station.duration || 7} minutes</span>
                </div>
                
                <div className="mb-6 text-muted-foreground text-sm">
                  <p>{truncateText(station.clinicalBackground || station.description, 120)}</p>
                </div>
                
                <div>
                  <button 
                    onClick={() => handlePracticeNow(station)}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 px-4 rounded-md font-medium transition-colors"
                  >
                    Practice Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tips Modal */}
      {showTipsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Heads Up! Important Tips</h2>
                <button 
                  onClick={() => setShowTipsModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                {/* DO Item with Checkmark Icon - First */}
                <div className="bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">DO wait and listen for about 2-3 seconds after you say your question/sentence</h3>
                      <p className="text-sm text-green-700 mt-1">The AI actor is processing your question & will respond in 2-3 seconds.</p>
                    </div>
                  </div>
                </div>

                {/* DON'T Items with Stop Sign Icons */}
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" strokeWidth="2"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 9l-6 6M9 9l6 6"/>
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">DON'T click "back" on your browser or reload the page</h3>
                      <p className="text-sm text-red-700 mt-1">This will interrupt your session and you'll lose your progress.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" strokeWidth="2"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 9l-6 6M9 9l6 6"/>
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">DON'T talk to someone else or say things out loud to yourself</h3>
                      <p className="text-sm text-red-700 mt-1">This can confuse the AI actor and disrupt the session flow.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" strokeWidth="2"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 9l-6 6M9 9l6 6"/>
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">DON'T repeat your question or sentences immediately if AI actor don't respond</h3>
                      <p className="text-sm text-red-700 mt-1">Wait around 5-6 seconds. If still no response, then you may repeat your question/sentence.</p>
                    </div>
                  </div>
                </div>

                {/* DO Item with Checkmark Icon */}
                <div className="bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">DO repeat your question if response seems cut off or unclear</h3>
                      <p className="text-sm text-green-700 mt-1">The AI actor will provide their response again with better clarity.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowTipsModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button 
                  onClick={proceedToStation}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  OK, Proceed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </UserDashboardLayout>
  );
} 