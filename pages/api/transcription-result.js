import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Transcription ID is required' });
    }

    // Get transcription result from AssemblyAI
    const response = await axios.get(
      `https://api.assemblyai.com/v2/transcript/${id}`,
      {
        headers: {
          authorization: process.env.ASSEMBLYAI_API_KEY,
        },
      }
    );

    const transcription = response.data;
    
    // Return appropriate response based on status
    if (transcription.status === 'completed') {
      return res.status(200).json({
        status: 'completed',
        text: transcription.text,
        sentiment_analysis_results: transcription.sentiment_analysis_results,
        words: transcription.words,
        auto_highlights_result: transcription.auto_highlights_result,
        confidence: transcription.confidence,
        audio_duration: transcription.audio_duration
      });
    } else if (transcription.status === 'error') {
      return res.status(200).json({
        status: 'error',
        error: transcription.error
      });
    } else {
      return res.status(200).json({
        status: transcription.status
      });
    }
  } catch (error) {
    console.error('Error getting transcription result:', error);
    return res.status(500).json({ error: 'Failed to get transcription result' });
  }
} 