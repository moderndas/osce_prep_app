import { ElevenLabsClient } from "elevenlabs";

// Cache for ongoing requests
const requestCache = new Map();

// Default voice IDs
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_DEFAULT_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel voice

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { text, voice_id } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Create cache key that includes both text and voice_id
    const cacheKey = `${voice_id || DEFAULT_VOICE_ID}-${text}`;

    // Check if there's an ongoing request for the same text and voice
    if (requestCache.has(cacheKey)) {
      const cachedResponse = requestCache.get(cacheKey);
      return res.send(cachedResponse);
    }

    console.log('Converting station text to speech:', text);
    
    const client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY
    });

    // Use provided voice_id or fall back to default
    const selectedVoiceId = voice_id || DEFAULT_VOICE_ID;

    const audioStream = await client.textToSpeech.convert(selectedVoiceId, {
      text,
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

    // Cache the response using the combined key
    requestCache.set(cacheKey, audioBuffer);

    // Set headers according to API reference
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    
    // Send the audio buffer
    return res.send(audioBuffer);

  } catch (error) {
    console.error('ElevenLabs API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to generate audio'
    });
  } finally {
    // Remove from cache after 5 minutes
    if (req.body.text) {
      const cacheKey = `${req.body.voice_id || DEFAULT_VOICE_ID}-${req.body.text}`;
      setTimeout(() => {
        requestCache.delete(cacheKey);
      }, 5 * 60 * 1000);
    }
  }
} 