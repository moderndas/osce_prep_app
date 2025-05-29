import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import AdminDashboardLayout from '../../../../components/AdminDashboardLayout';

function EditStationPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const { id } = router.query;
  
  const [title, setTitle] = useState('');
  const [intro, setIntro] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [personaId, setPersonaId] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  // Fetch station data
  useEffect(() => {
    if (!id || !isAdmin || authLoading) return;

    async function fetchStation() {
      try {
        setLoading(true);
        const response = await fetch(`/api/stations/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch station');
        }

        const station = data.data;
        setTitle(station.stationName || '');
        setIntro(station.clinicalBackground || '');
        setSystemPrompt(station.systemPrompt || '');
        setAnalysisPrompt(station.analysisPrompt || '');
        setPersonaId(station.personaId || '');
        setIsPublic(station.isPublic !== false);
      } catch (err) {
        console.error('Error fetching station:', err);
        setError('Failed to load station data. ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchStation();
  }, [id, isAdmin, authLoading]);

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/stations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationName: title,
          clinicalBackground: intro,
          systemPrompt: systemPrompt,
          analysisPrompt: analysisPrompt,
          personaId: personaId,
          isPublic: isPublic
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to update station');
      }

      router.push('/admin/stations');
    } catch (err) {
      setError(err.message || 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminDashboardLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Edit Station</h1>

        {error && (
          <div className="alert alert-error mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center my-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block mb-2 font-medium">Station Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="input input-bordered w-full"
                    placeholder="Enter a descriptive title for this station"
                  />
                </div>

                {/* Clinical Background */}
                <div>
                  <label className="block mb-2 font-medium">Clinical Background</label>
                  <textarea
                    required
                    rows={5}
                    value={intro}
                    onChange={e => setIntro(e.target.value)}
                    className="textarea textarea-bordered w-full"
                    placeholder="Provide the clinical scenario and relevant patient information"
                  />
                </div>

                {/* System Prompt */}
                <div>
                  <label className="block mb-2 font-medium">System Prompt</label>
                  <textarea
                    rows={5}
                    value={systemPrompt}
                    onChange={e => setSystemPrompt(e.target.value)}
                    className="textarea textarea-bordered w-full"
                    placeholder="Instructions for the AI system about this station"
                  />
                </div>

                {/* Analysis Prompt */}
                <div>
                  <label className="block mb-2 font-medium">Analysis Prompt</label>
                  <textarea
                    rows={5}
                    value={analysisPrompt}
                    onChange={e => setAnalysisPrompt(e.target.value)}
                    className="textarea textarea-bordered w-full"
                    placeholder="How responses should be analyzed and evaluated"
                  />
                </div>

                {/* Persona ID */}
                <div>
                  <label className="block mb-2 font-medium">Persona ID</label>
                  <input
                    type="text"
                    value={personaId}
                    onChange={e => setPersonaId(e.target.value)}
                    className="input input-bordered w-full"
                    placeholder="Optional: ID of associated persona"
                  />
                </div>

                {/* Public toggle */}
                <div className="flex items-center space-x-3">
                  <input
                    id="public"
                    type="checkbox"
                    checked={isPublic}
                    onChange={e => setIsPublic(e.target.checked)}
                    className="checkbox"
                  />
                  <label htmlFor="public" className="cursor-pointer">Make this station available to all users</label>
                </div>

                {/* Submit */}
                <div className="card-actions justify-end mt-6">
                  <button type="button" className="btn btn-ghost" onClick={() => router.back()}>
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="loading loading-spinner loading-xs mr-2"></span>
                        Saving...
                      </>
                    ) : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
}

export default EditStationPage; 