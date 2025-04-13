import { useState, useEffect } from 'react';

// Note: The transcript and voice analysis data are ephemeral and are used solely for immediate feedback and GPT analysis.
// They are not stored permanently in MongoDB.

// GPT Prompt Template
const constructGptPrompt = (stationData, ephemeralData) => {
  // Create the GPT prompt template with all required sections
  const gptPrompt = `You are an expert OSCE evaluator. Your task is to analyze a candidate's performance in a pharmacy station.

Station Data:
------------
• Clinical Background: ${stationData.clinicalBackground}

Questions to be Answered:
1. Initial Question (shown at 10s): ${stationData.initialQuestion || 'None'}
2. Five Minute Question: ${stationData.fiveMinuteQuestion || 'None'}

Expected Answers:
---------------
${Array.isArray(stationData.expectedAnswers) ? 
    stationData.expectedAnswers.map(a => `• ${a}`).join('\n') : 
    `• ${stationData.expectedAnswers}`}

Candidate's Response:
-------------------
• Transcript: "${ephemeralData.transcript}"

Voice Metrics:
-------------
• Voice Tone Rating: ${ephemeralData.voiceTone}
• Voice Pace Rating: ${ephemeralData.voicePace}

Based on the above information, analyze the candidate's response by comparing it with the station data. Please evaluate the following aspects:

1. Question Coverage Analysis:
   a) Initial Question Response: Evaluate how well the candidate addressed the question shown at 10 seconds
   b) Five Minute Question Response: Assess how the candidate handled the question presented at 5 minutes

2. Answer Quality Analysis:
   - Compare the candidate's responses against the expected answers for each question type
   - Identify which expected points were covered and which were missed
   - Evaluate the accuracy and completeness of responses

3. Voice Communication:
   - Voice Tone Analysis: How does the candidate's voice tone affect the quality of responses?
   - Voice Pace Analysis: How does the speaking pace impact the clarity and effectiveness?

4. Overall Performance:
   - Comprehensive evaluation of the candidate's performance across all questions
   - Strengths and areas for improvement
   - Specific recommendations for enhancing responses to each question type

IMPORTANT: Your response MUST be in the following JSON format:
{
  "initialQuestionAnalysis": "<detailed analysis of how well the candidate addressed the 10-second question>",
  "fiveMinuteQuestionAnalysis": "<detailed analysis of how the candidate handled the 5-minute question>",
  "voiceToneFeedback": "<detailed analysis of how the candidate's voice tone impacts the interaction>",
  "voicePaceFeedback": "<detailed analysis of how the candidate's speaking pace affects communication>",
  "overallSummary": "<comprehensive evaluation including strengths, weaknesses, and recommendations>"
}`;

  return gptPrompt;
};

