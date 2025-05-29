import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';
import { withAdminAuth } from '../../lib/auth-clerk';

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStations: 0,
    totalSessions: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAdminData() {
      try {
        // Fetch admin statistics
        const stationsRes = await fetch('/api/admin/stations', {
          credentials: 'include'
        });
        const usersRes = await fetch('/api/admin/users', {
          credentials: 'include'
        });

        if (stationsRes.ok && usersRes.ok) {
          const stationsData = await stationsRes.json();
          const usersData = await usersRes.json();

          setStats({
            totalUsers: usersData.data?.pagination?.totalUsers || 0,
            totalStations: stationsData.data?.pagination?.totalStations || 0,
            totalSessions: 0 // TODO: Add sessions API
          });
        }
      } catch (err) {
        console.error('Error fetching admin data:', err);
        setError('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    }

    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <AdminDashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your OSCE preparation platform</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="stat bg-base-100 shadow rounded-lg">
            <div className="stat-title">Total Users</div>
            <div className="stat-value text-primary">{stats.totalUsers}</div>
            <div className="stat-desc">Registered platform users</div>
          </div>
          
          <div className="stat bg-base-100 shadow rounded-lg">
            <div className="stat-title">Total Stations</div>
            <div className="stat-value text-secondary">{stats.totalStations}</div>
            <div className="stat-desc">Created OSCE stations</div>
          </div>
          
          <div className="stat bg-base-100 shadow rounded-lg">
            <div className="stat-title">Total Sessions</div>
            <div className="stat-value text-accent">{stats.totalSessions}</div>
            <div className="stat-desc">Completed practice sessions</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/stations/new">
            <div className="card bg-primary text-primary-content shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <div className="card-body text-center">
                <h3 className="card-title justify-center">Create Station</h3>
                <p>Add a new OSCE station</p>
              </div>
            </div>
          </Link>

          <Link href="/admin/stations">
            <div className="card bg-secondary text-secondary-content shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <div className="card-body text-center">
                <h3 className="card-title justify-center">Manage Stations</h3>
                <p>Edit existing stations</p>
              </div>
            </div>
          </Link>

          <Link href="/admin/users">
            <div className="card bg-accent text-accent-content shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <div className="card-body text-center">
                <h3 className="card-title justify-center">Manage Users</h3>
                <p>View and edit users</p>
              </div>
            </div>
          </Link>

          <Link href="/admin/settings">
            <div className="card bg-neutral text-neutral-content shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <div className="card-body text-center">
                <h3 className="card-title justify-center">Settings</h3>
                <p>Platform configuration</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">Recent Activity</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-base-200 rounded">
                <span>System migrated to Clerk authentication</span>
                <span className="badge badge-success">Success</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-base-200 rounded">
                <span>Admin role-based access implemented</span>
                <span className="badge badge-info">Info</span>
              </div>
            </div>
          </div>
        </div>
      </div>
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