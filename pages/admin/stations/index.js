import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import AdminDashboardLayout from '../../../components/AdminDashboardLayout';

function AdminStations() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [stationToDelete, setStationToDelete] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Check admin status
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const checkAdminStatus = async () => {
        try {
          const response = await fetch('/api/admin/check', {
            credentials: 'include'
          });
          
          if (response.ok) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
            router.push('/dashboard');
          }
        } catch (err) {
          console.error('Error checking admin status:', err);
          setIsAdmin(false);
          router.push('/dashboard');
        } finally {
          setAuthLoading(false);
        }
      };

      checkAdminStatus();
    } else if (isLoaded && !isSignedIn) {
      router.push('/auth/signin');
    }
  }, [isLoaded, isSignedIn, user, router]);

  const fetchStations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stations', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Failed to fetch stations');
      
      setStations(data.data?.stations || []);
      setError('');
    } catch (err) {
      console.error('Error loading stations:', err);
      setError('Failed to load stations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && !authLoading) {
      fetchStations();
    }
  }, [isAdmin, authLoading]);

  // Show loading while checking authentication
  if (!isLoaded || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg"></span>
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  // Don't render anything if not admin (will redirect)
  if (!isAdmin) {
    return null;
  }

  const openDeleteModal = (stationId) => {
    setStationToDelete(stationId);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setStationToDelete(null);
  };

  const handleDelete = async () => {
    if (!stationToDelete) return;
    
    setDeleteLoading(stationToDelete);
    try {
      const response = await fetch(`/api/stations/${stationToDelete}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete station');
      }

      // Close the modal and reset state
      closeDeleteModal();
      
      // Refresh the stations list
      fetchStations();
    } catch (err) {
      setError(err.message);
      closeDeleteModal();
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleEdit = (stationId) => {
    router.push(`/admin/stations/${stationId}/edit`);
  };

  return (
    <AdminDashboardLayout>
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-xl sm:text-2xl font-semibold leading-none tracking-tight text-foreground mb-4">Confirm Deletion</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete this station? Users will no longer be able to access it. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                className="btn btn-outline" 
                onClick={closeDeleteModal}
              >
                Cancel
              </button>
              <button 
                className="btn btn-error"
                onClick={handleDelete}
                disabled={deleteLoading === stationToDelete}
              >
                {deleteLoading === stationToDelete ? (
                  <span className="loading loading-spinner loading-xs mr-2"></span>
                ) : null}
                Delete Station
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-foreground">All Stations</h2>
            <p className="text-muted-foreground">Manage all OSCE stations for users.</p>
          </div>
          <Link href="/admin/stations/new">
            <button className="btn btn-primary">Create New Station</button>
          </Link>
        </div>
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
      ) : stations.length === 0 ? (
        <div className="bg-white border border-border rounded-lg shadow-sm">
          <div className="p-6 text-center">
            <h3 className="text-xl sm:text-2xl font-semibold leading-none tracking-tight text-foreground mb-4">No Stations Created</h3>
            <p className="mt-2 text-muted-foreground">Create your first OSCE station for users to practice with.</p>
            <div className="mt-6">
              <Link href="/admin/stations/new">
                <button className="btn btn-primary">Create New Station</button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white border border-border rounded-lg shadow-sm">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Station Name</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Created</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Public</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stations.map((station) => (
                <tr key={station._id} className="hover:bg-muted/20">
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{station.stationName}</div>
                    <div className="text-sm text-muted-foreground truncate max-w-xs">{station.clinicalBackground.substring(0, 50)}...</div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{new Date(station.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    {station.isPublic ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex" style={{ gap: '48px' }}>
                      <button 
                        onClick={() => handleEdit(station._id)} 
                        className="btn btn-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => openDeleteModal(station._id)} 
                        className="btn btn-sm border border-red-500 text-red-500 hover:bg-red-50"
                      >
                        Delete
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

export default AdminStations; 