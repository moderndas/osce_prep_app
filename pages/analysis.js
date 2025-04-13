import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import * as tf from '@tensorflow/tfjs';  // Required for face-api.js
import * as faceapi from 'face-api.js';  // Main face detection and analysis library
import axios from 'axios';  // For API calls to AssemblyAI and our backend
import { uploadAudio, transcribeAudio, getTranscriptionResult } from '../utils/assemblyAI';

export default function Analysis() {
  const router = useRouter();
  const { stationId, videoId } = router.query;
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // State for analysis
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState({
    facialExpression: null,
    posture: null,
    eyeContact: null
  });
  const [analysisResults, setAnalysisResults] = useState({
    facialExpressions: [],
    posture: [],
    sidewaysLooks: 0,
    totalFrames: 0
  });
  
  // State for final results
  const [finalSummary, setFinalSummary] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState('idle'); // 'idle' | 'uploading' | 'transcribing' | 'completed'
  const [transcriptionError, setTranscriptionError] = useState(null);

  // Analysis configuration
  const FPS = 1; // Analyze 1 frame per second
  const frameInterval = 1000 / FPS;
  const analysisFrameId = useRef(null);
  const lastAnalysisTime = useRef(0);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        setIsModelLoading(false);
      } catch (error) {
        console.error('Error loading models:', error);
      }
    };

    loadModels();
  }, []);

  // Start analysis when video plays
  const handleVideoPlay = async () => {
    if (!videoRef.current || isAnalyzing) return;
    
    setIsAnalyzing(true);
    
    const videoEl = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;

    // Analysis loop
    const analyzeFrame = async () => {
      if (videoEl.paused || videoEl.ended) {
        setIsAnalyzing(false);
        generateFinalSummary();
        return;
      }

      // Detect faces in current frame
      const detections = await faceapi
        .detectAllFaces(videoEl, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      if (detections.length > 0) {
        const detection = detections[0]; // Analyze main face

        // Draw detections on canvas
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, detections);
        faceapi.draw.drawFaceLandmarks(canvas, detections);

        // Analyze facial expression
        const expressions = detection.expressions;
        const dominantExpression = Object.entries(expressions)
          .reduce((a, b) => (a[1] > b[1] ? a : b))[0];

        // Analyze eye contact using landmarks
        const landmarks = detection.landmarks;
        const eyeContact = calculateEyeContact(landmarks);

        // Analyze posture
        const posture = calculatePosture(landmarks);

        // Update current analysis
        setCurrentAnalysis({
          facialExpression: dominantExpression,
          posture: posture.isGood ? 'Good' : 'Poor',
          eyeContact: eyeContact.isGood ? 'Good' : 'Looking Away'
        });

        // Update analysis results
        setAnalysisResults(prev => ({
          ...prev,
          facialExpressions: [...prev.facialExpressions, dominantExpression],
          posture: [...prev.posture, posture.isGood],
          sidewaysLooks: prev.sidewaysLooks + (eyeContact.isGood ? 0 : 1),
          totalFrames: prev.totalFrames + 1
        }));
      }

      // Schedule next frame analysis
      requestAnimationFrame(analyzeFrame);
    };

    analyzeFrame();
  };

  // Calculate eye contact based on facial landmarks
  const calculateEyeContact = (landmarks) => {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const eyeAngle = Math.atan2(
      rightEye[0].y - leftEye[0].y,
      rightEye[0].x - leftEye[0].x
    );
    return {
      angle: eyeAngle * (180 / Math.PI),
      isGood: Math.abs(eyeAngle) < 0.2 // Threshold for good eye contact
    };
  };

  // Calculate posture based on facial landmarks
  const calculatePosture = (landmarks) => {
    const nose = landmarks.getNose();
    const jawline = landmarks.getJawOutline();
    const angle = Math.atan2(
      jawline[16].y - nose[0].y,
      jawline[16].x - nose[0].x
    );
    return {
      angle: angle * (180 / Math.PI),
      isGood: Math.abs(angle) < 0.3 // Threshold for good posture
    };
  };

  // Generate final summary when video ends
  const generateFinalSummary = () => {
    const summary = {
      facialExpressions: {
        professional: calculateProfessionalExpressionPercentage(),
        unprofessional: 0 // Calculate based on collected data
      },
      posture: {
        good: calculateGoodPosturePercentage(),
        poor: 0 // Calculate based on collected data
      },
      sidewaysLooks: analysisResults.sidewaysLooks,
      overallScore: 0 // Calculate weighted score
    };

    setFinalSummary(summary);
    handleTranscription();
  };

  // Function to extract audio from video
  const extractAudioFromVideo = async (videoElement) => {
    try {
      const stream = videoElement.captureStream();
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      return new Promise((resolve, reject) => {
        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          resolve(audioBlob);
        };

        mediaRecorder.onerror = (error) => {
          reject(error);
        };

        mediaRecorder.start();
        videoElement.onended = () => mediaRecorder.stop();
      });
    } catch (error) {
      console.error('Error extracting audio:', error);
      throw new Error('Failed to extract audio from video');
    }
  };

  // Function to handle transcription process
  const handleTranscription = async () => {
    if (!videoRef.current) return;

    try {
      setTranscriptionStatus('uploading');
      setTranscriptionError(null);

      // Extract audio from video
      const audioBlob = await extractAudioFromVideo(videoRef.current);

      // Upload audio to AssemblyAI
      const uploadUrl = await uploadAudio(audioBlob);

      // Start transcription
      setTranscriptionStatus('transcribing');
      const transcriptId = await transcribeAudio(uploadUrl);

      // Poll for transcription completion
      const pollInterval = setInterval(async () => {
        const result = await getTranscriptionResult(transcriptId);

        if (result.status === 'completed') {
          clearInterval(pollInterval);
          setTranscript(result.text);
          setTranscriptionStatus('completed');

          // Save transcript to MongoDB
          await saveTranscriptToDb(result.text);
        } else if (result.status === 'error') {
          clearInterval(pollInterval);
          throw new Error(result.error);
        }
      }, 3000);

    } catch (error) {
      setTranscriptionError(error.message);
      setTranscriptionStatus('idle');
    }
  };

  // Function to save transcript to MongoDB
  const saveTranscriptToDb = async (transcriptText) => {
    try {
      const response = await fetch('/api/saveTranscript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stationId,
          videoId,
          transcript: transcriptText
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save transcript');
      }
    } catch (error) {
      console.error('Error saving transcript:', error);
    }
  };

  // Start transcription when video ends
  const handleVideoEnd = () => {
    handleTranscription();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">
          Step 2 - Video Analysis
        </h1>

        {isModelLoading ? (
          <div className="text-center py-12">
            <p className="text-lg">Loading analysis models...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Video Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Video Preview</h2>
              <div className="relative">
                <video
                  ref={videoRef}
                  onPlay={handleVideoPlay}
                  onEnded={handleVideoEnd}
                  controls
                  className="w-full rounded"
                >
                  <source src={`/api/video/${videoId}`} type="video/webm" />
                </video>
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 hidden"
                />
              </div>
            </div>

            {/* Real-time Analysis Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Real-time Analysis</h2>
              {isAnalyzing ? (
                <div className="space-y-4">
                  <p>Analyzing facial expressions...</p>
                  <p>Monitoring posture...</p>
                  <p>Tracking eye contact...</p>
                </div>
              ) : finalSummary ? (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Analysis Summary</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium">Facial Expressions:</p>
                      <p>Professional: {finalSummary.facialExpressions.professional}%</p>
                    </div>
                    <div>
                      <p className="font-medium">Posture:</p>
                      <p>Good Posture: {finalSummary.posture.good}%</p>
                    </div>
                    <div>
                      <p className="font-medium">Eye Contact:</p>
                      <p>Sideways Looks: {finalSummary.sidewaysLooks} times</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Transcription Status */}
            <div className="mt-8 bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Transcription Status</h2>
              <div className="space-y-4">
                {transcriptionStatus === 'idle' && (
                  <p>Waiting for video to complete...</p>
                )}
                {transcriptionStatus === 'uploading' && (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <p>Uploading audio...</p>
                  </div>
                )}
                {transcriptionStatus === 'transcribing' && (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                    <p>Generating transcript...</p>
                  </div>
                )}
                {transcriptionStatus === 'completed' && (
                  <p className="text-green-600">Transcription completed!</p>
                )}
                {transcriptionError && (
                  <p className="text-red-600">Error: {transcriptionError}</p>
                )}
              </div>
            </div>

            {/* Transcript Display */}
            {transcript && (
              <div className="mt-8 bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Transcript</h2>
                <div className="prose max-w-none">
                  {transcript}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 