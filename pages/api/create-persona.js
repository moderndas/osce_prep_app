export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const response = await fetch("https://api.anam.ai/v1/personas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_ANAM_API_KEY}`
      },
      body: JSON.stringify({
        name: "Leo",
        avatarId: "121d5df1-3f3e-4a48-a237-8ff488e9eed8",
        voiceId: "b7274f87-8b72-4c5b-bf52-954768b28c75",
        brainType: "ANAM_LLAMA_v3_3_70B_V1",
        brain: {
          systemPrompt: "You are Leo, a virtual receptionist. You are friendly, professional, and helpful. You assist users with their queries in a courteous manner."
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create persona');
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error creating persona:', error);
    return res.status(500).json({ message: error.message });
  }
} 