import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // In Pages-Router API routes, Next.js has already parsed JSON bodies for you
    const { messages, temperature = 0.7 } = req.body;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",    // or whatever model you want
      messages,
      temperature,
    });

    // send back your trimmed reply
    const reply = completion.choices[0].message.content.trim();
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("OpenAI error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}