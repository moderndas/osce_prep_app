export const faceApiModels = {
  tinyFaceDetector: {
    manifest: {
      "name": "tiny_face_detector_model",
      "inputNodes": ["input_1"],
      "outputNodes": ["Identity"],
      "modelUrl": "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json",
      "weightMapUrl": "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1"
    }
  },
  faceLandmark68: {
    manifest: {
      "name": "face_landmark_68_model",
      "inputNodes": ["input_1"],
      "outputNodes": ["output_1"],
      "modelUrl": "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json",
      "weightMapUrl": "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1"
    }
  },
  faceExpression: {
    manifest: {
      "name": "face_expression_model",
      "inputNodes": ["input_1"],
      "outputNodes": ["output_1"],
      "modelUrl": "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_expression_model-weights_manifest.json",
      "weightMapUrl": "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_expression_model-shard1"
    }
  }
}; 