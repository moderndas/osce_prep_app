import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';

// Toast notification component
const Toast = ({ message, onClose }) => {
  useEffect(() => {
    // Auto-dismiss after 10 seconds
    const timer = setTimeout(onClose, 10000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <>
      {/* Full screen overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-70 z-[100]" />
      
      {/* Centered popup */}
      <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
        <div 
          className="bg-green-50 rounded-2xl shadow-2xl w-[90%] max-w-4xl mx-auto animate-fade-in border-4 border-green-600"
          style={{ minHeight: '40vh' }}
        >
          <div className="p-12">
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-full text-center mb-8">
                <h2 className="text-4xl font-bold text-green-800 mb-8">Important Question</h2>
                <div className="bg-white/50 p-10 rounded-xl border-2 border-green-200 mb-8">
                  <p className="text-4xl text-green-900 leading-relaxed font-medium">{message}</p>
                </div>
              </div>
              <div className="text-xl text-green-700 animate-pulse">
                This message will disappear in 10 seconds
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Text-to-speech utility function
const speakText = (text) => {
  if (!window.speechSynthesis) {
    console.warn('Speech synthesis not supported');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  window.speechSynthesis.speak(utterance);
};

const MAX_FILE_SIZE = 314572800; // 300MB in bytes
const MIME_TYPE = 'video/webm;codecs=vp9,opus';

export default function VideoPage() {
  const router = useRouter();
  const { stationId } = router.query;
  const [mode, setMode] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [stream, setStream] = useState(null);
  const [stationData, setStationData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [currentToast, setCurrentToast] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const chunksRef = useRef([]);
  const videoRef = useRef(null);
  const initialPromptTimer = useRef(null);
  const fiveMinutePromptTimer = useRef(null);

  // Cleanup function for media streams and timers
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (initialPromptTimer.current) clearTimeout(initialPromptTimer.current);
      if (fiveMinutePromptTimer.current) clearTimeout(fiveMinutePromptTimer.current);
      window.speechSynthesis.cancel();
    };
  }, [stream]);

  // Fetch station data when the page loads
  useEffect(() => {
    const fetchStationData = async () => {
      if (!stationId) return;
      
      try {
        const response = await fetch(`/api/stations/${stationId}`);
        if (!response.ok) throw new Error('Failed to fetch station data');
        const data = await response.json();
        setStationData(data.data);
      } catch (error) {
        setError('Failed to load station data');
        console.error('Error:', error);
      }
    };

    fetchStationData();
  }, [stationId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true 
      });
      
      setStream(stream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.muted = true; // Prevent audio feedback
        videoPreviewRef.current.play().catch(console.error);
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
          videoPreviewRef.current.src = url;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Set up timed questions
      if (stationData?.initialQuestion) {
        initialPromptTimer.current = setTimeout(() => {
          setCurrentToast(stationData.initialQuestion);
          speakText(stationData.initialQuestion);
        }, 10000);
      }

      if (stationData?.fiveMinuteQuestion) {
        fiveMinutePromptTimer.current = setTimeout(() => {
          setCurrentToast(stationData.fiveMinuteQuestion);
          speakText(stationData.fiveMinuteQuestion);
        }, 300000);
      }
    } catch (err) {
      console.error('Recording error:', err);
      setError('Failed to start recording: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Clear timers
      if (initialPromptTimer.current) clearTimeout(initialPromptTimer.current);
      if (fiveMinutePromptTimer.current) clearTimeout(fiveMinutePromptTimer.current);
      window.speechSynthesis.cancel();
    }
  };

  const handleFileUpload = (e) => {
    setError('');
    const file = e.target.files[0];
    
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 300MB limit');
      return;
    }

    setUploadedFile(file);
  };

  const handleProceedToAnalysis = async () => {
    try {
      const videoBlob = recordedBlob || uploadedFile;
      if (!videoBlob || !stationId) {
        throw new Error('Video and station ID are required');
      }

      setIsUploading(true);
      setUploadStatus('Uploading video...');

      // Create FormData and append video
      const formData = new FormData();
      formData.append('video', videoBlob);
      formData.append('stationId', stationId);

      // Upload to server
      const response = await fetch('/api/video/uploadVideo', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload video');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to upload video');
      }

      // Navigate to analysis with the video ID from the response
      router.push(`/analysis/${stationId}?videoId=${data.videoId}`);
    } catch (err) {
      console.error('Error uploading video:', err);
      setError(err.message);
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  const handleDiscardVideo = () => {
    setRecordedBlob(null);
    setUploadedFile(null);
    setMode(null);
  };

  // Add protection against direct access
  if (!stationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="text-red-600">Invalid access. Please select a station first.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            Step 1 - Record/upload your station video
          </h1>

          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
              <p>{error}</p>
            </div>
          )}

          {!mode && !recordedBlob && !uploadedFile && (
            <div className="space-x-4">
              <button
                onClick={() => setMode('record')}
                className="bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600"
              >
                Record Video
              </button>
              <button
                onClick={() => setMode('upload')}
                className="bg-green-500 text-white px-6 py-3 rounded hover:bg-green-600"
              >
                Upload Video
              </button>
            </div>
          )}

          {mode === 'record' && !recordedBlob && (
            <div className="space-y-6">
              <div className="relative w-full min-h-[60vh]">
                <div className="absolute inset-0 bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-gray-800">
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full"
                    style={{
                      transform: 'scaleX(-1)',
                      objectFit: 'contain',
                      backgroundColor: 'black'
                    }}
                  />
                  {isRecording && (
                    <div className="absolute top-6 right-6 flex items-center space-x-3 bg-black bg-opacity-75 px-6 py-3 rounded-full shadow-lg z-10">
                      <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse"></div>
                      <span className="text-white text-lg font-semibold">Recording in Progress</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-center space-x-6 mt-6">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="bg-red-600 text-white px-10 py-4 rounded-xl text-xl font-semibold hover:bg-red-700 transition-colors shadow-lg"
                  >
                    Start Recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="bg-gray-800 text-white px-10 py-4 rounded-xl text-xl font-semibold hover:bg-gray-900 transition-colors shadow-lg"
                  >
                    Stop Recording
                  </button>
                )}
              </div>
            </div>
          )}

          {mode === 'upload' && !uploadedFile && (
            <div className="space-y-4">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>
          )}

          {(recordedBlob || uploadedFile) && (
            <div className="mt-6">
              <h2 className="text-lg font-medium mb-4">Video Preview:</h2>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full rounded"
                src={URL.createObjectURL(recordedBlob || uploadedFile)}
              />
              <div className="mt-4 space-x-4">
                <button
                  onClick={() => {
                    setRecordedBlob(null);
                    setUploadedFile(null);
                    setError(null);
                    setUploadStatus('');
                  }}
                  className="bg-red-500 text-white px-6 py-3 rounded hover:bg-red-600"
                  disabled={isUploading}
                >
                  Discard Video
                </button>
                <button
                  onClick={handleProceedToAnalysis}
                  className="bg-green-500 text-white px-6 py-3 rounded hover:bg-green-600"
                  disabled={isUploading}
                >
                  {isUploading ? uploadStatus : 'Proceed to Analysis'}
                </button>
              </div>
            </div>
          )}

          {/* Upload Status */}
          {uploadStatus && (
            <div className="mt-4 p-4 bg-blue-50 text-blue-700 rounded">
              <div className="flex items-center">
                {isUploading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2" />
                )}
                <p>{uploadStatus}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      {currentToast && (
        <Toast
          message={currentToast}
          onClose={() => setCurrentToast(null)}
        />
      )}
    </div>
  );
} 