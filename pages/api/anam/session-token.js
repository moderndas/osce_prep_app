import { sessionStartLimiter } from '../../../lib/rateLimit';
import initCORS from '../../../lib/cors';
import { safeFetch } from '../../../lib/api-utils';

console.log('[API-token] ANAM_API_KEY:', process.env.ANAM_API_KEY);

export default async function handler(req, res) {
  console.log('--- [ANAM API CALL START] ---');
  console.log('[ANAM_DEBUG] Request received for /api/anam/session-token');
  // console.log('[ANAM_DEBUG] Request body from client:', JSON.stringify(req.body, null, 2)); // Already logged or can be verbose

  // Apply CORS restrictions first
  try {
    await initCORS(req, res);
  } catch (error) {
    console.error('[ANAM_ERROR] CORS validation failed:', error);
    return res.status(403).json({ 
      error: 'CORS Error', 
      message: 'This origin is not allowed to access this resource'
    });
  }

  if (req.method !== 'POST') {
    console.warn(`[ANAM_WARN] Method not allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Apply rate limiting for session starts
    await sessionStartLimiter(req, res);
    
    const { personaConfig } = req.body;
    
    if (!personaConfig || !personaConfig.id) {
      console.error('[ANAM_ERROR] Missing personaConfig.id in request body');
      return res.status(400).json({ 
        error: 'Missing personaId',
        message: 'personaConfig.id is required in the request body'
      });
    }
    
    const personaId = personaConfig.id;
    console.log(`[ANAM_DEBUG] Extracted personaId: ${personaId}`);
    
    // --- Call 1: Get Session Token ---
    const anamSessionTokenUrl = 'https://api.anam.ai/v1/auth/session-token';
    const anamApiRequestBody = {
      personaConfig: {
        personaId: personaId
      },
      sessionOptions: {
        voiceDetection: {
          endOfSpeechSensitivity: 0.3
        }
      }
    };

    console.log(`[ANAM_DEBUG] Preparing to call Anam for session token. URL: ${anamSessionTokenUrl}`);
    console.log('[ANAM_DEBUG] Request body to Anam (session token):', JSON.stringify(anamApiRequestBody, null, 2));
    // console.log('[ANAM_DEBUG] ANAM_API_KEY (first 5 chars for session token call):', process.env.ANAM_API_KEY ? process.env.ANAM_API_KEY.substring(0,5) + '...' : 'NOT SET');


    let tokenResponse;
    let tokenResponseText = '';
    try {
      tokenResponse = await safeFetch(anamSessionTokenUrl, { // Using safeFetch as per current codebase
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.ANAM_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(anamApiRequestBody)
      });
      tokenResponseText = await tokenResponse.text();
      console.log('[ANAM_DEBUG] Raw Anam response status (session token):', tokenResponse.status);
      console.log('[ANAM_DEBUG] Raw Anam response headers (session token):', JSON.stringify(Object.fromEntries(tokenResponse.headers.entries()), null, 2));
      console.log('[ANAM_DEBUG] Raw Anam response body (session token):', tokenResponseText);
    } catch (fetchError) {
      console.error('[ANAM_FATAL_ERROR] Fetch operation itself failed for session token:', fetchError);
      throw new Error(`Network error or issue reaching Anam for session token: ${fetchError.message}`);
    }

    if (!tokenResponse.ok) {
      console.error(`[ANAM_ERROR] Anam API returned error for session token. Status: ${tokenResponse.status}`);
      // The original throw might be caught and cause the "config.skip" if responseText is not JSON
      throw new Error(`Failed to get session token from Anam. Status: ${tokenResponse.status}, Body: ${tokenResponseText}`);
    }

    let tokenData;
    try {
      tokenData = JSON.parse(tokenResponseText);
    } catch (parseError) {
      console.error('[ANAM_ERROR] Failed to parse JSON response from Anam (session token):', parseError);
      console.error('[ANAM_ERROR] Non-JSON response body was:', tokenResponseText);
      throw new Error(`Anam returned non-JSON response for session token. Body: ${tokenResponseText}`);
    }
    
    const sessionToken = tokenData.sessionToken;
    if (!sessionToken) {
      console.error('[ANAM_ERROR] Session token missing in Anam response, even though response was ok.');
      console.error('[ANAM_ERROR] Parsed token data:', JSON.stringify(tokenData, null, 2));
      throw new Error('Session token was not found in Anam\'s response.');
    }
    console.log(`[ANAM_DEBUG] Successfully received sessionToken (ending with ...${sessionToken ? sessionToken.slice(-5) : 'N/A'})`);

    // --- Call 2: Get Persona Details ---
    const anamPersonaDetailsUrl = `https://api.anam.ai/v1/personas/${personaId}`;
    console.log(`[ANAM_DEBUG] Preparing to call Anam for persona details. URL: ${anamPersonaDetailsUrl}`);
    // console.log('[ANAM_DEBUG] ANAM_API_KEY (first 5 chars for persona details call):', process.env.ANAM_API_KEY ? process.env.ANAM_API_KEY.substring(0,5) + '...' : 'NOT SET');

    let personaResponse;
    let personaResponseText = '';
    try {
      personaResponse = await safeFetch(anamPersonaDetailsUrl, { // Using safeFetch
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.ANAM_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      personaResponseText = await personaResponse.text();
      console.log('[ANAM_DEBUG] Raw Anam response status (persona details):', personaResponse.status);
      console.log('[ANAM_DEBUG] Raw Anam response headers (persona details):', JSON.stringify(Object.fromEntries(personaResponse.headers.entries()), null, 2));
      console.log('[ANAM_DEBUG] Raw Anam response body (persona details):', personaResponseText);
    } catch (fetchError) {
      console.error('[ANAM_FATAL_ERROR] Fetch operation itself failed for persona details:', fetchError);
      throw new Error(`Network error or issue reaching Anam for persona details: ${fetchError.message}`);
    }

    if (!personaResponse.ok) {
      console.error(`[ANAM_ERROR] Anam API returned error for persona details. Status: ${personaResponse.status}`);
      throw new Error(`Failed to get persona details from Anam. Status: ${personaResponse.status}, Body: ${personaResponseText}`);
    }

    let personaData;
    try {
      personaData = JSON.parse(personaResponseText);
    } catch (parseError) {
      console.error('[ANAM_ERROR] Failed to parse JSON response from Anam (persona details):', parseError);
      console.error('[ANAM_ERROR] Non-JSON response body was:', personaResponseText);
      throw new Error(`Anam returned non-JSON response for persona details. Body: ${personaResponseText}`);
    }

    console.log('[ANAM_DEBUG] Successfully received personaData.');
    // console.log('[ANAM_DEBUG] Persona data:', JSON.stringify(personaData, null, 2)); // Can be very verbose

    // Return both the session token and persona details
    res.status(200).json({
      sessionToken,
      persona: personaData
    });
  } catch (error) {
    // This is the catch block that likely results in the "config.skip" if 'error.message' is the raw HTML/non-JSON from Anam
    console.error('[ANAM_FATAL_ERROR] Overall error in /api/anam/session-token handler:', error);
    console.error('[ANAM_FATAL_ERROR] Error name:', error.name);
    console.error('[ANAM_FATAL_ERROR] Error message:', error.message);
    if (error.cause) { // Log the cause if it exists
        console.error('[ANAM_FATAL_ERROR] Error cause:', error.cause);
    }
    console.error('[ANAM_FATAL_ERROR] Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to get session token and persona details',
      // Make sure the cause passed to client is a string, not a complex object
      cause: typeof error.message === 'string' ? error.message : 'Internal server processing error. See server logs.'
    });
  } finally {
    console.log('--- [ANAM API CALL END] ---');
  }
} 
