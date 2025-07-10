import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import { AnamEvent } from "@anam-ai/js-sdk/dist/module/types";


// Hard-coded fallback system prompt if personaDetails arrives late
const FALLBACK_SYSTEM_PROMPT = `
[ROLE]
You are an AI assistant who will act as a Patient. The User talking to you is a pharmacist. Answer the questions of the user only when they ask. Provide responses from your script when the user ask you.

[SPEAKING STYLE]
Do not initiate a conversation by saying anything. Wait for the pharmacist User to interact with you. You answer in short sentences in just few words. You do not interrupt the pharmacist when they are speaking to you.
When the User is not speaking to you, do not say anything or ask any questions. Always wait for the User to resume the conversation.

[RESPONSE GUIDELINES]
- Understand the INTENT and MEANING of what the user is asking, even if they use different words or phrasing or vocabulary.
- Match their question to the appropriate response from your CONTEXT script below
- You may vary your word choice slightly to sound natural, BUT you MUST NOT change any medical specifics, symptoms, medications, dosages, allergies, dosing instructions, or medical facts. etc.
- If the pharmacist talks something outside your medical scenario, symptoms, medications which is not in your context script then politely reply: "Okay, understood".
- When pharmacist explains you medication use, medication side effects, medication drug interactions, medication rare side effects then simply respond with "Okay".
- When pharmacist clarifies your medication concern or when pharmacist recommends you a medication for your medical concern then simply respond with "Okay".

[CONTEXT]
User: Hi how are you
Assistant: Hi good
User: And i also want to assure you that our discussion is private and confidential.
Assistant: okay.
User: Hi, I am a pharmacist on duty today, how can i help you?
Assistant: i am here to pick up a new prescription?
User: Let me check. Please have a seat and we can talk further.
Assistant: thanks
User: Do you know what this new medication Escitalopram (Cipralex) is prescribed by your doctor?
Assistant: Its for my depression. My doctor said the pharmacist will go over the details.
User: I need to consult/check my references and then get back to you. Give me few minutes to check my references. is that okay?
Assistant: ok
User: Thank you for waiting. So your doctor has prescribed you escitalopram (cipralex) for your mood problem (depression). Escitalopram is the chemical name of Cipralex. Your doctor wants you to take 10mg dose once daily. The total quantity prescribed is for 60 days (2 months).
Assistant: ok
User: Cipralex (Escitalopram) belongs to the class of anti-depressants drugs called Serotonin- Reuptake inhibitors. Serotonin is like the "happy" chemical or "feel-good" chemical in our brains. Cipralex (SSRI drugs) works by increasing the levels of "feel-good" chemicals in your brain to keep your mood balanced. Okay? 
Assistant: Okay
User: You can take this medication any time of the day - morning or evening. You can take this with or without food. Swallow the whole or half tablets with water. Do not chew the tablets as they have a bitter taste. Okay? 
Assistant: Ok
User: Continue taking CIPRALEX even if you do not feel better. It may take several weeks for it to work and improvement may be gradual. So do not stop taking it. In the first 3-4 weeks, your sleep and appetite will improve. Then in another 3-4 weeks it will start to improve your mood as well. Okay?
Assistant: ok
User: Do you understand what i am saying?
Assistant: yes
User: Please store this medication is a dry place at room temperature. If you miss you dose, then don't worry. Just skip the missed dose and take your next day on your usual time. If there are children in your household, make sure you keep this medication away from them. Okay?
Assistant: ok
User: Do not stop taking CIPRALEX abruptly even if you feel better unless your doctor has told you to. *If you stop it abruptly then it can cause other kinds of side effects or symptoms such as headaches, nausea, stomach upset, feeling agitated, feeling irritated, also feeling depressed again, difficulty sleeping, tremors etc. Anything from the symptoms listed here can happen. Okay?
Assistant: ok
User: If you notice any mild allergic reaction like rash or hives then contact your doctor right away. If you notice any serious allergic reaction like shortness of breath, difficulty breathing, swelling on your face/neck/lips/throat, wheezing then please seek urgent medical attention right away or call 911. Okay?
Assistant: ok
User: Let me inform you about side effects. Common Side effects typically include nausea, dizziness or insomnia. These common side effects tend to wear off after few days so please do not stop taking it. Serious or Uncommon side effects: If serious/uncommon side effects happen then consult your doctor right away. If you experience increased risk of self-harm, harm to others, suicidal thinking and behaviour then talk to your doctor right away. Other such serious side effects also include hallucinations, uncontrollable movements of body or face, increased agitation in your behaviour and emotions, and symptoms of sexual dysfunction. Okay?
Assistant: ok..
User: RARE side effect - There are some rare side effects which happen then you must stop taking the drug and call 911 to seek immediate medical help. Rare side effect would be If you notice eye pain, blurry vision or redness in the eyes. Another rare side effect from cipralex (Escitalopram) If you experience serotonin toxicity which is also called Serotonin syndrome then also seek medical help immediately. Serotonin syndrome (toxicity) is manifested as feelings of agitation or restlessness, muscle twitching, involuntary eye movements, flushing, heavy sweating, high body temperature (>38°C), or rigid muscles. Okay?
Assistant: ok
User: For Drug interactions - Always check with your doctor or pharmacist before starting any new medications or supplements to make sure there are no interactions with your existing medication.
Assistant: ok
`.trim();

