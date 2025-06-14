import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useUser } from '@clerk/nextjs'
import AdminDashboardLayout from '../../../components/AdminDashboardLayout'

function NewStationPage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  
  const [title, setTitle] = useState('')
  const [intro, setIntro] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [difficulty, setDifficulty] = useState('Medium')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [analysisPrompt, setAnalysisPrompt] = useState('')
  const [personaId, setPersonaId] = useState('')
  const [error, setError] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  
  // Reference upload states
  const [referenceFiles, setReferenceFiles] = useState([null, null, null])
  const [referenceNames, setReferenceNames] = useState(['', '', ''])
  const [uploadingReferences, setUploadingReferences] = useState(false)

  // Patient profile upload states
  const [patientProfileFile, setPatientProfileFile] = useState(null)
  const [patientProfileName, setPatientProfileName] = useState('')

  // Check admin status
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const checkAdminStatus = async () => {
        try {
          const response = await fetch('/api/admin/check', {
            credentials: 'include'
          })
          
          if (response.ok) {
            setIsAdmin(true)
          } else {
            setIsAdmin(false)
            router.push('/dashboard')
          }
        } catch (err) {
          console.error('Error checking admin status:', err)
          setIsAdmin(false)
          router.push('/dashboard')
        } finally {
          setAuthLoading(false)
        }
      }

      checkAdminStatus()
    } else if (isLoaded && !isSignedIn) {
      router.push('/auth/signin')
    }
  }, [isLoaded, isSignedIn, user, router])

  // Show loading while checking authentication
  if (!isLoaded || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg"></span>
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    )
  }

  // Don't render anything if not admin (will redirect)
  if (!isAdmin) {
    return null
  }

  // Reference upload handlers
  const handleFileChange = (index, file) => {
    const newFiles = [...referenceFiles];
    newFiles[index] = file;
    setReferenceFiles(newFiles);
  };

  const handleNameChange = (index, name) => {
    const newNames = [...referenceNames];
    newNames[index] = name;
    setReferenceNames(newNames);
  };

  const removeReference = (index) => {
    const newFiles = [...referenceFiles];
    const newNames = [...referenceNames];
    newFiles[index] = null;
    newNames[index] = '';
    setReferenceFiles(newFiles);
    setReferenceNames(newNames);
  };

  // Patient profile handlers
  const handlePatientProfileFileChange = (file) => {
    setPatientProfileFile(file);
  };

  const handlePatientProfileNameChange = (name) => {
    setPatientProfileName(name);
  };

  const removePatientProfile = () => {
    setPatientProfileFile(null);
    setPatientProfileName('');
  };

  const uploadReferences = async (stationId) => {
    const formData = new FormData();
    formData.append('stationId', stationId);
    
    let hasReferences = false;
    const uploadedIndices = [];
    
    for (let i = 0; i < 3; i++) {
      if (referenceFiles[i] && referenceNames[i].trim()) {
        formData.append(`reference${i}`, referenceFiles[i]);
        formData.append(`name${i}`, referenceNames[i].trim());
        hasReferences = true;
        uploadedIndices.push(i);
      }
    }
    
    // Add patient profile if provided
    let hasPatientProfile = false;
    if (patientProfileFile && patientProfileName.trim()) {
      formData.append('patientProfile', patientProfileFile);
      formData.append('patientProfileName', patientProfileName.trim());
      hasPatientProfile = true;
    }
    
    if (!hasReferences && !hasPatientProfile) return true; // Nothing to upload
    
    setUploadingReferences(true);
    try {
      const response = await fetch('/api/admin/upload-references', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Clear the uploaded form fields
        const newFiles = [...referenceFiles];
        const newNames = [...referenceNames];
        uploadedIndices.forEach(index => {
          newFiles[index] = null;
          newNames[index] = '';
        });
        setReferenceFiles(newFiles);
        setReferenceNames(newNames);
        
        // Clear patient profile if uploaded
        if (hasPatientProfile) {
          setPatientProfileFile(null);
          setPatientProfileName('');
        }
      }
      
      return result.success;
    } catch (error) {
      console.error('Reference upload error:', error);
      return false;
    } finally {
      setUploadingReferences(false);
    }
  };

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const res = await fetch('/api/admin/stations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stationName: title,
        clinicalBackground: intro,
        difficulty: difficulty,
        systemPrompt: systemPrompt,
        analysisPrompt: analysisPrompt,
        personaId: personaId,
        isPublic: isPublic
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return setError(body.message || 'Failed to create station')
    }

    const stationData = await res.json();
    const stationId = stationData.data._id;

    // Upload references if any
    const referencesUploaded = await uploadReferences(stationId);
    if (!referencesUploaded) {
      setError('Station created but failed to upload some references');
      return;
    }

    router.push('/admin/stations')
  }

  return (
    <AdminDashboardLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Create New Station</h1>

        {error && (
          <div className="alert alert-error mb-6">
            {error}
          </div>
        )}

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block mb-2 font-medium text-primary">Station Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="Enter a descriptive title for this station"
                />
              </div>

              {/* Intro / Description */}
              <div>
                <label className="block mb-2 font-medium text-primary">Clinical Background</label>
                <textarea
                  required
                  rows={3}
                  value={intro}
                  onChange={e => setIntro(e.target.value)}
                  className="textarea textarea-bordered w-full"
                  placeholder="Provide the clinical scenario and relevant patient information"
                />
              </div>

              {/* Difficulty */}
              <div>
                <label className="block mb-2 font-medium text-primary">Difficulty Level</label>
                <select
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="Low">Level - Low</option>
                  <option value="Medium">Level - Medium</option>
                  <option value="High">Level - High</option>
                </select>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block mb-2 font-medium text-primary">System Prompt</label>
                <textarea
                  rows={8}
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  className="textarea textarea-bordered w-full"
                  placeholder="Instructions for the AI system about this station"
                />
              </div>

              {/* Analysis Prompt */}
              <div>
                <label className="block mb-2 font-medium text-primary">Analysis Prompt</label>
                <textarea
                  rows={8}
                  value={analysisPrompt}
                  onChange={e => setAnalysisPrompt(e.target.value)}
                  className="textarea textarea-bordered w-full"
                  placeholder="How responses should be analyzed and evaluated"
                />
              </div>

              {/* Persona ID */}
              <div>
                <label className="block mb-2 font-medium text-primary">Persona ID</label>
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

              {/* References Upload Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4 text-primary">Station References (Optional)</h3>
                <p className="text-sm text-gray-600 mb-4">Upload up to 3 PDF references that will be available to users during the station.</p>
                
                <div className="space-y-4">
                  {[0, 1, 2].map(index => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-primary">Reference {index + 1}</h4>
                        {(referenceFiles[index] || referenceNames[index]) && (
                          <button
                            type="button"
                            onClick={() => removeReference(index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-primary">Reference Name</label>
                          <input
                            type="text"
                            value={referenceNames[index]}
                            onChange={e => handleNameChange(index, e.target.value)}
                            placeholder={`e.g., Clinical Guidelines, Drug Protocol`}
                            className="input input-bordered w-full"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1 text-primary">PDF File</label>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={e => handleFileChange(index, e.target.files[0])}
                            className="file-input file-input-bordered w-full"
                          />
                          {referenceFiles[index] && (
                            <p className="text-sm text-green-600 mt-1">
                              ✓ {referenceFiles[index].name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Patient Profile Upload Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4 text-primary">Patient Profile (Optional)</h3>
                <p className="text-sm text-gray-600 mb-4">Upload a patient profile document or image that users can view during the station.</p>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-primary">Patient Profile Document</h4>
                    {(patientProfileFile || patientProfileName) && (
                      <button
                        type="button"
                        onClick={removePatientProfile}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-primary">Profile Name</label>
                      <input
                        type="text"
                        value={patientProfileName}
                        onChange={e => handlePatientProfileNameChange(e.target.value)}
                        placeholder="e.g., Patient Chart, Medical History"
                        className="input input-bordered w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1 text-primary">File (PDF, JPG, PNG)</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={e => handlePatientProfileFileChange(e.target.files[0])}
                        className="file-input file-input-bordered w-full"
                      />
                      {patientProfileFile && (
                        <p className="text-sm text-green-600 mt-1">
                          ✓ {patientProfileFile.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="card-actions justify-end mt-6">
                <button type="button" className="btn btn-ghost" onClick={() => router.back()}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={uploadingReferences}
                >
                  {uploadingReferences ? (
                    <>
                      <span className="loading loading-spinner loading-xs mr-2"></span>
                      Uploading References...
                    </>
                  ) : 'Create Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  )
}

export default NewStationPage; 