import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const analyzeStationPerformance = async (stationData, ephemeralData) => {
  try {
    const { transcript, voiceAnalysis } = ephemeralData;
    const { name, description, objectives, rubric } = stationData;

    // Construct the prompt for GPT
    const systemPrompt = `You are an expert medical examiner evaluating an OSCE station performance. 
    Analyze the following data and provide a detailed assessment based on the station objectives and rubric.
    
    Station: ${name}
    Description: ${description}
    Objectives: ${objectives}
    Rubric: ${JSON.stringify(rubric)}`;

    const userPrompt = `Please analyze this performance:
    
    Transcript: ${transcript}
    
    ${voiceAnalysis ? `Voice Analysis:
    - Tone: ${voiceAnalysis.tone}
    - Pace: ${voiceAnalysis.pace}
    - Words per minute: ${voiceAnalysis.details?.wordsPerMinute}
    - Sentiment distribution: 
      * Positive segments: ${voiceAnalysis.details?.positiveSegments}
      * Neutral segments: ${voiceAnalysis.details?.neutralSegments}
      * Negative segments: ${voiceAnalysis.details?.negativeSegments}` : ''}
    
    Provide a detailed assessment including:
    1. Overall Performance Score (0-100)
    2. Strengths
    3. Areas for Improvement
    4. Specific Feedback on:
       - Communication Skills
       - Clinical Knowledge
       - Professional Behavior
    5. Recommendations for Improvement`;

    // Call GPT-4 for analysis
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    // Extract and structure the response
    const analysis = completion.choices[0].message.content;

    return {
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('GPT Analysis error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}; 