console.log('[API-token] ANAM_API_KEY:', process.env.ANAM_API_KEY);

export default async function handler(req, res) {
  console.log('[API-token] Request body:', req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // First get the session token
    const tokenResponse = await fetch('https://api.anam.ai/v1/auth/session-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ANAM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personaConfig: {
          personaId: "717207e2-aa3a-409e-9fe6-3b240cfc26d0"
        }
      })
    });

    const responseText = await tokenResponse.text();
    console.log('[API-token] Anam responded:', responseText);

    if (!tokenResponse.ok) {
      console.error('Anam session token error:', responseText);
      throw new Error('Failed to get session token');
    }

    const tokenData = JSON.parse(responseText);
    const sessionToken = tokenData.sessionToken;

    // Then get the persona details
    const personaResponse = await fetch(`https://api.anam.ai/v1/personas/717207e2-aa3a-409e-9fe6-3b240cfc26d0`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.ANAM_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!personaResponse.ok) {
      const error = await personaResponse.text();
      console.error('Anam persona details error:', error);
      throw new Error('Failed to get persona details');
    }

    const personaData = await personaResponse.json();

    // Return both the session token and persona details
    return res.status(200).json({
      sessionToken,
      persona: personaData
    });
  } catch (error) {
    console.error('Error in Anam API:', error);
    return res.status(500).json({
      error: 'Failed to get session token and persona details',
      cause: error.message
    });
  }
} 