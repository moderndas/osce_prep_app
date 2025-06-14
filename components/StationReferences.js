import { useState, useEffect, useRef } from 'react';

const StationReferences = ({ stationId }) => {
  const [references, setReferences] = useState([]);
  const [patientProfile, setPatientProfile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);

  useEffect(() => {
    const fetchReferences = async () => {
      try {
        setLoading(true);
        const response = await fetch('/references/references-config.json');
        
        if (!response.ok) {
          throw new Error('Failed to load references');
        }
        
        const data = await response.json();
        const stationReferences = data[stationId] || [];
        setReferences(stationReferences);
      } catch (err) {
        console.error('Error loading references:', err);
        setError('Failed to load references');
        setReferences([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchPatientProfile = async () => {
      try {
        const response = await fetch('/references/references-config.json');
        
        if (!response.ok) {
          throw new Error('Failed to load patient profile');
        }
        
        const data = await response.json();
        const stationProfile = data.patientProfiles?.[stationId] || null;
        setPatientProfile(stationProfile);
      } catch (err) {
        console.error('Error loading patient profile:', err);
        setPatientProfile(null);
      }
    };

    if (stationId) {
      fetchReferences();
      fetchPatientProfile();
    }
  }, [stationId]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isModalOpen]);

  const openPdfInNewTab = (reference) => {
    const pdfUrl = `/references/station-${stationId}/${reference.file}`;
    window.open(pdfUrl, '_blank');
  };

  const openPatientProfileModal = () => {
    setIsModalOpen(true);
  };

  const closePatientProfileModal = () => {
    setIsModalOpen(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card bg-blue-50 border border-blue-200 shadow-lg">
          <div className="card-body">
            <h2 className="card-title text-2xl font-bold text-gray-800 mb-4">References</h2>
            <div className="flex justify-center">
              <span className="loading loading-spinner loading-sm"></span>
            </div>
          </div>
        </div>
        
        <div className="card bg-green-50 border border-green-200 shadow-lg">
          <div className="card-body">
            <h2 className="card-title text-2xl font-bold text-gray-800 mb-4">Patient Profile</h2>
            <div className="flex justify-center">
              <span className="loading loading-spinner loading-sm"></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || (references.length === 0 && !patientProfile)) {
    return null; // Don't show anything if no references or patient profile
  }

  return (
    <>
      <div className="space-y-4">
        {/* References Card */}
        {references.length > 0 && (
          <div className="card bg-green-50 border border-green-200 shadow-lg">
            <div className="card-body">
              <h2 className="card-title text-2xl font-bold text-gray-800 mb-4">References</h2>
              <div className="space-y-3">
                {references.map((reference, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-100 cursor-pointer hover:bg-gray-50 hover:border-gray-200 transition-colors duration-200"
                    onClick={() => openPdfInNewTab(reference)}
                  >
                    <span className="font-medium text-gray-900 hover:text-gray-700 transition-colors duration-200">{reference.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openPdfInNewTab(reference);
                      }}
                      className="text-green-600 hover:text-green-800 font-medium text-sm flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200"
                    >
                      Open in New Tab
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Patient Profile Card - Maximum spacing from references */}
        {patientProfile && (
          <div 
            className="card bg-blue-50 border border-blue-200 shadow-lg cursor-pointer hover:bg-blue-100 transition-colors duration-200" 
            style={{ marginTop: '100px' }}
            onClick={openPatientProfileModal}
          >
            <div className="card-body">
              <div className="flex items-center justify-between p-3 rounded-lg">
                <h2 className="text-2xl font-bold text-gray-800">Patient Profile</h2>
                <span className="text-sm text-gray-600 italic">Click to view</span>
              </div>
              
              {/* Preview thumbnail */}
              <div className="mt-3 p-3 bg-white rounded-lg border border-blue-100">
                <p className="text-sm text-gray-600 text-center">
                  {patientProfile.name} - Click anywhere on this card to view as slide-out panel
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sliding Widget Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Sliding Widget Panel */}
          <div 
            className={`fixed bottom-0 right-0 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out pointer-events-auto ${
              isModalOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{ width: '700px', height: '700px', maxWidth: '85vw', maxHeight: '90vh' }}
            ref={modalRef}
          >
            {/* Widget Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-50">
              <h3 className="text-xl font-bold text-gray-800">{patientProfile.name}</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={closePatientProfileModal}
                  className="text-gray-500 hover:text-gray-700 transition-colors duration-200 p-1 hover:bg-gray-200 rounded"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Widget Content */}
            <div className="p-4" style={{ height: 'calc(100% - 80px)' }}>
              <iframe
                src={`/references/station-${stationId}/${patientProfile.file}#toolbar=0&navpanes=0&scrollbar=0`}
                width="100%"
                height="100%"
                className="rounded border border-gray-200"
                title={patientProfile.name}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StationReferences; 