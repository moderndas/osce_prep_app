import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, temperature = 0.7 } = req.body;

    // Create a streaming response from OpenAI
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature,
      stream: true,
    });

    // Set headers for streaming response
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream the response
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(content);
      }
    }

    res.end();
  } catch (error) {
    console.error("OpenAI streaming error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message || "Server error" });
    }
  }
} 