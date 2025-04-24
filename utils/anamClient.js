import { createClient } from "@anam-ai/js-sdk";

let anamClient = null;
let personaDetails = null;

export const initializeAnamClient = async () => {
  try {
    // Get session token and persona details from our API endpoint
    const response = await fetch('/api/anam/session-token', {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to get session token and persona details');
    }
    
    const data = await response.json();
    const { sessionToken, persona } = data;
    
    // Store persona details
    personaDetails = persona;
    
    // Initialize the Anam client with the session token
    anamClient = createClient(sessionToken);
    return { client: anamClient, persona: personaDetails };
  } catch (error) {
    console.error('Error initializing Anam client:', error);
    throw error;
  }
};

export const getAnamClient = () => {
  if (!anamClient) {
    throw new Error('Anam client not initialized. Call initializeAnamClient first.');
  }
  return anamClient;
};

export const getPersonaDetails = () => {
  if (!personaDetails) {
    throw new Error('Persona details not available. Call initializeAnamClient first.');
  }
  return personaDetails;
}; 