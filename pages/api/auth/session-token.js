import { NextResponse } from 'next/server';

export async function GET() {
  console.log('[Session Token API] Starting session token request...');
  
  try {
    const apiKey = process.env.ANAM_API_KEY;
    // Use the specific persona ID as fallback if env var is not set
    const personaId = process.env.NEXT_PUBLIC_PERSONA_ID || "66ccab16-8fb1-4ef2-99ec-78f28a492bba";

    // Enhanced credentials validation
    const credentialsCheck = {
      apiKey: {
        exists: !!apiKey,
        length: apiKey?.length || 0,
        format: apiKey?.startsWith('sk_') || false
      },
      personaId: {
        value: personaId,
        source: process.env.NEXT_PUBLIC_PERSONA_ID ? 'env' : 'fallback',
        format: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(personaId)
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasAnamApiKey: !!process.env.ANAM_API_KEY,
        hasPersonaId: !!process.env.NEXT_PUBLIC_PERSONA_ID
      }
    };

    console.log('[Session Token API] Credentials validation:', JSON.stringify(credentialsCheck, null, 2));

    if (!credentialsCheck.apiKey.exists) {
      console.error('[Session Token API] API key not configured');
      return NextResponse.json({ 
        error: 'API key not configured',
        details: 'ANAM_API_KEY environment variable is missing or empty',
        validation: credentialsCheck
      }, { status: 500 });
    }

    if (!credentialsCheck.apiKey.format) {
      console.error('[Session Token API] Invalid API key format');
      return NextResponse.json({ 
        error: 'Invalid API key format',
        details: 'API key should start with "sk_"',
        validation: credentialsCheck
      }, { status: 500 });
    }

    if (!credentialsCheck.personaId.format) {
      console.error('[Session Token API] Invalid persona ID format');
      return NextResponse.json({ 
        error: 'Invalid persona ID format',
        details: 'Persona ID must be a valid UUID',
        validation: credentialsCheck
      }, { status: 400 });
    }

    // Enhanced request payload with explicit persona ID
    const requestPayload = {
      personaConfig: {
        id: "66ccab16-8fb1-4ef2-99ec-78f28a492bba" // Using the specific persona ID
      }
    };

    console.log('[Session Token API] Request payload:', JSON.stringify(requestPayload, null, 2));
    
    console.log('[Session Token API] Making request to Anam API...');
    const startTime = Date.now();
    
    const response = await fetch("https://api.anam.ai/v1/auth/session-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestPayload),
    });

    const duration = Date.now() - startTime;
    console.log('[Session Token API] Anam API response:', {
      status: response.status,
      statusText: response.statusText,
      duration: `${duration}ms`,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Session Token API] Anam API error:', {
        status: response.status,
        error,
        requestPayload
      });
      return NextResponse.json(
        { 
          error: 'Failed to get session token from Anam API', 
          details: error,
          requestInfo: {
            status: response.status,
            statusText: response.statusText,
            requestPayload
          }
        }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Enhanced token validation
    if (!data.sessionToken) {
      console.error('[Session Token API] Missing session token in response:', data);
      return NextResponse.json(
        { 
          error: 'Invalid response from Anam API', 
          details: 'Response is missing sessionToken field',
          response: data,
          requestPayload
        }, 
        { status: 500 }
      );
    }

    // Add detailed token validation logging
    console.log('[Session Token API] Token validation:', {
      tokenPresent: !!data.sessionToken,
      tokenLength: data.sessionToken.length,
      tokenType: typeof data.sessionToken,
      responseStructure: Object.keys(data),
      responseTime: `${duration}ms`,
      requestPayload
    });

    return NextResponse.json({ 
      sessionToken: data.sessionToken,
      metadata: {
        personaId: requestPayload.personaConfig.id,
        timestamp: new Date().toISOString(),
        responseTime: duration,
        tokenValidation: {
          length: data.sessionToken.length,
          type: typeof data.sessionToken
        }
      }
    });

  } catch (error) {
    console.error('[Session Token API] Unexpected error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        type: error.name
      }, 
      { status: 500 }
    );
  }
} 