import dbConnect from '../../../lib/db';
import Analysis from '../../../models/Analysis';
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const analysis = await Analysis.create({
      stationId: req.body.stationId,
      videoId: req.body.videoId,
      transcript: req.body.transcript,
      facialAnalysis: req.body.facialAnalysis,
      postureAnalysis: req.body.postureAnalysis,
      eyeContactAnalysis: req.body.eyeContactAnalysis,
      voiceAnalysis: req.body.voiceAnalysis,
      overallScore: req.body.overallScore,
      createdAt: new Date()
    });

    res.status(201).json({ success: true, data: analysis });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

const processAudioAndTranscribe = async (videoBlob) => {
  // Extract audio
  const audioBlob = await extractAudioFromVideo(videoBlob);
  
  // Initialize AssemblyAI
  const assembly = axios.create({
    baseURL: 'https://api.assemblyai.com/v2',
    headers: {
      authorization: process.env.ASSEMBLY_AI_KEY,
      'content-type': 'application/json',
    },
  });

  // Upload and transcribe
  try {
    // Upload file
    const uploadResponse = await assembly.post('/upload', audioBlob);
    
    // Start transcription
    const transcriptResponse = await assembly.post('/transcript', {
      audio_url: uploadResponse.data.upload_url,
      language_code: 'en',
    });

    // Poll for completion
    const checkCompletionInterval = setInterval(async () => {
      const transcript = await assembly.get(`/transcript/${transcriptResponse.data.id}`);
      
      if (transcript.data.status === 'completed') {
        clearInterval(checkCompletionInterval);
        return transcript.data;
      }
    }, 3000);
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}; 