'use client'
import React, { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { useRouter } from 'next/router'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { AnamEvent } from '@anam-ai/js-sdk'

// Hard-coded fallback system prompt if nothing is available from the station
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

export default function StationDetail({ station }) {
  const router = useRouter()
  const { user } = useUser()
  const videoRef = useRef(null)
  const audioRef = useRef(null)
  const anamClientRef = useRef(null)
  
  // State management
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [isSdkReady, setIsSdkReady] = useState(false)
  const [personaDetails, setPersonaDetails] = useState(null)
  const [userTurns, setUserTurns] = useState([])
  const seenUserMsgIds = useRef(new Set())
  const [analysis, setAnalysis] = useState("")
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false)
  const isStreaming = useRef(false)
  
  // Timer functionality
  const [seconds, setSeconds] = useState(0)
  const timerRef = useRef(null)
  const hasBeepedRef = useRef(false)

  // Add SDK cleanup tracking
  const cleanupDoneRef = useRef(false)

  // ─── Streaming Custom-Brain Reply ─────────────────────────────────────────────
  async function streamCustomBrainReply(history) {
    // Use the station's systemPrompt, persona's prompt, or fallback
    const systemPrompt =
      station?.systemPrompt?.trim() ||
      personaDetails?.brain?.systemPrompt?.trim() ||
      FALLBACK_SYSTEM_PROMPT;

    // 1) Build the OpenAI messages array
    const messages = [
      { role: "system", content: systemPrompt },
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
      // Get the personaId from the station data or use fallback
      const personaId = station?.personaId || process.env.NEXT_PUBLIC_PERSONA_ID;
      
      if (!personaId) {
        console.warn('No personaId available in station or environment');
      }
      
      const response = await fetch('/api/anam/session-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personaConfig: {
            id: personaId
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
      return sessionToken;
    } catch (error) {
      console.error('Error getting session token:', error);
      throw error;
    }
  };

  const startSession = async () => {
    try {
      // Check if SDK is really ready and global object is usable
      if (!window.anam?.createClient) {
        console.log('Anam SDK not fully initialized yet');
        
        // Wait briefly for SDK to be available
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // If still not available after delay, throw error
        if (!window.anam?.createClient) {
          throw new Error('Anam SDK not loaded correctly. Please refresh the page and try again.');
        }
      }

      // First check if we need to abort any existing session
      if (anamClientRef.current) {
        console.log('Found existing Anam client before starting new session, aborting first...');
        await abortSession();
        
        // Add a small delay to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setIsLoading(true);
      setError(null);

      // Track this client instance for future cleanup
      if (!window.anam.__activeClients) {
        window.anam.__activeClients = [];
      }

      // Get session token from our backend
      const sessionToken = await getSessionToken();
      console.log('➡️ about to init Anam with token:', sessionToken);

      // Initialize Anam client with session token
      const anamClient = window.anam.createClient(sessionToken);
      anamClientRef.current = anamClient;
      
      // Add to tracking array
      window.anam.__activeClients.push(anamClient);

      // Add error listener
      anamClient.addListener('ERROR', (error) => {
        console.error('Anam client error:', error);
        setError('An error occurred with the AI assistant. Please try refreshing the page.');
        setIsSessionActive(false);
      });

      // Start the stream with proper element references
      if (!isStreaming.current && !anamClient.isStreaming()) {
        isStreaming.current = true;
        await anamClient.streamToVideoAndAudioElements("anamVideo", "anamAudio");
      }
      console.log('Anam stream started successfully');

      // Reset user turns
      setUserTurns([]);
      seenUserMsgIds.current = new Set();

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

      // Listen for connection closed events
      anamClient.addListener(AnamEvent.CONNECTION_CLOSED, (reason) => {
        console.log('Anam session closed:', reason);
        // Freeze UI or transition to "ended" state
        setIsSessionActive(false);
        setIsAnalysisComplete(true);
      });

      // Reset and start timer
      clearInterval(timerRef.current);
      setSeconds(0);
      hasBeepedRef.current = false;

      // Start counting up every second
      timerRef.current = setInterval(() => {
        setSeconds(prev => {
          // Beep at 5 minutes (300 seconds)
          if (prev + 1 === 300 && !hasBeepedRef.current) {
            hasBeepedRef.current = true;
            new Audio('/sounds/beep.mp3').play().catch(e => console.error('Error playing beep:', e));
          }
          
          // Auto-end at 7 minutes (420 seconds)
          if (prev + 1 >= 420) {
            // We'll clear the interval here to ensure it stops immediately
            clearInterval(timerRef.current);
            handleSessionEnd();
            // Return current value to avoid incrementing after timeout
            return prev;
          }
          
          return prev + 1;
        });
      }, 1000);

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
    
    // Navigate back to stations
    router.push('/dashboard/stations');
  };

  const abortSession = async () => {
    try {
      // Stop the timer
      clearInterval(timerRef.current);
      
      if (anamClientRef.current) {
        console.log('Disposing Anam client...');
        
        try {
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
    
    // Use the station's analysisPrompt if available
    const analysisPrompt = station?.analysisPrompt || null;
    const requestBody = { userTurns };
    
    // Only add analysisPrompt to request if it exists
    if (analysisPrompt) {
      requestBody.analysisPrompt = analysisPrompt;
    }
    
    try {
      const res = await fetch('/api/anamanalysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
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
      if (isSessionActive && !url.includes(station.id)) {
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
  }, [isSessionActive, station?.id, router]);

  return (
    <>
      <Script 
        src="https://unpkg.com/@anam-ai/js-sdk@2.0.0/dist/umd/anam.js"
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
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{station.stationName}</h1>
            <Link href="/dashboard/stations" className="btn btn-ghost">
              Back to Stations
            </Link>
          </div>
          
          <div className="divider my-2"></div>
          
          <div className="bg-base-200 p-4 rounded-lg mb-4">
            <h2 className="font-semibold mb-2">Clinical Background:</h2>
            <p>{station.clinicalBackground}</p>
          </div>
        </div>
        
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
              Return to Stations
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
              
              {/* Session ended overlay */}
              {isAnalysisComplete && (
                <div className="absolute inset-0 bg-base-300 bg-opacity-50 flex items-center justify-center">
                  <div className="bg-base-100 px-6 py-4 rounded-lg shadow-lg text-center">
                    <h3 className="text-xl font-bold text-base-content">This OSCE station has ended</h3>
                    <p className="mt-2 text-base-content/70">Your analysis is available below</p>
                  </div>
                </div>
              )}
              
              {/* Timer display */}
              {isSessionActive && !isAnalysisComplete && (
                <div className="fixed bottom-2 right-2 text-xs bg-base-300 bg-opacity-70 text-base-content px-2 py-1 rounded">
                  {String(Math.floor(seconds/60)).padStart(2,'0')}:
                  {String(seconds%60).padStart(2,'0')}
                </div>
              )}
            </div>
          </div>
        </div>

        <audio
          id="anamAudio"
          ref={audioRef}
          autoPlay
          className="hidden"
        />

        {analysis && (
          <div className="card bg-base-100 shadow-xl mt-8 overflow-hidden">
            <div className="bg-primary text-primary-content p-4">
              <h2 className="card-title text-2xl font-bold">Performance Analysis</h2>
            </div>
            <div className="card-body">
              <div className="grid gap-6">
                {/* Analysis Result Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-base-content/80 border-b pb-2">
                    OSCE Evaluation
                  </h3>
                  <div className="prose max-w-none">
                    {analysis.split('\n').map((paragraph, index) => {
                      // Check if this line contains a score or grade pattern
                      const isScore = /grade|score|\d\/\d|[0-9]+\s*%|[0-9]+\s*points/i.test(paragraph);
                      
                      // Check if it looks like a heading (short, ends with colon)
                      const isHeading = paragraph.length < 50 && paragraph.trim().endsWith(':');
                      
                      // If empty line, render a small gap
                      if (!paragraph.trim()) {
                        return <div key={index} className="my-2"></div>;
                      }
                      
                      // Render different styles based on content type
                      if (isScore) {
                        return (
                          <div key={index} className="bg-base-200 p-3 rounded-lg font-semibold text-lg my-2">
                            {paragraph}
                          </div>
                        );
                      } else if (isHeading) {
                        return <h4 key={index} className="font-bold mt-4 mb-2">{paragraph}</h4>;
                      } else {
                        return <p key={index} className="my-2 text-base-content/90">{paragraph}</p>;
                      }
                    })}
                  </div>
                </div>
                
                {/* Tips Section */}
                <div className="bg-base-200 p-4 rounded-lg mt-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Next Steps
                  </h3>
                  <p className="mt-2 text-sm">
                    Review this feedback and practice areas that need improvement. 
                    Remember that effective patient communication involves clear explanations, 
                    active listening, and displaying empathy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
} 