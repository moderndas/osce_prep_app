export default async function handler(req, res) {
  // only reject non-POST methods
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // now this code will actually run for POST requests
    const personaId = process.env.NEXT_PUBLIC_PERSONA_ID
      || '717207e2-aa3a-409e-9fe6-3b240cfc26d0';

    const payload = { personaConfig: { id: personaId } };
    console.log('[SessionToken] Sending payload', payload);

    const tokenResponse = await fetch(
      'https://api.anam.ai/v1/auth/session-token',
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${process.env.ANAM_API_KEY}`
        },
        body: JSON.stringify(payload),
      }
    );

    const text = await tokenResponse.text();
    console.log('[SessionToken] Response status', tokenResponse.status, 'body', text);

    if (!tokenResponse.ok) {
      // forward the real error to the client
      return res.status(tokenResponse.status).json({ error: text });
    }

    const { sessionToken } = JSON.parse(text);
    return res.status(200).json({ sessionToken });

  } catch (error) {
    console.error('[SessionToken] Unexpected error', error);
    return res.status(500).json({ error: error.message });
  }
} 