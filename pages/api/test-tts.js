import { ElevenLabsClient } from "elevenlabs";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Starting ElevenLabs API test...');
    
    const client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY
    });

    console.log('Converting text to speech...');
    const audioStream = await client.textToSpeech.convert("JBFqnCBsd6RMkjVDRZzb", {
      text: "The first move is what sets everything in motion.",
      model_id: "eleven_multilingual_v2",
      output_format: "mp3_44100_128",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    });

    if (!audioStream) {
      throw new Error('No audio data received');
    }

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    if (audioBuffer.length === 0) {
      throw new Error('Empty audio buffer received');
    }

    // Set headers according to API reference
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    
    // Send the audio buffer
    return res.send(audioBuffer);

  } catch (error) {
    console.error('ElevenLabs API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to generate audio'
    });
  }
} 