// Model loading status - moved outside component to persist across hot reloads
let modelsLoaded = false;

// Model paths - relative to public directory
const MODEL_URL = '/models';

// Required models and their corresponding nets in face-api.js
export const MODELS = {
  tinyFaceDetector: 'tiny_face_detector_model',
  faceExpressionNet: 'face_expression_model',
  faceLandmark68Net: 'face_landmark_68_model'
};

/**
 * Loads all required face-api.js models
 * @returns {Promise<boolean>} - Returns true if all models are loaded successfully
 */
export const loadModels = async () => {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error('Face-api.js models can only be loaded in a browser environment');
    }

    if (modelsLoaded) {
      console.log('Models already loaded');
      return true;
    }

    // Initialize TensorFlow.js first
    const tf = (await import('@tensorflow/tfjs')).default;
    await tf.ready();
    await tf.setBackend('webgl');
    console.log('TensorFlow.js initialized with WebGL backend');

    // Import face-api.js dynamically
    const faceapi = (await import('face-api.js')).default;
    console.log('Loading face-api.js models...');

    // Load all models in parallel
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
    ]);

    // Verify all models are loaded
    const modelsStatus = [
      faceapi.nets.tinyFaceDetector.isLoaded,
      faceapi.nets.faceExpressionNet.isLoaded,
      faceapi.nets.faceLandmark68Net.isLoaded
    ];

    if (modelsStatus.every(status => status)) {
      modelsLoaded = true;
      console.log('All face-api.js models loaded successfully');
      return true;
    } else {
      const failedModels = Object.entries(MODELS)
        .filter((_, index) => !modelsStatus[index])
        .map(([key]) => key);
      throw new Error(`Failed to load models: ${failedModels.join(', ')}`);
    }
  } catch (error) {
    console.error('Error loading face-api.js models:', error);
    throw error;
  }
};

/**
 * Checks if all required models are loaded
 * @returns {boolean} - Returns true if all models are loaded
 */
export const areModelsLoaded = () => {
  return modelsLoaded;
};

/**
 * Resets the model loading status
 * Useful for testing or when you need to reload models
 */
export const resetModelLoading = () => {
  modelsLoaded = false;
}; 