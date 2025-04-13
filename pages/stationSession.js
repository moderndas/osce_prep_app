import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

// Theme toggle component
const ThemeToggle = () => {
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <label className="swap swap-rotate">
      <input type="checkbox" onChange={toggleTheme} checked={theme === 'dark'} />
      <svg className="swap-on w-8 h-8 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"/></svg>
      <svg className="swap-off w-8 h-8 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z"/></svg>
    </label>
  );
};

// Audio player component that only auto-plays for question prompts
const AutoPlayAudio = ({ text, isQuestion }) => {
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const cleanupRef = useRef(null);

  // Cleanup function to handle audio resources
  const cleanup = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      if (audioRef.current.srcObject) {
        audioRef.current.srcObject = null;
      }
      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current = null;
    }
  };

  useEffect(() => {
    // Only process audio if it's a question text
    if (!text || !isQuestion) return;

    // Clean up any existing audio
    cleanup();

    let isMounted = true;
    const controller = new AbortController();

    const playAudio = async () => {
      try {
        setError(null);
        audioRef.current = new Audio();
        const audio = audioRef.current;

        const response = await fetch('/api/station-audio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
          signal: controller.signal
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate audio');
        }

        const audioBlob = await response.blob();
        
        if (audioBlob.size === 0) {
          throw new Error('Received empty audio data');
        }

        // If component was unmounted during fetch, cleanup and return
        if (!isMounted) {
          cleanup();
          return;
        }

        const audioUrl = URL.createObjectURL(audioBlob);
        audio.src = audioUrl;

        const onEnded = () => {
          if (isMounted) {
            URL.revokeObjectURL(audioUrl);
            cleanup();
          }
        };

        const onError = (e) => {
          console.error('Audio playback error:', e);
          if (isMounted) {
            URL.revokeObjectURL(audioUrl);
            setError('Error playing audio');
            cleanup();
          }
        };

        const onCanPlay = async () => {
          try {
            if (isMounted) {
              await audio.play();
            }
          } catch (playError) {
            console.error('Playback error:', playError);
            if (isMounted) {
              setError('Error playing audio: ' + playError.message);
              cleanup();
            }
          }
        };

        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);
        audio.addEventListener('canplay', onCanPlay);

        cleanupRef.current = () => {
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('error', onError);
          audio.removeEventListener('canplay', onCanPlay);
          URL.revokeObjectURL(audioUrl);
        };

      } catch (error) {
        if (isMounted) {
          console.error('Error:', error);
          setError(error.message);
          cleanup();
        }
      }
    };

    playAudio();

    return () => {
      isMounted = false;
      controller.abort(); // Abort any in-flight fetch requests
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      cleanup();
    };
  }, [text, isQuestion]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      cleanup();
    };
  }, []);

  if (error) {
    return <p className="text-red-500 text-sm mt-2">{error}</p>;
  }

  return null;
};

