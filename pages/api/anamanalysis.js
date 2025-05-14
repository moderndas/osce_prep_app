import { analysisPrompt } from '../../src/config/analysisConfig';
import OpenAI from 'openai';

export default async function handler(req, res) {
  const { userTurns } = req.body;
  const messages = [
    { role: 'system', content: analysisPrompt },
    ...userTurns.map(t => ({ role: 'user', content: t }))
  ];
  const openai = new OpenAI();
  const { choices } = await openai.chat.completions.create({
    model: 'gpt-4',
    messages,
    temperature: 0
  });
  res.status(200).json({ analysis: choices[0].message.content });
} 