import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import UserDashboardLayout from '../../components/UserDashboardLayout';

export default function DashboardHome() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);

  // Check if user is admin and redirect
  useEffect(() => {
    const checkAdminAndRedirect = async () => {
      if (!isLoaded || !isSignedIn) return;
      
      try {
        const response = await fetch('/api/admin/check', {
          credentials: 'include'
        });
        
        if (response.ok) {
          // User is admin, redirect to admin dashboard
          router.push('/admin');
          return;
        }
      } catch (err) {
        // Not admin, continue to user dashboard
        console.log('User is not admin, showing user dashboard');
      }
      
      setAdminCheckComplete(true);
    };

    checkAdminAndRedirect();
  }, [isLoaded, isSignedIn, router]);

  // Protect the dashboard route
  if (isLoaded && !isSignedIn) {
    router.push('/auth/signin');
    return null;
  }

  if (!isLoaded || !adminCheckComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <div className="text-xl text-foreground">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <UserDashboardLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card bg-card shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <div className="card-body">
            <h2 className="text-lg font-semibold text-warm-600">Practice OSCE</h2>
            <p className="text-muted-foreground">Start practicing with our collection of OSCE stations designed to improve your clinical skills.</p>
            <div className="card-actions justify-end mt-4">
              <button 
                onClick={() => router.push('/dashboard/stations')}
                className="btn btn-primary"
              >
                View Stations
              </button>
            </div>
          </div>
        </div>

        <div className="card bg-card shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <div className="card-body">
            <h2 className="text-lg font-semibold text-warm-600">Recent Activity</h2>
            <p className="text-muted-foreground">You haven't completed any stations yet.</p>
            <div className="card-actions justify-end mt-4">
              <button className="btn btn-ghost">View All</button>
            </div>
          </div>
        </div>

        <div className="card bg-card shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <div className="card-body">
            <h2 className="text-lg font-semibold text-warm-600">Your Progress</h2>
            <p className="text-muted-foreground">Track your OSCE prep progress here.</p>
            <div className="mt-4">
              <div className="flex justify-between mb-1">
                <span className="text-foreground">Overall</span>
                <span className="font-medium text-primary">0%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>
            <div className="card-actions justify-end mt-4">
              <button className="btn btn-ghost">Details</button>
            </div>
          </div>
        </div>
      </div>
    </UserDashboardLayout>
  );
} 