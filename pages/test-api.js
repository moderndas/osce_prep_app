import { useState, useRef, useEffect } from 'react';

export default function TestAPI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  // Initialize audio on client side only
  useEffect(() => {
    audioRef.current = new Audio();
    
    // Clean up audio resources when component unmounts
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const testAPI = async () => {
    try {
      if (!audioRef.current) {
        throw new Error('Audio not initialized');
      }

      setIsLoading(true);
      setError(null);

      // Stop any currently playing audio
      const audio = audioRef.current;
      audio.pause();
      audio.currentTime = 0;
      if (audio.src) {
        URL.revokeObjectURL(audio.src);
        audio.src = '';
      }

      console.log('Fetching audio...');
      const response = await fetch('/api/test-tts', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate audio');
      }

      console.log('Converting response to blob...');
      const audioBlob = await response.blob();
      
      if (audioBlob.size === 0) {
        throw new Error('Received empty audio data');
      }

      console.log('Creating audio URL...');
      const audioUrl = URL.createObjectURL(audioBlob);
      audio.src = audioUrl;

      // Add event listeners
      const onEnded = () => {
        URL.revokeObjectURL(audioUrl);
        setIsLoading(false);
      };

      const onError = (e) => {
        console.error('Audio playback error:', e);
        URL.revokeObjectURL(audioUrl);
        setError('Error playing audio');
        setIsLoading(false);
      };

      const onCanPlay = async () => {
        try {
          console.log('Starting playback...');
          await audio.play();
        } catch (playError) {
          console.error('Playback error:', playError);
          setError('Error playing audio: ' + playError.message);
          setIsLoading(false);
        }
      };

      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);
      audio.addEventListener('canplay', onCanPlay);

      // Clean up event listeners when done
      return () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        audio.removeEventListener('canplay', onCanPlay);
      };

    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <button
        onClick={testAPI}
        disabled={isLoading}
        className={`px-4 py-2 rounded-md flex items-center gap-2 ${
          isLoading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating Audio...
          </>
        ) : (
          'Play Test Audio'
        )}
      </button>

      {error && (
        <div className="text-red-500 bg-red-50 p-4 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
} 