import { analysisPrompt as defaultAnalysisPrompt } from '../../src/config/analysisConfig';
import OpenAI from 'openai';

export default async function handler(req, res) {
  const { userTurns, analysisPrompt } = req.body;
  
  // Use the provided analysisPrompt or fall back to the default
  const promptToUse = analysisPrompt || defaultAnalysisPrompt;
  
  const messages = [
    { role: 'system', content: promptToUse },
    ...userTurns.map(t => ({ role: 'user', content: t }))
  ];
  
  const openai = new OpenAI();
  const { choices } = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    temperature: 0
  });
  
  res.status(200).json({ analysis: choices[0].message.content });
} 