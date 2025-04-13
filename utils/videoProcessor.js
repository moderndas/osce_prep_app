import * as faceapi from 'face-api.js';
import { loadModels } from './modelLoader';

/**
 * Class for processing video frames and performing analysis
 */
export class VideoProcessor {
  constructor() {
    this.canvas = null;
    this.video = null;
    this.isProcessing = false;
    this.analysisData = {
      frames: [],
      expressions: {},
      posture: [],
      eyeContact: {
        sidewaysCount: 0,
        totalFrames: 0
      }
    };
  }

  /**
   * Initializes the video processor
   * @param {HTMLVideoElement} videoElement - The video element to process
   * @param {HTMLCanvasElement} canvasElement - The canvas element for drawing
   */
  async initialize(videoElement, canvasElement) {
    try {
      // Ensure models are loaded
      await loadModels();
      
      this.video = videoElement;
      this.canvas = canvasElement;
      
      // Set canvas dimensions to match video
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;
      
      return true;
    } catch (error) {
      console.error('Error initializing video processor:', error);
      throw error;
    }
  }

  /**
   * Captures a single frame from the video
   * @returns {ImageData} The captured frame
   */
  captureFrame() {
    try {
      const context = this.canvas.getContext('2d');
      context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      return context.getImageData(0, 0, this.canvas.width, this.canvas.height);
    } catch (error) {
      console.error('Error capturing frame:', error);
      throw error;
    }
  }

  /**
   * Analyzes a single frame for facial expressions and posture
   * @param {ImageData} frame - The frame to analyze
   * @returns {Promise<Object>} Analysis results for the frame
   */
  async analyzeFrame(frame) {
    try {
      // Detect all faces in the frame
      const detections = await faceapi.detectAllFaces(frame, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      if (!detections.length) {
        return { error: 'No face detected' };
      }

      const detection = detections[0]; // Use the first face detected
      
      // Analyze facial expressions
      const expressions = detection.expressions;
      const dominantExpression = Object.entries(expressions)
        .reduce((a, b) => (a[1] > b[1] ? a : b))[0];

      // Analyze eye contact using landmarks
      const landmarks = detection.landmarks;
      const eyePoints = landmarks.getLeftEye().concat(landmarks.getRightEye());
      const isLookingSideways = this.checkSidewaysGaze(eyePoints);

      // Analyze posture using face position
      const posture = this.analyzePosture(detection.detection.box);

      return {
        timestamp: this.video.currentTime,
        expressions: {
          dominant: dominantExpression,
          scores: expressions
        },
        eyeContact: {
          isSideways: isLookingSideways
        },
        posture
      };
    } catch (error) {
      console.error('Error analyzing frame:', error);
      return { error: error.message };
    }
  }

  /**
   * Checks if the person is looking sideways based on eye landmarks
   * @param {Array} eyePoints - Array of eye landmark points
   * @returns {boolean} Whether the person is looking sideways
   */
  checkSidewaysGaze(eyePoints) {
    try {
      // Calculate the average x-coordinate of all eye points
      const avgX = eyePoints.reduce((sum, point) => sum + point.x, 0) / eyePoints.length;
      
      // Calculate the face center x-coordinate
      const faceCenter = this.canvas.width / 2;
      
      // Calculate the deviation from center
      const deviation = Math.abs(avgX - faceCenter) / this.canvas.width;
      
      // If deviation is more than 15% of the frame width, consider it as looking sideways
      return deviation > 0.15;
    } catch (error) {
      console.error('Error checking sideways gaze:', error);
      return false;
    }
  }

  /**
   * Analyzes posture based on face position in frame
   * @param {Object} faceBox - The detected face bounding box
   * @returns {Object} Posture analysis results
   */
  analyzePosture(faceBox) {
    try {
      const verticalPosition = faceBox.y / this.canvas.height;
      const horizontalPosition = faceBox.x / this.canvas.width;
      
      return {
        isGood: (
          verticalPosition > 0.2 && // Not too high
          verticalPosition < 0.8 && // Not too low
          horizontalPosition > 0.2 && // Not too left
          horizontalPosition < 0.8 // Not too right
        ),
        details: {
          vertical: verticalPosition,
          horizontal: horizontalPosition
        }
      };
    } catch (error) {
      console.error('Error analyzing posture:', error);
      return { isGood: false, error: error.message };
    }
  }

  /**
   * Starts continuous frame processing
   * @param {Function} onFrameProcessed - Callback for processed frame data
   */
  startProcessing(onFrameProcessed) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const processFrame = async () => {
      if (!this.isProcessing) return;

      try {
        const frame = this.captureFrame();
        const analysis = await this.analyzeFrame(frame);
        
        if (!analysis.error) {
          this.analysisData.frames.push(analysis);
          
          // Update expression counts
          const expression = analysis.expressions.dominant;
          this.analysisData.expressions[expression] = 
            (this.analysisData.expressions[expression] || 0) + 1;
          
          // Update posture data
          this.analysisData.posture.push(analysis.posture.isGood);
          
          // Update eye contact data
          if (analysis.eyeContact.isSideways) {
            this.analysisData.eyeContact.sidewaysCount++;
          }
          this.analysisData.eyeContact.totalFrames++;
        }

        if (onFrameProcessed) {
          onFrameProcessed(analysis);
        }

        // Process next frame
        requestAnimationFrame(processFrame);
      } catch (error) {
        console.error('Error in frame processing loop:', error);
        this.stopProcessing();
      }
    };

    processFrame();
  }

  /**
   * Stops frame processing
   */
  stopProcessing() {
    this.isProcessing = false;
  }

  /**
   * Gets the final analysis summary
   * @returns {Object} Summary of all analyzed data
   */
  getAnalysisSummary() {
    try {
      const totalFrames = this.analysisData.frames.length;
      if (totalFrames === 0) return { error: 'No frames analyzed' };

      // Calculate expression percentages
      const expressions = Object.entries(this.analysisData.expressions)
        .reduce((acc, [expression, count]) => {
          acc[expression] = (count / totalFrames) * 100;
          return acc;
        }, {});

      // Calculate posture score
      const goodPostureFrames = this.analysisData.posture
        .filter(isGood => isGood).length;
      const postureScore = (goodPostureFrames / totalFrames) * 100;

      // Calculate eye contact score
      const sidewaysPercentage = 
        (this.analysisData.eyeContact.sidewaysCount / 
         this.analysisData.eyeContact.totalFrames) * 100;

      return {
        expressions,
        posture: {
          score: postureScore,
          goodFrames: goodPostureFrames,
          totalFrames
        },
        eyeContact: {
          sidewaysPercentage,
          sidewaysCount: this.analysisData.eyeContact.sidewaysCount,
          totalFrames: this.analysisData.eyeContact.totalFrames
        },
        totalFramesAnalyzed: totalFrames
      };
    } catch (error) {
      console.error('Error generating analysis summary:', error);
      return { error: error.message };
    }
  }

  /**
   * Resets all analysis data
   */
  reset() {
    this.analysisData = {
      frames: [],
      expressions: {},
      posture: [],
      eyeContact: {
        sidewaysCount: 0,
        totalFrames: 0
      }
    };
  }
} 