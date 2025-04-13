import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { createRouter } from 'next-connect';

// Ensure uploads directory exists
const uploadDir = './public/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const videoId = uuidv4();
    cb(null, `${videoId}.webm`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 314572800 }, // 300MB
  fileFilter: (req, file, cb) => {
    // Accept video files with audio
    if (file.mimetype.startsWith('video/')) {
      // Specifically allow webm and mp4
      if (file.mimetype === 'video/webm' || file.mimetype === 'video/mp4') {
        cb(null, true);
      } else {
        cb(new Error('Only WebM and MP4 video files are allowed'));
      }
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// Create API handler
const handler = createRouter();

// Handle POST request
handler.post((req, res) => {
  // Use multer middleware
  upload.single('video')(req, res, (err) => {
    if (err) {
      // Handle multer errors
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading file'
      });
    }

    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file provided'
      });
    }

    try {
      const videoId = path.parse(req.file.filename).name;
      
      // Verify file was saved with audio
      const stats = fs.statSync(req.file.path);
      
      // Log successful upload with more details
      console.log('Video uploaded successfully:', {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path,
        fileSize: stats.size
      });

      return res.status(200).json({
        success: true,
        videoId,
        message: 'Video uploaded successfully',
        details: {
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });
    } catch (error) {
      console.error('Processing error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error processing uploaded file'
      });
    }
  });
});

export const config = {
  api: {
    bodyParser: false
  }
};

export default handler.handler(); 