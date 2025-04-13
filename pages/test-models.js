import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import ErrorBoundary from '../components/ErrorBoundary';

// Import modelLoader dynamically to avoid SSR issues
const ModelLoader = dynamic(
  () => import('../utils/modelLoader').then(mod => ({
    default: () => {
      const [loadingStatus, setLoadingStatus] = useState({
        loading: true,
        error: null,
        success: false,
        models: {}
      });

      useEffect(() => {
        async function initializeModels() {
          try {
            const { loadModels, MODELS } = mod;
            await loadModels();
            setLoadingStatus({
              loading: false,
              error: null,
              success: true,
              models: MODELS
            });
          } catch (error) {
            setLoadingStatus({
              loading: false,
              error: error.message,
              success: false,
              models: {}
            });
          }
        }

        initializeModels();
      }, []);

      return (
        <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-center mb-8">
              Face-API.js Model Testing
            </h1>
            
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Model Loading Status</h2>
              
              {loadingStatus.loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <span>Loading models...</span>
                </div>
              ) : loadingStatus.error ? (
                <div className="text-red-500 bg-red-50 p-4 rounded">
                  <p className="font-semibold">Error loading models:</p>
                  <p className="mt-1">{loadingStatus.error}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-green-500 bg-green-50 p-4 rounded">
                    <p className="font-semibold">✅ All models loaded successfully!</p>
                  </div>
                  
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Loaded Models:</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {Object.entries(loadingStatus.models).map(([key, value]) => (
                        <li key={key} className="text-gray-700">
                          {key}: <code className="text-sm bg-gray-100 px-2 py-1 rounded">{value}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 text-center text-gray-500">
              <p>This page tests the loading of face-api.js models required for OSCE analysis.</p>
            </div>
          </div>
        </div>
      );
    }
  })),
  { ssr: false }
);

export default function TestModelsPage() {
  return (
    <ErrorBoundary>
      <ModelLoader />
    </ErrorBoundary>
  );
} 