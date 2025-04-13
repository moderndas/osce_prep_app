import { createRouter } from 'next-connect';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Ensure uploads directory exists
const uploadDir = './public/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const videoId = uuidv4();
    cb(null, `${videoId}${path.extname(file.originalname)}`);
  }
});

// Create multer instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 314572800 // 300MB
  }
});

// Create API route handler
const apiRoute = createRouter();

apiRoute.post(upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ 
      success: false, 
      message: 'No video file provided' 
    });
  }

  try {
    const videoId = path.parse(req.file.filename).name;
    
    return res.status(200).json({
      success: true,
      videoId: videoId,
      message: 'Video uploaded successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error uploading video' 
    });
  }
});

// Error handling
apiRoute.use((err, req, res, next) => {
  console.error('API route error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

export default apiRoute;

export const config = {
  api: {
    bodyParser: false
  }
}; 