import axios from 'axios';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoId, options } = req.body;
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }

    // Get video file path
    const videoPath = path.join(process.cwd(), 'public', 'uploads', `${videoId}.webm`);
    
    // Check if file exists
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    // Read video file
    const videoBuffer = fs.readFileSync(videoPath);
    console.log('Video file read:', {
      size: videoBuffer.length,
      path: videoPath
    });

    // Check if API key is configured
    if (!process.env.ASSEMBLYAI_API_KEY) {
      throw new Error('AssemblyAI API key not configured');
    }

    // Upload to AssemblyAI
    const uploadResponse = await axios.post('https://api.assemblyai.com/v2/upload',
      videoBuffer,
      {
        headers: {
          'authorization': process.env.ASSEMBLYAI_API_KEY,
          'content-type': 'application/octet-stream',
          'transfer-encoding': 'chunked'
        }
      }
    );

    console.log('Video uploaded to AssemblyAI:', uploadResponse.data.upload_url);

    // Start transcription with additional features
    const transcribeResponse = await axios.post(
      'https://api.assemblyai.com/v2/transcript',
      {
        audio_url: uploadResponse.data.upload_url,
        language_code: 'en',
        sentiment_analysis: true,
        auto_highlights: true,
        word_boost: ["patient", "doctor", "medical", "health", "symptoms"],
        speech_threshold: 0.2,
        format_text: true,
        punctuate: true,
        ...options
      },
      {
        headers: {
          authorization: process.env.ASSEMBLYAI_API_KEY,
          'content-type': 'application/json',
        },
      }
    );

    console.log('Transcription started:', transcribeResponse.data.id);

    return res.status(200).json({ id: transcribeResponse.data.id });
  } catch (error) {
    console.error('Transcription error:', error);
    return res.status(500).json({ error: 'Failed to start transcription: ' + error.message });
  }
} 