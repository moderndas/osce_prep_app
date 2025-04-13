/**
 * Utility functions for extracting audio from video
 */

/**
 * Extracts audio from a video blob
 * @param {Blob} videoBlob - The video blob to extract audio from
 * @returns {Promise<Blob>} - The audio blob in WAV format
 */
export const extractAudioFromVideo = async (videoBlob) => {
  try {
    if (!videoBlob) throw new Error('No video blob provided');

    // Create audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create video element to load the blob
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoBlob);
    
    // Create media element source
    const source = audioContext.createMediaElementSource(video);
    
    // Create audio destination
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);
    
    // Create MediaRecorder to capture the audio
    const mediaRecorder = new MediaRecorder(destination.stream);
    const audioChunks = [];
    
    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        URL.revokeObjectURL(video.src);
        audioContext.close();
        resolve(audioBlob);
      };
      
      mediaRecorder.onerror = (error) => {
        URL.revokeObjectURL(video.src);
        audioContext.close();
        reject(error);
      };
      
      // Start playing video and recording audio
      video.onloadedmetadata = async () => {
        try {
          await video.play();
          mediaRecorder.start();
          
          // Wait for video to finish
          video.onended = () => {
            mediaRecorder.stop();
            video.remove();
          };
          
          // Set video playback rate to maximum for faster extraction
          video.playbackRate = 2.0;
        } catch (error) {
          reject(error);
        }
      };
      
      video.onerror = () => {
        reject(new Error('Error loading video'));
      };
    });
  } catch (error) {
    console.error('Error extracting audio:', error);
    throw error;
  }
};

/**
 * Gets audio duration from an audio blob
 * @param {Blob} audioBlob - The audio blob
 * @returns {Promise<number>} - The duration in seconds
 */
export const getAudioDuration = async (audioBlob) => {
  try {
    if (!audioBlob) throw new Error('No audio blob provided');
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    await audioContext.close();
    return audioBuffer.duration;
  } catch (error) {
    console.error('Error getting audio duration:', error);
    throw error;
  }
};

/**
 * Converts audio blob to base64 string for API transmission
 * @param {Blob} audioBlob - The audio blob to convert
 * @returns {Promise<string>} - Base64 encoded audio data
 */
export const audioToBase64 = (audioBlob) => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(',')[1];
        resolve(base64data);
      };
      reader.onerror = () => reject(new Error('Error reading audio file'));
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Error converting audio to base64:', error);
      reject(error);
    }
  });
}; 