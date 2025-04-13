import { useState, useEffect } from 'react';

export default function VoiceTest() {
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);

  // Fetch available voices
  useEffect(() => {
    async function loadVoices() {
      try {
        const response = await fetch('/api/voices');
        if (!response.ok) throw new Error('Failed to fetch voices');
        const data = await response.json();
        setVoices(data);
      } catch (error) {
        console.error('Error loading voices:', error);
        setError('Failed to load voices');
      }
    }
    loadVoices();
  }, []);

  // Test a voice
  const testVoice = async (voiceId) => {
    try {
      setIsPlaying(true);
      setError(null);

      const response = await fetch('/api/station-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: "Hello, this is a test of my voice. How do I sound?",
          voice_id: voiceId
        })
      });

      if (!response.ok) throw new Error('Failed to generate audio');

      const audioBlob = await response.blob();
      const audio = new Audio(URL.createObjectURL(audioBlob));
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audio.src);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setError('Error playing audio');
        URL.revokeObjectURL(audio.src);
      };

      await audio.play();

    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
      setIsPlaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">ElevenLabs Voice Test</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {voices.map(voice => (
            <div 
              key={voice.id}
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-semibold text-lg mb-2">{voice.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{voice.description}</p>
              
              {voice.preview_url && (
                <div className="mb-4">
                  <audio 
                    src={voice.preview_url} 
                    controls 
                    className="w-full"
                    preload="none"
                  />
                </div>
              )}

              <button
                onClick={() => testVoice(voice.id)}
                disabled={isPlaying}
                className={`w-full px-4 py-2 rounded ${
                  isPlaying 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isPlaying ? 'Playing...' : 'Test Voice'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 