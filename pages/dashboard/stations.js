import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import UserDashboardLayout from '../../components/UserDashboardLayout';
import Link from 'next/link';

// Sample station data for development (will be removed when API works)
const sampleStations = [
  {
    _id: '1',
    stationName: 'Pharmacist recommendation station',
    clinicalBackground: 'Patient is 45 year old male working as a software developer and he is coming to your pharmacy for some recommendations on the symptoms he has been experiencing.',
    duration: 10,
    difficulty: 'Medium',
    department: 'Pharmacy',
    createdAt: new Date().toISOString()
  },
  {
    _id: '2',
    stationName: 'Calcium & Ciprofloxacin Interaction',
    clinicalBackground: 'Patient is 60 years old and wants to take calcium supplement starting today. He also has a prescription of ciprofloxacin to pick up.',
    duration: 10,
    difficulty: 'Medium',
    department: 'Pharmacy',
    createdAt: new Date().toISOString()
  },
  {
    _id: '3',
    stationName: 'Diabetes Medication Counseling',
    clinicalBackground: 'Newly diagnosed Type 2 diabetes patient needs counseling on their first prescription for metformin and proper blood glucose monitoring.',
    duration: 15,
    difficulty: 'Hard',
    department: 'Pharmacy',
    createdAt: new Date().toISOString()
  },
  {
    _id: '4',
    stationName: 'Pediatric Dose Calculation',
    clinicalBackground: 'Calculate the appropriate dose of amoxicillin suspension for a 4-year-old child weighing 18kg with otitis media.',
    duration: 10,
    difficulty: 'Medium',
    department: 'Pediatrics',
    createdAt: new Date().toISOString()
  },
  {
    _id: '5',
    stationName: 'OTC Pain Relief Recommendation',
    clinicalBackground: 'Customer seeking advice on over-the-counter options for back pain that developed after gardening yesterday.',
    duration: 8,
    difficulty: 'Easy',
    department: 'Pharmacy',
    createdAt: new Date().toISOString()
  }
];

export default function StationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch stations
  useEffect(() => {
    if (session) {
      const fetchStations = async () => {
        try {
          const response = await fetch('/api/stations');
          const data = await response.json();
          
          if (!response.ok) throw new Error(data.message);
          
          // Use the actual stations data from API or fallback to sample data for development
          const stationsData = data.data && data.data.length > 0 ? data.data : sampleStations;
          setStations(stationsData);
        } catch (err) {
          setError('Failed to load stations');
          console.error('Error loading stations:', err);
          // Use sample data in case of error for development
          setStations(sampleStations);
        } finally {
          setLoading(false);
        }
      };
      
      fetchStations();
    }
  }, [session]);

  // Protect the route
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (status === 'loading' || loading) {
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Available OSCE Stations</h2>
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
          <h3 className="text-xl font-semibold text-foreground">No Stations Available</h3>
          <p className="mt-2 text-muted-foreground">There are currently no OSCE stations available for practice.</p>
          <p className="mt-2 text-sm text-muted-foreground">Please check back later for new content.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stations.map((station) => (
            <div key={station._id} className="bg-white border border-border rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-lg text-foreground mb-2">{station.stationName}</h3>
                  <span className="px-2.5 py-0.5 text-xs font-medium rounded-full" 
                    style={{ 
                      backgroundColor: station.difficulty === 'Easy' ? '#e0f8e9' : 
                                      station.difficulty === 'Medium' ? '#fcefff' : 
                                      '#fff0e7',
                      color: station.difficulty === 'Easy' ? '#166534' : 
                             station.difficulty === 'Medium' ? '#9333ea' : 
                             '#c2410c'
                    }}>
                    {station.difficulty || 'Medium'}
                  </span>
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground mt-2 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{station.duration || 10} minutes</span>
                </div>
                
                <div className="mb-6 text-muted-foreground text-sm">
                  <p>{truncateText(station.clinicalBackground || station.description, 120)}</p>
                </div>
                
                <div>
                  <button 
                    onClick={() => router.push(`/stations/${station._id}`)}
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
    </UserDashboardLayout>
  );
} 