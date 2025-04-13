import formidable from 'formidable';
import fs from 'fs';
import axios from 'axios';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data with the new formidable API
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB max file size
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // Get the audio file (handle new formidable file structure)
    const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;
    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Read the file using the new filepath property
    const fileBuffer = fs.readFileSync(audioFile.filepath);
    console.log('Audio file read successfully:', {
      size: fileBuffer.length,
      filepath: audioFile.filepath,
      mimetype: audioFile.mimetype
    });

    // Upload to AssemblyAI
    const uploadResponse = await axios.post('https://api.assemblyai.com/v2/upload', fileBuffer, {
      headers: {
        'authorization': process.env.ASSEMBLYAI_API_KEY,
        'content-type': 'application/octet-stream',
        'transfer-encoding': 'chunked'
      },
    });

    console.log('AssemblyAI upload successful:', uploadResponse.data.upload_url);

    // Clean up temp file
    try {
      fs.unlinkSync(audioFile.filepath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp file:', cleanupError);
    }

    return res.status(200).json({ audioUrl: uploadResponse.data.upload_url });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ 
      error: 'Failed to upload audio',
      details: error.message
    });
  }
} 