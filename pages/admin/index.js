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

        {/* Recent Activity */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="text-lg font-semibold text-warm-600">Recent Activity</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-base-200 rounded">
                <span>System migrated to Clerk authentication</span>
                <span className="badge badge-neutral">Success</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-base-200 rounded">
                <span>Admin role-based access implemented</span>
                <span className="badge badge-neutral">Info</span>
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