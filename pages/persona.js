import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';

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
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
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
  const cleanupListenersRef = useRef(null);

  // Protect the route
  if (isLoaded && !isSignedIn) {
    router.push('/auth/signin');
    return null;
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg"></span>
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

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
      // 3) Get streaming response from OpenAI
      const response = await fetch("/api/openai-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages })
      });

      if (!response.ok) {
        throw new Error('Failed to get streaming response from OpenAI');
      }

      // 4) Stream the response directly to Anam as tokens arrive
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Send chunks when we have complete words/phrases
        const words = buffer.split(' ');
        if (words.length > 1) {
          const readyText = words.slice(0, -1).join(' ') + ' ';
          buffer = words[words.length - 1];
          
          if (talkStream.isActive() && readyText.trim()) {
            talkStream.streamMessageChunk(readyText, false);
          }
        }
      }

      // Send final chunk
      if (buffer.trim() && talkStream.isActive()) {
        talkStream.streamMessageChunk(buffer.trim(), true);
      }
    } catch (error) {
      console.error('Error in streamCustomBrainReply:', error);
      throw error;
    }
  }

  // ─── Message History Handler ───────────────────────────────────────────────
  const handleMessageHistory = async (messages) => {
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

  // ─── Handle User Utterance (for complete turns) ────────────────────────────
  const handleUserUtterance = async (userText) => {
    try {
      // Get the current message history from Anam client
      const currentHistory = anamClientRef.current?.getMessageHistory?.() || [];
      
      // If we have history, use it; otherwise build a simple history with the user text
      if (currentHistory.length > 0) {
        await streamCustomBrainReply(currentHistory);
      } else {
        // Fallback: create a minimal history with just this user message
        const fallbackHistory = [{ role: 'user', content: userText }];
        await streamCustomBrainReply(fallbackHistory);
      }
    } catch (error) {
      console.error('Error in handleUserUtterance:', error);
      setError('Failed to get AI response. Please try again.');
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

      // Clean event listener setup with proper cleanup
      const setupEventListeners = () => {
        // 1️⃣ UI sync only
        const onHistory = (history) => {
          // Capture any new user turns for UI display
          history.forEach(msg => {
            if (msg.role === 'user' && !seenUserMsgIds.current.has(msg.id)) {
              seenUserMsgIds.current.add(msg.id);
              console.log('Captured user turn:', msg.id, msg.text || msg.content);
              setUserTurns(prev => [...prev, (msg.text||msg.content).trim()]);
            }
          });
        };

        // 2️⃣ Single-shot user turn & send
        const onStream = (evt) => {
          // Only process user events, ignore persona/assistant events
          if (evt.role !== "user") return;
          
          if (evt.endOfSpeech) {
            const text = evt.text || evt.content;
            console.log("Full user turn:", text);
            handleUserUtterance(text.trim());
          }
        };

        anamClient.addListener("MESSAGE_HISTORY_UPDATED", onHistory);
        anamClient.addListener("MESSAGE_STREAM_EVENT_RECEIVED", onStream);

        // Return cleanup function
        return () => {
          anamClient.removeListener("MESSAGE_HISTORY_UPDATED", onHistory);
          anamClient.removeListener("MESSAGE_STREAM_EVENT_RECEIVED", onStream);
        };
      };

      // Setup listeners and store cleanup function
      cleanupListenersRef.current = setupEventListeners();

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
        // Clean up event listeners first
        if (cleanupListenersRef.current) {
          cleanupListenersRef.current();
          cleanupListenersRef.current = null;
        }
        
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
      // Cleanup event listeners
      if (cleanupListenersRef.current) {
        cleanupListenersRef.current();
        cleanupListenersRef.current = null;
      }
      
      // Cleanup Anam client
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