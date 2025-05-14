import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

// Hard-coded fallback system prompt if personaDetails arrives late
const FALLBACK_SYSTEM_PROMPT = `
[PERSONALITY]
You are an AI assistant who will act as a Patient. The User is a pharmacist. Answer the questions of the user when they ask. Provide responses from your script when the user ask you.

[STYLE]
Do not initiate a conversation by saying anything. Wait for the pharmacist to interact with you. You answer in short sentences in just few words. You do not deviate from your responses at all. You do not interrupt the pharmacist when they are speaking to you.
When the User is not speaking to you, do not say anything or ask any questions. Always wait for the User to resume the conversation.

[CONTEXT]
User: Hi, I am a pharmacist on duty today, how can i help you?
Assistant: Umm, i am having terrible headaches since two weeks. I have to go to a wedding tomorrow.
User: I am sorry to hear this. Is it okay if i ask you some questions about your medical history and medications to find solution to this problem?
Assistant: Yeah sure, go ahead. 
User: And i also want to assure you that our discussion is private and confidential.
Assistant: okay thanks.
User: So, Do you have any allergies?
Assistant: I am allergic to shellfish and Peanuts. And pollen.
User:Are you on any medication currently?
Assistant: Currently i take naproxen 500mg twice daily.
User: Can you describe headache in some detail?
Assistant: It starts on my left side of head and pinches me in the eye. Especially in bright lights and day time.
User: Do you currentlytake any over the counter medications or supplements:
Assistant: I take Acetaminophen extra strength sometimes as needed.
User: Have you tried any other medications in the past?
Assistant: I took Migraine pills but they made me nauseaus.
User: Do you have any other question or concern before i check my references?
Assistant: Can i take 3 pills of Advil back to back?
`.trim();

