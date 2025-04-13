import { ElevenLabsClient } from "elevenlabs";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY
    });

    // Get all available voices
    const voices = await client.voices.getAll();

    // Format the response to include only necessary information
    const formattedVoices = voices.map(voice => ({
      id: voice.voice_id,
      name: voice.name,
      description: voice.description,
      preview_url: voice.preview_url,
      category: voice.category
    }));

    return res.status(200).json(formattedVoices);
  } catch (error) {
    console.error('Error fetching voices:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch voices'
    });
  }
} 