export default function PersonaPage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const anamClientRef = useRef(null);
  
  // State management
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [personaDetails, setPersonaDetails] = useState(null);
  const [userTurns, setUserTurns] = useState([]);
  const seenUserMsgIds = useRef(new Set());
  const [analysis, setAnalysis] = useState("");
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);
  const isStreaming = useRef(false);
  
  // Timer functionality
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);
  const hasBeepedRef = useRef(false);

  // Add SDK cleanup tracking
  const cleanupDoneRef = useRef(false);
  const cleanupListenersRef = useRef(null);
  const currentTalkStreamRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Component unmounting, calling stopStreaming');
      if (anamClientRef.current?.stopStreaming) {
        anamClientRef.current.stopStreaming();
      }
    };
  }, []);

  // Clear any global Anam state when component mounts
  useEffect(() => {
    // Reset cleanup flag
    cleanupDoneRef.current = false;
    
    // Clean up any previous Anam instances that might be in memory
    if (window.anam) {
      const existingClients = window.anam.__activeClients;
      if (existingClients && existingClients.length > 0) {
        console.log('Found existing Anam clients, cleaning up...');
        // Force cleanup any active clients
        existingClients.forEach(client => {
          try {
            if (typeof client.dispose === 'function') {
              client.dispose();
            } else if (typeof client.destroy === 'function') {
              client.destroy();
            }
          } catch (e) {
            console.error('Error cleaning up existing Anam client:', e);
          }
        });
        // Clear the array
        window.anam.__activeClients = [];
      }
    }
    
    // Clear SDK ready state until confirmed again
    setIsSdkReady(false);
    
    return () => {
      // Component unmount cleanup
      cleanupDoneRef.current = true;
    };
  }, []);

  // Handle SDK loading with retry mechanism
  useEffect(() => {
    let sdkLoadTimeout;
    
    if (!isSdkReady && !cleanupDoneRef.current) {
      // Set a timeout to detect if SDK loading gets stuck
      sdkLoadTimeout = setTimeout(() => {
        if (!isSdkReady && !cleanupDoneRef.current) {
          console.log('SDK loading timeout - attempting manual initialization');
          
          // Try to initialize with existing script if possible
          if (window.anam) {
            console.log('Anam global object exists, attempting to use it');
            setIsSdkReady(true);
          }
        }
      }, 5000); // 5 second timeout
    }
    
    return () => {
      if (sdkLoadTimeout) clearTimeout(sdkLoadTimeout);
    };
  }, [isSdkReady]);

  // Handle browser navigation events (back button, refresh)
  useEffect(() => {
    // This function runs when the user tries to leave the page
    const handleBeforeUnload = (e) => {
      if (isSessionActive) {
        // Synchronously abort the session before page unloads
        try {
          console.log('Emergency cleanup: User is leaving page during active session');
          
          // Clear timer first
          clearInterval(timerRef.current);
          
          // Dispose Anam client first - have to do this synchronously in beforeunload
          if (anamClientRef.current) {
            try {
              // The dispose method might be async but we need to run it synchronously here
              if (typeof anamClientRef.current.dispose === 'function') {
                // Try to dispose immediately, can't await in beforeunload
                anamClientRef.current.dispose();
                console.log('Started emergency disposal of Anam client');
              }
              anamClientRef.current = null;
            } catch (clientError) {
              console.error('Error disposing client in beforeunload:', clientError);
            }
          }
          
          // Stop all media tracks immediately
          try {
            // Stop video tracks
            const videoTracks = videoRef.current?.srcObject?.getTracks();
            if (videoTracks?.length) {
              videoTracks.forEach(t => t.stop());
              console.log('Emergency stopped video tracks');
            }
            if (videoRef.current) videoRef.current.srcObject = null;
            
            // Stop audio tracks
            const audioTracks = audioRef.current?.srcObject?.getTracks();
            if (audioTracks?.length) {
              audioTracks.forEach(t => t.stop());
              console.log('Emergency stopped audio tracks');
            }
            if (audioRef.current) audioRef.current.srcObject = null;
          } catch (mediaError) {
            console.error('Error stopping media in beforeunload:', mediaError);
          }
        } catch (error) {
          console.error('Error during emergency cleanup:', error);
        }
        
        // Show confirmation dialog (browsers may ignore this)
        e.preventDefault();
        e.returnValue = 'You have an active session. Are you sure you want to leave? Your progress will be lost.';
        return e.returnValue;
      }
    };
    
    // This handles the actual "beforeunload" event
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // This adds a confirmation for navigation within Next.js
    const handleRouteChangeStart = (url) => {
      if (isSessionActive && !url.includes('/persona')) {
        if (!window.confirm('You have an active session. Are you sure you want to leave? Your progress will be lost.')) {
          // This works with Next.js Router - prevents navigation
          window.stop();
          throw new Error('Route change aborted');
        } else {
          // User confirmed navigation - clean up
          console.log('Route change confirmed, cleaning up...');
          // Clean up timers
          clearInterval(timerRef.current);
          
          // Dispose Anam client
          if (anamClientRef.current) {
            if (typeof anamClientRef.current.dispose === 'function') {
              anamClientRef.current.dispose();
            }
            anamClientRef.current = null;
          }
          
          // Stop all media tracks
          videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
          if (videoRef.current) videoRef.current.srcObject = null;
          
          audioRef.current?.srcObject?.getTracks().forEach(t => t.stop());
          if (audioRef.current) audioRef.current.srcObject = null;
        }
      }
    };
    
    // Add the Next.js router event listener
    if (router && router.events) {
      router.events.on('routeChangeStart', handleRouteChangeStart);
    }
    
    return () => {
      // Remove event listeners on component unmount
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (router && router.events) {
        router.events.off('routeChangeStart', handleRouteChangeStart);
      }
    };
  }, [isSessionActive, router]);

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

    // 2) Open Anam's TTS stream with correlation ID for tracking
    const correlationId = `talk-stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const talkStream = anamClientRef.current.createTalkMessageStream(correlationId);
    
    // Track this stream for interruption handling
    currentTalkStreamRef.current = talkStream;

    try {
      // 3) Get streaming response from OpenAI
      console.log("🔄 Making OpenAI API call...");
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
          
          // Check if this stream is still the current one and is active
          if (currentTalkStreamRef.current === talkStream && talkStream.isActive() && readyText.trim()) {
            talkStream.streamMessageChunk(readyText, false);
          }
        }
      }

      // Send final chunk
      if (buffer.trim() && currentTalkStreamRef.current === talkStream && talkStream.isActive()) {
        talkStream.streamMessageChunk(buffer.trim(), true);
      }
      
      console.log("✅ Finished streaming OpenAI response to Anam");
    } catch (error) {
      console.error('❌ Error in streamCustomBrainReply:', error);
      throw error;
    } finally {
      // Properly close the talk stream regardless of success or error
      if (talkStream.isActive()) {
        console.log(`🔚 Closing talk stream with correlationId: ${correlationId}`);
        talkStream.endMessage();
      }
      
      // Clear the current stream reference if this was the current one
      if (currentTalkStreamRef.current === talkStream) {
        currentTalkStreamRef.current = null;
      }
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

      // 1) Grab the user’s mic stream so the SDK can listen and interrupt
      let userInputStream;
      try {
        userInputStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.warn("Mic permission denied or unavailable:", err);
      }
      // 2) Wire up both video *and* mic‐input so TALK_STREAM_INTERRUPTED fires
      await anamClient.streamToVideoElement("anamVideo", userInputStream);

      // Clean event listener setup with proper cleanup
      const setupEventListeners = () => {
        // Single handler for custom LLM integration (following docs pattern)
        const onHistory = (history) => {
          // Capture any new user turns for UI display
          history.forEach(msg => {
            if (msg.role === 'user' && !seenUserMsgIds.current.has(msg.id)) {
              seenUserMsgIds.current.add(msg.id);
              console.log('✅ Full user turn received:', msg.id, msg.text || msg.content);
              setUserTurns(prev => [...prev, (msg.text||msg.content).trim()]);
            }
          });
          
          // Call handleMessageHistory to process the history and generate AI responses
          handleMessageHistory(history);
        };

        const onTalkStreamInterrupted = (event) => {
          console.log("user interrupted stream");
          
          // Mark the current stream as unusable by clearing the reference
          // This prevents any ongoing streaming operations from continuing
          if (currentTalkStreamRef.current) {
            currentTalkStreamRef.current = null;
          }
        };

        anamClient.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, onHistory);
        anamClient.addListener(AnamEvent.TALK_STREAM_INTERRUPTED, onTalkStreamInterrupted);

        // Return cleanup function
        return () => {
          anamClient.removeListener(AnamEvent.MESSAGE_HISTORY_UPDATED, onHistory);
          anamClient.removeListener(AnamEvent.TALK_STREAM_INTERRUPTED, onTalkStreamInterrupted);
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

  // ─── Session Management Functions ─────────────────────────────────────────────
  const handleSessionEnd = async () => {
    // Clear the timer first to prevent any automatic ending
    clearInterval(timerRef.current);
    
    // Show loading state while analysis is running
    setIsLoading(true);
    
    // Run the analysis first
    await runAnalysis();
    
    // Actually abort the Anam session immediately to avoid billing
    await abortSession();
    
    // Mark analysis as complete for UI purposes (showing the review state)
    setIsAnalysisComplete(true);
    setIsLoading(false);
  };
  
  const finalizeSessionEnd = async () => {
    // Now we can abort the session
    await abortSession();
    
    // Navigate back to dashboard
    router.push('/dashboard');
  };

  const abortSession = async () => {
    try {
      // Stop the timer
      clearInterval(timerRef.current);
      
      if (anamClientRef.current) {
        console.log('Disposing Anam client...');
        
        try {
          // Clean up event listeners first
          if (cleanupListenersRef.current) {
            cleanupListenersRef.current();
            cleanupListenersRef.current = null;
          }
          
          // Try all possible cleanup methods
          if (typeof anamClientRef.current.stopStreaming === 'function') {
            await anamClientRef.current.stopStreaming();
            console.log('Anam client stopStreaming() completed');
          }
          // Then fully dispose if needed:
          if (typeof anamClientRef.current.dispose === 'function') {
            await anamClientRef.current.dispose();
            console.log('Anam client dispose() completed');
          } 
          // Fallback cleanup methods - also await these
          else if (typeof anamClientRef.current.stop === 'function') {
            await anamClientRef.current.stop();
            console.log('Anam client stopped via stop() method');
          }
          else if (typeof anamClientRef.current.destroy === 'function') {
            await anamClientRef.current.destroy();
            console.log('Anam client destroyed via destroy() method');
          }
          
          // Remove from tracking array if it exists, but ONLY after disposal is complete
          if (window.anam?.__activeClients) {
            window.anam.__activeClients = window.anam.__activeClients.filter(
              client => client !== anamClientRef.current
            );
          }
          
          // Clear reference AFTER disposal is complete
          anamClientRef.current = null;
        } catch (error) {
          console.error('Error in Anam client disposal:', error);
          // Still null the reference in case of error
          anamClientRef.current = null;
        }
      }
      
      // Only proceed to media cleanup AFTER client disposal is complete
      console.log('Cleaning up media tracks...');
      
      // Stop all media tracks using optional chaining exactly as suggested
      videoRef.current?.srcObject?.getTracks().forEach(t => {
        console.log(`Stopping video track: ${t.kind} (${t.id})`);
        t.stop();
      });
      if (videoRef.current) videoRef.current.srcObject = null;
      
      audioRef.current?.srcObject?.getTracks().forEach(t => {
        console.log(`Stopping audio track: ${t.kind} (${t.id})`);
        t.stop();
      });
      if (audioRef.current) audioRef.current.srcObject = null;
      
      setIsSessionActive(false);
      console.log('Session aborted successfully');
    } catch (error) {
      console.error('Error aborting session:', error);
      setError('Failed to abort session. Please try refreshing the page.');
    }
  };

  async function runAnalysis() {
    console.log('About to send userTurns:', userTurns);
    
    try {
      const res = await fetch('/api/anamanalysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userTurns })
      });
      
      if (!res.ok) {
        throw new Error('Analysis failed');
      }
      
      const { analysis } = await res.json();
      setAnalysis(analysis);
      return analysis;
    } catch (error) {
      console.error('Error running analysis:', error);
      setError('Failed to analyze interaction. ' + error.message);
      return null;
    }
  }

  return (
    <div className="min-h-screen bg-base-100 p-4">
      <Script 
        src="https://unpkg.com/@anam-ai/js-sdk@2.5.0/dist/umd/anam.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('Anam SDK loaded via Script component');
          // Initialize tracking array
          if (!window.anam.__activeClients) {
            window.anam.__activeClients = [];
          }
          setIsSdkReady(true);
        }}
      />

      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Persona Interaction</h1>
        
        <div className="flex justify-center gap-4 mb-4">
          {!isSessionActive && !isAnalysisComplete && (
            <button 
              onClick={startSession}
              disabled={isLoading || !isSdkReady}
              className={`btn ${(isLoading || !isSdkReady) ? 'btn-disabled' : 'btn-primary'}`}
            >
              {isLoading ? 'Starting...' : !isSdkReady ? 'Loading SDK...' : 'Start Session'}
            </button>
          )}
          
          {isSessionActive && !isAnalysisComplete && (
            <button 
              onClick={handleSessionEnd}
              disabled={isLoading}
              className={`btn ${isLoading ? 'btn-disabled' : 'btn-error'}`}
            >
              {isLoading ? 'Analyzing...' : 'End Session'}
            </button>
          )}
          
          {isAnalysisComplete && (
            <button
              onClick={finalizeSessionEnd}
              className="btn btn-primary"
            >
              Return to Dashboard
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

        {isAnalysisComplete && analysis && (
          <div className="bg-base-200 p-6 rounded-lg mt-6">
            <h2 className="text-xl font-semibold mb-4">Session Analysis</h2>
            <div className="bg-base-100 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">{analysis}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 