export default function PersonaPage() {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const anamClientRef = useRef(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [personaDetails, setPersonaDetails] = useState(null);
  const [userTurns, setUserTurns] = useState([]);
  const seenUserMsgIds = useRef(new Set());
  const [analysis, setAnalysis] = useState("");

  // ─── Custom Brain Reply Handler ───────────────────────────────────────────────
  // async function getCustomBrainReply(history) {
  //   // ... old implementation ...
  // }

  // ─── Streaming Custom-Brain Reply ─────────────────────────────────────────────
  async function streamCustomBrainReply(history) {
    // Use Lab prompt if available, otherwise fallback
    const systemPrompt =
      personaDetails?.brain?.systemPrompt?.trim() ||
      FALLBACK_SYSTEM_PROMPT;

    // 1) Build the OpenAI messages array
    const messages = [
      { role: "system",  content: systemPrompt },
      ...history
        .filter(m => (m.role === "user" || m.role === "assistant") && (m.text || m.content)?.trim())
        .map(m => ({ role: m.role, content: (m.text || m.content).trim() }))
    ];

    // 2) Open Anam's TTS stream
    const talkStream = anamClientRef.current.createTalkMessageStream();

    try {
      // 3) Get the response from OpenAI
      const response = await fetch("/api/openai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from OpenAI');
      }

      const { reply } = await response.json();

      // 4) Stream the reply to Anam
      if (talkStream.isActive()) {
        // Split the reply into chunks and stream them
        const chunks = reply.match(/.{1,50}/g) || [reply];
        for (let i = 0; i < chunks.length; i++) {
          const isLastChunk = i === chunks.length - 1;
          talkStream.streamMessageChunk(chunks[i], isLastChunk);
          // Add a small delay between chunks for natural speech
          if (!isLastChunk) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
    } catch (error) {
      console.error('Error in streamCustomBrainReply:', error);
      throw error;
    }
  }

  // ─── Message History Handler ───────────────────────────────────────────────
  const handleMessageHistory = async (messages) => {
    console.log('Message History Payload:', JSON.stringify(messages, null, 2));
    const last = messages[messages.length - 1];
    if (last.role === 'user') {
      try {
        // Use streaming reply
        await streamCustomBrainReply(messages);
      } catch (error) {
        console.error('Error getting custom brain reply:', error);
        setError('Failed to get AI response. Please try again.');
      }
    }
  };

  const getSessionToken = async () => {
    try {
      const response = await fetch('/api/anam/session-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personaConfig: {
            id: process.env.NEXT_PUBLIC_PERSONA_ID
        }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get session token');
      }

      const { sessionToken, persona } = await response.json();
      // Store persona details if they're included in the response
      if (persona) {
        setPersonaDetails(persona);
      }
      return sessionToken;   // <-- string
    } catch (error) {
      console.error('Error getting session token:', error);
      throw error;
    }
  };

  const startSession = async () => {
    try {
      if (!window.anam?.createClient) {
        throw new Error('Anam SDK not loaded yet. Please wait a moment and try again.');
      }

      setIsLoading(true);
      setError(null);

      // Get session token from our backend
      const sessionToken = await getSessionToken();
      console.log('➡️ about to init Anam with token:', sessionToken);

      // Initialize Anam client with session token
      const anamClient = window.anam.createClient(sessionToken);
      anamClientRef.current = anamClient;

      // Add error listener
      anamClient.addListener('ERROR', (error) => {
        console.error('Anam client error:', error);
        setError('An error occurred with the AI assistant. Please try refreshing the page.');
        setIsSessionActive(false);
      });

      // Start the stream with proper element references
      await anamClient.streamToVideoAndAudioElements("anamVideo", "anamAudio");

      // Consolidated message history listener
      anamClient.addListener("MESSAGE_HISTORY_UPDATED", (history) => {
        // 1) Capture any new user turns
        history.forEach(msg => {
          if (msg.role === 'user' && !seenUserMsgIds.current.has(msg.id)) {
            seenUserMsgIds.current.add(msg.id);
            console.log('Captured user turn:', msg.id, msg.text || msg.content);
            setUserTurns(prev => [...prev, (msg.text||msg.content).trim()]);
          }
        });

        // 2) If the last message is from user, stream the AI reply
        const last = history[history.length - 1];
        if (last.role === 'user') {
          streamCustomBrainReply(history).catch(err => {
            console.error('Stream error:', err);
            setError('Failed to stream AI response.');
          });
        }
      });

      setIsLoading(false);
      setIsSessionActive(true);
      console.log('Anam client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Anam:', error);
      setError('Failed to initialize AI assistant. Please try again later.');
      setIsLoading(false);
      setIsSessionActive(false);
    }
  };

  const abortSession = async () => {
    try {
      if (anamClientRef.current) {
        if (typeof anamClientRef.current.dispose === 'function') {
          await anamClientRef.current.dispose();
        } else {
          if (typeof anamClientRef.current.stop === 'function') {
            await anamClientRef.current.stop();
          }
          if (typeof anamClientRef.current.destroy === 'function') {
            await anamClientRef.current.destroy();
          }
        }
        anamClientRef.current = null;
        setIsSessionActive(false);
        console.log('Session aborted successfully');
      }
    } catch (error) {
      console.error('Error aborting session:', error);
      setError('Failed to abort session. Please try refreshing the page.');
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

  async function runAnalysis() {
    console.log('About to send userTurns:', userTurns);
    const res = await fetch('/api/anamanalysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userTurns })
    });
    const { analysis } = await res.json();
    setAnalysis(analysis);
  }

  return (
    <div className="min-h-screen bg-base-100 p-4">
      <Script 
        src="https://unpkg.com/@anam-ai/js-sdk@2.0.0/dist/umd/anam.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('Anam SDK loaded');
          setIsSdkReady(true);
        }}
      />

      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Persona Interaction</h1>
        
        <div className="flex justify-center gap-4 mb-4">
          <button 
            onClick={startSession}
            disabled={isLoading || isSessionActive || !isSdkReady}
            className={`btn ${(isLoading || isSessionActive || !isSdkReady) ? 'btn-disabled' : 'btn-primary'}`}
          >
            {isLoading ? 'Starting...' : !isSdkReady ? 'Loading SDK...' : 'Start Station'}
          </button>
          
          <button 
            onClick={abortSession}
            disabled={!isSessionActive}
            className={`btn ${!isSessionActive ? 'btn-disabled' : 'btn-error'}`}
          >
            Abort Session
          </button>
          {isSessionActive && (
            <button
              onClick={runAnalysis}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Analyze Answers
            </button>
          )}
        </div>
        
        <div className="flex justify-center">
          <div className="w-full max-w-4xl">
            <div className="relative aspect-video bg-base-300 rounded-lg overflow-hidden mb-4">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-base-300">
                  <div className="loading loading-spinner loading-lg"></div>
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-base-300">
                  <div className="text-error text-center p-4">{error}</div>
                </div>
              )}
              <video
                id="anamVideo"
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
            </div>
          </div>
        </div>

        <audio
          id="anamAudio"
          ref={audioRef}
          autoPlay
          className="hidden"
        />

        {isSessionActive && analysis && (
          <div className="analysis-panel mt-4 p-4 bg-gray-100 rounded">
            <h2 className="font-bold mb-2">GPT Feedback:</h2>
            <pre className="whitespace-pre-wrap">{analysis}</pre>
          </div>
        )}
      </div>
    </div>
  );
} 