import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const videoPath = path.join(process.cwd(), 'public', 'uploads', `${id}.webm`);

    // Check if file exists
    try {
      await stat(videoPath);
    } catch (error) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    // Get file size
    const stats = await stat(videoPath);
    const fileSize = stats.size;

    // Handle range request
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/webm',
      });

      const fileStream = fs.createReadStream(videoPath, { start, end });
      return fileStream.pipe(res);
    }

    // Non-range request
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/webm',
    });

    const fileStream = fs.createReadStream(videoPath);
    return fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving video:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

const analyzePosture = (landmarks) => {
  const nose = landmarks.getNose();
  const jawline = landmarks.getJawOutline();
  
  // Calculate face orientation
  const faceAngle = calculateFaceAngle(nose, jawline);
  
  // Define thresholds for good posture
  const ANGLE_THRESHOLD = 15; // degrees
  
  return {
    isGood: Math.abs(faceAngle) < ANGLE_THRESHOLD,
    angle: faceAngle,
    confidence: calculateConfidence(landmarks)
  };
};

const detectSidewaysLook = (landmarks) => {
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const nose = landmarks.getNose();
  
  // Calculate eye-nose relationship
  const eyeLineAngle = calculateEyeLineAngle(leftEye, rightEye);
  const noseDirection = calculateNoseDirection(nose);
  
  return {
    isLookingSideways: Math.abs(eyeLineAngle) > 30 || Math.abs(noseDirection) > 20,
    direction: noseDirection > 0 ? 'right' : 'left',
    confidence: calculateConfidence(landmarks)
  };
}; 