// Toast notification component that identifies question prompts
const Toast = ({ message, onClose, isQuestion = false }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 10000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <>
      {/* Full screen overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-70 z-[100]" />
      
      {/* Centered popup */}
      <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
        <div className="card w-[90%] max-w-4xl bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex flex-col items-center justify-center">
              <div className="w-full text-center mb-8">
                <h2 className="card-title text-4xl justify-center mb-8">Important Question</h2>
                <div className="bg-base-200 p-10 rounded-xl mb-8">
                  <p className="text-4xl leading-relaxed">{message}</p>
                </div>
              </div>
              <div className="badge badge-lg badge-primary animate-pulse">
                This message will disappear in 10 seconds
              </div>
              <AutoPlayAudio text={message} isQuestion={isQuestion} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-circle btn-ghost absolute top-4 right-4"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

export default function StationSession() {
  const router = useRouter();
  const { stationId } = router.query;
  const videoRef = useRef(null);
  
  // State management
  const [station, setStation] = useState(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentToast, setCurrentToast] = useState(null);
  const [error, setError] = useState(null);
  const [sessionTime, setSessionTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Timer refs for cleanup
  const initialPromptTimer = useRef(null);
  const fiveMinutePromptTimer = useRef(null);
  const sessionTimer = useRef(null);

  // Load station data
  useEffect(() => {
    async function loadStation() {
      if (!stationId) return;
      try {
        const response = await fetch(`/api/stations/${stationId}`);
        if (!response.ok) throw new Error('Station not found');
        const data = await response.json();
        setStation(data);
      } catch (error) {
        console.error('Error loading station:', error);
        setError('Failed to load station data');
      }
    }
    loadStation();
  }, [stationId]);

  // Start session timers and prompts
  useEffect(() => {
    if (!sessionStarted || !station) return;

    console.log('Starting session timers');

    // Initial prompt after 10 seconds
    initialPromptTimer.current = setTimeout(() => {
      console.log('Showing initial question');
      if (station.initialQuestion) {
        setCurrentToast({
          message: station.initialQuestion,
          isQuestion: true
        });
      }
    }, 10000);

    // Five-minute prompt
    fiveMinutePromptTimer.current = setTimeout(() => {
      console.log('Showing five minute question');
      if (station.fiveMinuteQuestion) {
        setCurrentToast({
          message: station.fiveMinuteQuestion,
          isQuestion: true
        });
      }
    }, 300000); // 5 minutes in milliseconds

    // Session timer
    sessionTimer.current = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);

    // Cleanup function
    return () => {
      console.log('Cleaning up session timers');
      if (initialPromptTimer.current) {
        clearTimeout(initialPromptTimer.current);
        initialPromptTimer.current = null;
      }
      if (fiveMinutePromptTimer.current) {
        clearTimeout(fiveMinutePromptTimer.current);
        fiveMinutePromptTimer.current = null;
      }
      if (sessionTimer.current) {
        clearInterval(sessionTimer.current);
        sessionTimer.current = null;
      }
    };
  }, [sessionStarted, station]);

  // Handle toast close
  const handleToastClose = () => {
    console.log('Closing toast');
    setCurrentToast(null);
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
          setRecordedChunks(chunks);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        if (videoRef.current) {
          videoRef.current.src = url;
        }
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setSessionStarted(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // Upload recording
  const uploadRecording = async () => {
    if (recordedChunks.length === 0) return;

    try {
      setIsUploading(true);
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const formData = new FormData();
      formData.append('video', blob);

      const response = await fetch('/api/video/uploadVideo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload video');

      const data = await response.json();
      router.push(`/analysis/${stationId}?videoId=${data.videoId}`);
    } catch (error) {
      console.error('Error uploading video:', error);
      setError('Failed to upload video');
    } finally {
      setIsUploading(false);
    }
  };

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!station) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg"></span>
          <div className="text-xl">Loading station...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="card bg-base-100 shadow-xl mb-4">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h1 className="card-title text-2xl">{station?.stationName}</h1>
              <ThemeToggle />
            </div>
            
            <div className="divider"></div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Clinical Background</h2>
              <p className="text-base-content">{station?.clinicalBackground}</p>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Station Instructions</h2>
              <p className="text-base-content">{station?.stationInstructions}</p>
            </div>

            {currentToast && (
              <Toast
                message={currentToast.message}
                isQuestion={currentToast.isQuestion}
                onClose={handleToastClose}
              />
            )}

            <div className="divider"></div>

            <div className="flex items-center justify-between">
              <div className="text-lg">
                Time: {formatTime(sessionTime)}
              </div>
              
              <div className="space-x-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="btn btn-primary"
                  >
                    Start Session
                  </button>
                ) : (
                  <>
                    <button
                      onClick={stopRecording}
                      className="btn btn-error"
                    >
                      Stop Recording
                    </button>
                    <button
                      onClick={uploadRecording}
                      disabled={isUploading || recordedChunks.length === 0}
                      className={`btn btn-success ${isUploading || recordedChunks.length === 0 ? 'btn-disabled' : ''}`}
                    >
                      {isUploading ? (
                        <>
                          <span className="loading loading-spinner"></span>
                          Uploading...
                        </>
                      ) : 'Upload Recording'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {error && (
              <div className="alert alert-error mt-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
              </div>
            )}

            <div className="divider"></div>

            <video
              ref={videoRef}
              className="w-full aspect-video bg-neutral rounded-xl"
              controls
            />
          </div>
        </div>
      </div>
    </div>
  );
} 