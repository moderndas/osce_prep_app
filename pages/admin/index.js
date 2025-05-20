import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';
import { withAdminAuth } from '../../lib/auth';
import Link from 'next/link';

function AdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    stations: 0,
    users: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAdminData() {
      try {
        // Fetch stations
        const stationsRes = await fetch('/api/admin/stations');
        const stationsData = await stationsRes.json();

        if (!stationsRes.ok) throw new Error(stationsData.message || 'Failed to fetch stations');
        
        // Add user fetching here when available
        
        setStats({
          stations: stationsData.data?.length || 0,
          users: 0 // Update when user API is available
        });
        setLoading(false);
      } catch (err) {
        console.error('Error fetching admin data:', err);
        setError('Failed to load admin data');
        setLoading(false);
      }
    }

    fetchAdminData();
  }, []);

  return (
    <AdminDashboardLayout>
      <div className="mb-6">
        <h2 className="text-lg font-medium text-foreground">Overview</h2>
      </div>

      {error && (
        <div className="alert alert-error mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center my-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stations Management */}
          <div className="card bg-card shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <div className="card-body">
              <h3 className="card-title text-foreground">Stations</h3>
              <p className="mb-4 text-muted-foreground">Manage OSCE stations for users.</p>
              
              <div className="stat pl-0">
                <div className="stat-title text-muted-foreground">Total Stations</div>
                <div className="stat-value text-primary">{stats.stations}</div>
              </div>
              
              <div className="card-actions justify-end mt-4">
                <Link href="/admin/stations/new">
                  <button className="btn btn-primary">Create Station</button>
                </Link>
                <Link href="/admin/stations">
                  <button className="btn btn-ghost">View All</button>
                </Link>
              </div>
            </div>
          </div>
          
          {/* User Management */}
          <div className="card bg-card shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <div className="card-body">
              <h3 className="card-title text-foreground">Users</h3>
              <p className="mb-4 text-muted-foreground">Manage user accounts and permissions.</p>
              
              <div className="stat pl-0">
                <div className="stat-title text-muted-foreground">Total Users</div>
                <div className="stat-value text-primary">{stats.users}</div>
              </div>
              
              <div className="card-actions justify-end mt-4">
                <Link href="/admin/users">
                  <button className="btn btn-ghost">Manage Users</button>
                </Link>
              </div>
            </div>
          </div>
          
          {/* System Status */}
          <div className="card bg-card shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <div className="card-body">
              <h3 className="card-title text-foreground">System Status</h3>
              <p className="mb-4 text-muted-foreground">Application health and settings.</p>
              
              <div className="mt-2">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 bg-success rounded-full mr-2"></div>
                  <span className="text-foreground">Database connected</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-success rounded-full mr-2"></div>
                  <span className="text-foreground">API services operational</span>
                </div>
              </div>
              
              <div className="card-actions justify-end mt-4">
                <Link href="/admin/settings">
                  <button className="btn btn-ghost">Settings</button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminDashboardLayout>
  );
}

// Wrap the page with admin auth protection
export const getServerSideProps = withAdminAuth(async (context) => {
  return {
    props: {}
  };
});

export default AdminDashboard; 