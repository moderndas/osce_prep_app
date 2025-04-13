import { useState, useRef, useEffect } from 'react';

export default function StationAudio({ text, label }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(new Audio());

  // Clean up audio resources when component unmounts
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []);

  const playAudio = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Stop any currently playing audio
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        if (audio.src) {
          URL.revokeObjectURL(audio.src);
          audio.src = '';
        }
      }

      console.log('Fetching audio for:', text);
      const response = await fetch('/api/station-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate audio');
      }

      const audioBlob = await response.blob();
      
      if (audioBlob.size === 0) {
        throw new Error('Received empty audio data');
      }

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
    <div className="flex items-center gap-2">
      <button
        onClick={playAudio}
        disabled={isLoading}
        className={`px-3 py-1 rounded-md flex items-center gap-2 ${
          isLoading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-500 hover:bg-blue-600 text-white text-sm'
        }`}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Playing...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {label || 'Play Audio'}
          </>
        )}
      </button>

      {error && (
        <div className="text-red-500 text-sm">
          {error}
        </div>
      )}
    </div>
  );
} 