import React, { useEffect, useRef } from 'react';
import Script from 'next/script';

export default function PersonaPage() {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const anamClientRef = useRef(null);

  const initAnam = async () => {
    try {
      if (!window.anam) {
        console.error('Anam SDK not loaded');
        return;
      }

      const { unsafe_createClientWithApiKey } = window.anam;
      const anamClient = await unsafe_createClientWithApiKey(
        'ZTc0ZTRhZTYtNjBkZi00YWE1LTkzYWEtZGQwMjFmOTY1OTE2OkxGbFJtTWloTW9HUlNjNnM2dUxSNVh3bXRPUFRua1I4djlqUTZVL0ZyOVE9',
        {
          name: "Cara",
          avatarId: "30fa96d0-26c4-4e55-94a0-517025942e18", // The avatar ID for Cara
          voiceId: "6bfbe25a-979d-40f3-a92b-5394170af54b", // The voice ID for Cara
          brainType: "ANAM_LLAMA_v3_3_70B_V1",
          systemPrompt: "[STYLE] Reply in natural speech without formatting. Add pauses using '...' and very occasionally a disfluency. [PERSONALITY] You are Cara, a helpful assistant.",
        }
      );

      // Store client reference
      anamClientRef.current = anamClient;

      // Start streaming to video and audio elements
      await anamClient.streamToVideoAndAudioElements('anamVideo', 'anamAudio');

      // Add listener for video playback
      anamClient.addListener('VIDEO_PLAY_STARTED', () => {
        anamClient.talk('Hello world!');
      });

      console.log('Anam client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Anam:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (anamClientRef.current) {
        try {
          anamClientRef.current.dispose();
        } catch (error) {
          console.error('Error disposing Anam client:', error);
        }
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-base-100 p-4">
      <Script 
        src="https://unpkg.com/@anam-ai/js-sdk@2.0.0/dist/umd/anam.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('Anam SDK loaded');
          if (window.anam) {
            initAnam();
          }
        }}
        onError={(e) => console.error('Error loading Anam SDK:', e)}
      />

      <h1 className="text-2xl font-bold mb-4">Persona Interaction</h1>
      
      <div className="relative aspect-video bg-base-300 rounded-lg overflow-hidden mb-4">
        <video
          id="anamVideo"
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
      </div>

      <audio
        id="anamAudio"
        ref={audioRef}
        autoPlay
        className="hidden"
      />
    </div>
  );
} 