const GPTAnalysis = ({ stationId, videoId }) => {
  // State for permanent station data
  const [stationData, setStationData] = useState({
    clinicalBackground: '',
    expectedAnswers: [],
    initialQuestion: '',
    fiveMinuteQuestion: ''
  });

  // State for ephemeral candidate response data - cleared after analysis is complete
  const [ephemeralData, setEphemeralData] = useState({
    transcript: '',
    voiceTone: '',
    voicePace: '',
  });

  // State for loading and error handling
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add state for GPT analysis
  const [gptAnalysisResult, setGptAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Assume stationData is fetched from MongoDB and passed as a prop or loaded in state
    const fetchStationData = async () => {
      try {
        const response = await fetch(`/api/stations/${stationId}`);
        if (!response.ok) throw new Error('Failed to fetch station data');
        const data = await response.json();
        setStationData({
          clinicalBackground: data.clinicalBackground,
          expectedAnswers: Array.isArray(data.expectedAnswers) ? data.expectedAnswers : [data.expectedAnswers],
          initialQuestion: data.initialQuestion,
          fiveMinuteQuestion: data.fiveMinuteQuestion
        });
      } catch (err) {
        setError('Failed to load station data');
        console.error('Error fetching station data:', err);
      }
    };

    // Assume transcript, voiceTone, and voicePace are obtained from the AssemblyAI transcription process and stored temporarily
    const fetchTranscriptionData = async () => {
      try {
        // First check if transcription exists and get its ID
        const transcribeResponse = await fetch('/api/transcribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            videoId,
            options: {
              sentiment_analysis: true,
              auto_highlights: true
            }
          })
        });

        if (!transcribeResponse.ok) {
          throw new Error('Failed to start transcription');
        }

        const { id: transcriptionId } = await transcribeResponse.json();
        
        // Poll for transcription results
        const pollInterval = setInterval(async () => {
          const pollResponse = await fetch(`/api/transcription-result?id=${transcriptionId}`);
          if (!pollResponse.ok) {
            clearInterval(pollInterval);
            throw new Error('Failed to fetch transcription status');
          }
          
          const result = await pollResponse.json();
          
          if (result.status === 'completed') {
            clearInterval(pollInterval);
            // Extract voice characteristics from sentiment analysis
            const voiceTone = analyzeVoiceTone(result.sentiment_analysis_results);
            const voicePace = analyzeVoicePace(result.words);
            
            setEphemeralData({
              transcript: result.text,
              voiceTone,
              voicePace
            });
            setIsLoading(false);
          } else if (result.status === 'error') {
            clearInterval(pollInterval);
            throw new Error(result.error);
          }
          // Continue polling if status is 'queued' or 'processing'
        }, 2000);

        // Cleanup interval on component unmount
        return () => clearInterval(pollInterval);
      } catch (err) {
        setError('Failed to load transcription data');
        console.error('Error fetching transcription:', err);
        setIsLoading(false);
      }
    };

    // Helper function to analyze voice tone from sentiment results
    const analyzeVoiceTone = (sentimentResults) => {
      if (!sentimentResults || sentimentResults.length === 0) return 'neutral';
      
      // Calculate average sentiment
      const sentiments = sentimentResults.map(result => result.sentiment);
      const averageSentiment = sentiments.reduce((acc, curr) => {
        if (curr === 'POSITIVE') return acc + 1;
        if (curr === 'NEGATIVE') return acc - 1;
        return acc;
      }, 0) / sentiments.length;

      // Convert to tone rating
      if (averageSentiment > 0.3) return 'professional';
      if (averageSentiment < -0.3) return 'unprofessional';
      return 'neutral';
    };

    // Helper function to analyze voice pace from words timing
    const analyzeVoicePace = (words) => {
      if (!words || words.length < 2) return 'neutral';
      
      // Calculate words per minute
      const durationInMinutes = (words[words.length - 1].end - words[0].start) / 60000;
      const wpm = words.length / durationInMinutes;

      // Rate the pace
      if (wpm > 160) return 'fast';
      if (wpm < 120) return 'slow';
      return 'professional';
    };

    const loadAllData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchStationData(),
        fetchTranscriptionData()
      ]);
      setIsLoading(false);
    };

    if (stationId && videoId) {
      loadAllData();
    }
  }, [stationId, videoId]);

  // Function to clear ephemeral data
  const clearEphemeralData = () => {
    setEphemeralData({
      transcript: '',
      voiceTone: '',
      voicePace: '',
    });
    setGptAnalysisResult(null);
  };

  // Function to analyze the response using GPT
  const analyzeWithGPT = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);

      const gptPrompt = constructGptPrompt(stationData, ephemeralData);

      const response = await fetch('/api/gpt-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: gptPrompt })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get GPT analysis');
      }

      const { analysis: analysisContent } = await response.json();

      let analysisResult;
      try {
        analysisResult = JSON.parse(analysisContent);
      } catch (parseError) {
        console.error('Error parsing GPT response:', parseError);
        throw new Error('Failed to parse GPT analysis result');
      }

      // Validate the required fields are present
      const requiredFields = [
        'initialQuestionAnalysis',
        'fiveMinuteQuestionAnalysis',
        'voiceToneFeedback',
        'voicePaceFeedback',
        'overallSummary'
      ];
      
      const missingFields = requiredFields.filter(field => !analysisResult[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`GPT response missing required fields: ${missingFields.join(', ')}`);
      }

      setGptAnalysisResult(analysisResult);
    } catch (error) {
      console.error('GPT Analysis error:', error);
      setError(`GPT Analysis failed: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Update the performGptAnalysis function to use analyzeWithGPT
  const performGptAnalysis = async () => {
    if (!ephemeralData.transcript) {
      setError('No transcript available for analysis');
      return;
    }

    await analyzeWithGPT();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-700">Loading analysis data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">GPT Analysis</h2>
      
      {/* Data verification section */}
      <div className="space-y-6 mb-8">
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Station Information</h3>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-2">Clinical Background:</h4>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-md">
                {stationData.clinicalBackground}
              </p>
            </div>
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-2">Expected Answers:</h4>
              <ul className="list-disc list-inside space-y-2 bg-gray-50 p-3 rounded-md">
                {Array.isArray(stationData.expectedAnswers) ? 
                  stationData.expectedAnswers.map((a, i) => (
                    <li key={i} className="text-gray-600">{a}</li>
                  )) : 
                  <li className="text-gray-600">{stationData.expectedAnswers}</li>
                }
              </ul>
            </div>
            {stationData.initialQuestion && (
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-2">Initial Question (10s):</h4>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-md">
                  {stationData.initialQuestion}
                </p>
              </div>
            )}
            {stationData.fiveMinuteQuestion && (
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-2">Five Minute Question:</h4>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-md">
                  {stationData.fiveMinuteQuestion}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Candidate's Response</h3>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-2">Transcript:</h4>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">
                {ephemeralData.transcript || 'Transcript not available yet...'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-2">Voice Tone:</h4>
                <div className="flex items-center bg-gray-50 p-3 rounded-md">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                    ${ephemeralData.voiceTone === 'professional' ? 'bg-green-100 text-green-800' :
                      ephemeralData.voiceTone === 'unprofessional' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'}`}>
                    {ephemeralData.voiceTone || 'Not analyzed'}
                  </span>
                </div>
              </div>
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-2">Voice Pace:</h4>
                <div className="flex items-center bg-gray-50 p-3 rounded-md">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                    ${ephemeralData.voicePace === 'professional' ? 'bg-green-100 text-green-800' :
                      ephemeralData.voicePace === 'fast' ? 'bg-orange-100 text-orange-800' :
                      ephemeralData.voicePace === 'slow' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'}`}>
                    {ephemeralData.voicePace || 'Not analyzed'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis controls */}
      <div className="flex justify-center mb-8">
        <button
          onClick={performGptAnalysis}
          disabled={isAnalyzing || !ephemeralData.transcript}
          className={`px-6 py-3 rounded-lg text-white font-medium transition-all duration-200 ${
            isAnalyzing || !ephemeralData.transcript
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 transform hover:scale-105'
          }`}
        >
          {isAnalyzing ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Analyzing with GPT...
            </div>
          ) : (
            'Start GPT Analysis'
          )}
        </button>
      </div>

      {/* Analysis Results Section - Only shown when analysis is complete */}
      {gptAnalysisResult && (
        <div className="space-y-8 animate-fade-in">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <svg className="w-6 h-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Analysis Results
          </h3>

          {/* Initial Question Analysis Section */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div className="bg-blue-50 px-6 py-4">
              <h4 className="text-lg font-semibold text-blue-900 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Initial Question Analysis (10s)
              </h4>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700 leading-relaxed">{gptAnalysisResult.initialQuestionAnalysis}</p>
            </div>
          </div>

          {/* Five Minute Question Analysis Section */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div className="bg-purple-50 px-6 py-4">
              <h4 className="text-lg font-semibold text-purple-900 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Five Minute Question Analysis
              </h4>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700 leading-relaxed">{gptAnalysisResult.fiveMinuteQuestionAnalysis}</p>
            </div>
          </div>

          {/* Voice Tone Feedback Section */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div className="bg-green-50 px-6 py-4">
              <h4 className="text-lg font-semibold text-green-900 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Voice Tone Feedback
              </h4>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700 leading-relaxed">{gptAnalysisResult.voiceToneFeedback}</p>
            </div>
          </div>

          {/* Voice Pace Feedback Section */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div className="bg-yellow-50 px-6 py-4">
              <h4 className="text-lg font-semibold text-yellow-900 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Voice Pace Feedback
              </h4>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700 leading-relaxed">{gptAnalysisResult.voicePaceFeedback}</p>
            </div>
          </div>

          {/* Overall Summary Section */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div className="bg-red-50 px-6 py-4">
              <h4 className="text-lg font-semibold text-red-900 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Overall Summary
              </h4>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700 leading-relaxed">{gptAnalysisResult.overallSummary}</p>
            </div>
          </div>

          {/* Clear Data Button */}
          <div className="flex justify-end mt-8">
            <button
              onClick={clearEphemeralData}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Session Data
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4 animate-fade-in">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GPTAnalysis; 