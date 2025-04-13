import { NextResponse } from 'next/server';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to get GPT analysis');
    }

    const gptResponse = await response.json();
    const analysisContent = gptResponse.choices[0]?.message?.content;

    if (!analysisContent) {
      throw new Error('No analysis content received from GPT');
    }

    return res.status(200).json({ analysis: analysisContent });
  } catch (error) {
    console.error('GPT Analysis error:', error);
    return res.status(500).json({ error: error.message });
  }
} 