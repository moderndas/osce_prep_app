import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import GPTAnalysis from '../../components/GPTAnalysis';

export default function Analysis() {
  const router = useRouter();
  const { stationId, videoId } = router.query;
  const videoRef = useRef(null);
  
  // States
  const [analysisStep, setAnalysisStep] = useState('initial'); // initial, analyzing, complete
  const [transcriptionStatus, setTranscriptionStatus] = useState('initial');
  const [transcript, setTranscript] = useState(null);
  const [error, setError] = useState(null);
  const [station, setStation] = useState(null);
  const [transcriptionId, setTranscriptionId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [voiceAnalysis, setVoiceAnalysis] = useState({
    tone: null, // professional, neutral, or unprofessional
    pace: null, // professional, neutral, or unprofessional
    details: null // Additional analysis details
  });
  const [gptAnalysis, setGptAnalysis] = useState(null);
  const [gptAnalysisStatus, setGptAnalysisStatus] = useState('initial'); // initial, analyzing, completed, error

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

  // Load video
  useEffect(() => {
    async function loadVideo() {
      try {
        if (!videoId) {
          setError('No video ID found. Please record or upload a video first.');
          return;
        }

        const video = videoRef.current;
        if (!video) {
          console.error('Video element not found');
          return;
        }

        // Fetch video from server
        const response = await fetch(`/api/video/${videoId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch video');
        }

        const blob = await response.blob();
        console.log('Video blob loaded:', {
          size: blob.size,
          type: blob.type
        });

        const url = URL.createObjectURL(blob);
        video.src = url;
        video.muted = false;
        video.volume = 1.0;

        // Load and verify video
        await new Promise((resolve, reject) => {
          video.addEventListener('loadedmetadata', () => {
            console.log('Video loaded:', {
              duration: video.duration,
              width: video.videoWidth,
              height: video.videoHeight,
              audioTracks: video.audioTracks?.length ?? 'unknown',
              muted: video.muted,
              volume: video.volume
            });
            resolve();
          });
          video.addEventListener('error', (e) => {
            reject(new Error('Video loading error: ' + (video.error?.message || 'Unknown error')));
          });
          video.load();
        });

        // Clean up
        return () => {
          video.src = '';
          video.load();
          URL.revokeObjectURL(url);
        };
      } catch (error) {
        console.error('Error loading video:', error);
        setError('Failed to load video: ' + error.message);
      }
    }

    if (router.isReady) {
      loadVideo();
    }
  }, [router.isReady, router.query]);

  const startAnalysis = async () => {
    try {
      setAnalysisStep('analyzing');
      setError(null);

      // Start transcription
      await startTranscription();

      // Start video playback
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        await videoRef.current.play();
      }

      // Update progress based on video time
      const updateProgress = () => {
        if (videoRef.current) {
          const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
          setProgress(Math.round(progress));

          // When video ends, start GPT analysis
          if (videoRef.current.ended) {
            if (transcript) {
              startGptAnalysis();
            } else {
              setError('Waiting for transcription to complete...');
            }
          }
        }
      };

      videoRef.current?.addEventListener('timeupdate', updateProgress);

      // Cleanup
      return () => {
        videoRef.current?.removeEventListener('timeupdate', updateProgress);
      };
    } catch (error) {
      console.error('Analysis error:', error);
      setError('Failed to start analysis: ' + error.message);
      setAnalysisStep('error');
    }
  };

  const startTranscription = async () => {
    try {
      setTranscriptionStatus('preparing');
      
      if (!videoId) {
        throw new Error('Video ID not found');
      }
      
      setTranscriptionStatus('transcribing');
      
      // Start transcription with additional analysis features
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          videoId,
          // Request additional analysis features from AssemblyAI
          options: {
            sentiment_analysis: true,
            auto_highlights: true,
            word_boost: ["patient", "doctor", "medical", "health", "symptoms"],
            speech_threshold: 0.2,
            format_text: true
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to start transcription');
      }
      
      const { id } = await response.json();
      setTranscriptionId(id);
      
      // Poll for results with voice analysis
      const pollInterval = setInterval(async () => {
        try {
          const pollResponse = await fetch(`/api/transcription-result?id=${id}`);
          if (!pollResponse.ok) {
            throw new Error('Failed to fetch transcription status');
          }
          
          const result = await pollResponse.json();
          console.log('Transcription status:', result);
          
          if (result.status === 'completed') {
            clearInterval(pollInterval);
            setTranscript(result.text);
            setTranscriptionStatus('completed');
            
            // Analyze voice characteristics
            if (result.sentiment_analysis_results) {
              analyzeVoiceCharacteristics(result);
            }
          } else if (result.status === 'error') {
            clearInterval(pollInterval);
            setTranscriptionStatus('error');
            setError('Transcription failed: ' + result.error);
          }
        } catch (error) {
          console.error('Error polling transcription:', error);
          clearInterval(pollInterval);
          setTranscriptionStatus('error');
          setError('Failed to get transcription status: ' + error.message);
        }
      }, 2000);
      
      return () => clearInterval(pollInterval);
    } catch (error) {
      console.error('Transcription error:', error);
      setTranscriptionStatus('error');
      setError('Failed to transcribe video: ' + error.message);
    }
  };

  // Analyze voice characteristics from AssemblyAI results
  const analyzeVoiceCharacteristics = (result) => {
    try {
      const { sentiment_analysis_results, words } = result;
      
      // Analyze tone based on sentiment
      let toneScore = 0;
      sentiment_analysis_results.forEach(segment => {
        switch(segment.sentiment) {
          case 'POSITIVE':
            toneScore += 1;
            break;
          case 'NEUTRAL':
            break;
          case 'NEGATIVE':
            toneScore -= 1;
            break;
        }
      });

      // Calculate average words per minute
      if (words && words.length > 1) {
        const firstWord = words[0];
        const lastWord = words[words.length - 1];
        const durationMinutes = (lastWord.end - firstWord.start) / 60;
        const wordsPerMinute = words.length / durationMinutes;
        
        // Analyze pace (typical professional speech is 120-160 wpm)
        let paceRating;
        if (wordsPerMinute < 100 || wordsPerMinute > 180) {
          paceRating = 'unprofessional';
        } else if (wordsPerMinute >= 120 && wordsPerMinute <= 160) {
          paceRating = 'professional';
        } else {
          paceRating = 'neutral';
        }

        // Determine overall tone
        let toneRating;
        if (toneScore > sentiment_analysis_results.length * 0.2) {
          toneRating = 'professional';
        } else if (toneScore < -sentiment_analysis_results.length * 0.2) {
          toneRating = 'unprofessional';
        } else {
          toneRating = 'neutral';
        }

        setVoiceAnalysis({
          tone: toneRating,
          pace: paceRating,
          details: {
            wordsPerMinute,
            sentimentSegments: sentiment_analysis_results.length,
            positiveSegments: sentiment_analysis_results.filter(s => s.sentiment === 'POSITIVE').length,
            negativeSegments: sentiment_analysis_results.filter(s => s.sentiment === 'NEGATIVE').length,
            neutralSegments: sentiment_analysis_results.filter(s => s.sentiment === 'NEUTRAL').length
          }
        });
      }
    } catch (error) {
      console.error('Error analyzing voice characteristics:', error);
      setError('Failed to analyze voice characteristics: ' + error.message);
    }
  };

  // Start GPT analysis
  const startGptAnalysis = async () => {
    try {
      setGptAnalysisStatus('analyzing');
      setError(null);

      const response = await fetch('/api/analysis/gpt-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stationId,
          ephemeralData: {
            transcript,
            voiceAnalysis: voiceAnalysis.tone ? voiceAnalysis : null
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to perform GPT analysis');
      }

      const result = await response.json();
      setGptAnalysis(result.analysis);
      setGptAnalysisStatus('completed');
      setAnalysisStep('complete');
    } catch (error) {
      console.error('GPT Analysis error:', error);
      setError('Failed to perform GPT analysis: ' + error.message);
      setGptAnalysisStatus('error');
    }
  };

  if (!stationId || !videoId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="text-red-600">Missing required parameters. Please start from the station selection.</p>
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
      <div className="max-w-7xl mx-auto">
        <div className="space-y-8">
          {/* Video Player Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recorded Video</h2>
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full rounded-lg"
                playsInline
                controls
                controlsList="nodownload"
                preload="metadata"
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = false;
                    videoRef.current.volume = 1.0;
                  }
                }}
                onPlay={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = false;
                  }
                }}
              />
            </div>
          </div>

          {/* GPT Analysis Section */}
          <GPTAnalysis stationId={stationId} videoId={videoId} />
        </div>
      </div>
    </div>
  );
} 