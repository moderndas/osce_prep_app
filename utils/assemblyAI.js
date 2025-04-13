import axios from 'axios';

const ASSEMBLY_AI_KEY = 'e95b8669c1e44411b5cf68953f2a5b08';

const assemblyAI = axios.create({
  baseURL: 'https://api.assemblyai.com/v2',
  headers: {
    authorization: ASSEMBLY_AI_KEY,
    'content-type': 'application/json',
  },
});

export const uploadAudio = async (audioBlob) => {
  try {
    const uploadResponse = await assemblyAI.post('/upload', audioBlob);
    return uploadResponse.data.upload_url;
  } catch (error) {
    console.error('Audio upload error:', error);
    throw new Error('Failed to upload audio');
  }
};

export const transcribeAudio = async (audioUrl) => {
  try {
    const transcriptResponse = await assemblyAI.post('/transcript', {
      audio_url: audioUrl,
      language_code: 'en'
    });
    return transcriptResponse.data.id;
  } catch (error) {
    console.error('Transcription error:', error);
    throw new Error('Failed to start transcription');
  }
};

export const getTranscriptionResult = async (transcriptId) => {
  try {
    const response = await assemblyAI.get(`/transcript/${transcriptId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting transcription:', error);
    throw new Error('Failed to get transcription result');
  }
}; 