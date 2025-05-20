import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import AdminDashboardLayout from '../../../components/AdminDashboardLayout';
import { withAdminAuth } from '../../../lib/auth';

function AdminUsers() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    async function fetchUsers() {
      try {
        // This API endpoint needs to be implemented
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.message || 'Failed to fetch users');
        
        setUsers(data.users || []); 
        setLoading(false);
      } catch (err) {
        console.error('Error loading users:', err);
        setError('Failed to load users. The API endpoint may not be implemented yet.');
        setLoading(false);
        
        // Temporary mock data for display purposes
        setUsers([
          { 
            _id: '1', 
            name: 'Apple Patient', 
            email: 'applepatient@gmail.com',
            role: 'admin',
            createdAt: new Date().toISOString()
          },
          { 
            _id: '2', 
            name: 'Test User', 
            email: 'user@example.com',
            role: 'user',
            createdAt: new Date().toISOString()
          },
          { 
            _id: '3', 
            name: 'Jane Smith', 
            email: 'jane@example.com',
            role: 'user',
            createdAt: new Date().toISOString()
          }
        ]);
      }
    }

    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      // This API endpoint needs to be implemented
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      // Update user in state
      setUsers(users.map(user => 
        user._id === userId ? { ...user, role: newRole } : user
      ));
    } catch (err) {
      setError(err.message);
      // For demo, update the UI anyway
      setUsers(users.map(user => 
        user._id === userId ? { ...user, role: newRole } : user
      ));
    }
  };

  return (
    <AdminDashboardLayout>
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-700">User Management</h2>
        <p className="text-gray-500 mt-1">Manage user accounts and access controls</p>
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
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <select 
                      className="select select-bordered select-sm w-full max-w-xs"
                      value={user.role}
                      onChange={(e) => handleRoleChange(user._id, e.target.value)}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="flex gap-2">
                      <button 
                        className="btn btn-sm btn-info"
                        onClick={() => router.push(`/admin/users/${user._id}`)}
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

export default AdminUsers; 