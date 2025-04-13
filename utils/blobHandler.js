/**
 * Utility functions for handling video blobs
 */

/**
 * Converts a video file to a blob
 * @param {File} file - The video file to convert
 * @returns {Promise<Blob>} - The video blob
 */
export const fileToBlob = async (file) => {
  try {
    if (!file) throw new Error('No file provided');
    if (!file.type.startsWith('video/')) throw new Error('File must be a video');
    
    const arrayBuffer = await file.arrayBuffer();
    return new Blob([arrayBuffer], { type: file.type });
  } catch (error) {
    console.error('Error converting file to blob:', error);
    throw error;
  }
};

/**
 * Creates an object URL from a blob
 * @param {Blob} blob - The blob to create a URL for
 * @returns {string} - The object URL
 */
export const createBlobUrl = (blob) => {
  try {
    if (!blob) throw new Error('No blob provided');
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error creating blob URL:', error);
    throw error;
  }
};

/**
 * Revokes a blob URL to free up memory
 * @param {string} url - The URL to revoke
 */
export const revokeBlobUrl = (url) => {
  try {
    if (!url) throw new Error('No URL provided');
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error revoking blob URL:', error);
    // Don't throw here as this is typically called in cleanup
  }
};

/**
 * Gets the duration of a video blob
 * @param {Blob} blob - The video blob
 * @returns {Promise<number>} - The duration in seconds
 */
export const getVideoDuration = (blob) => {
  return new Promise((resolve, reject) => {
    try {
      if (!blob) throw new Error('No blob provided');
      
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        resolve(video.duration);
        URL.revokeObjectURL(video.src);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Error loading video metadata'));
      };
      
      video.src = URL.createObjectURL(blob);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Gets metadata from a video blob
 * @param {Blob} blob - The video blob
 * @returns {Promise<Object>} - The video metadata
 */
export const getVideoMetadata = async (blob) => {
  try {
    if (!blob) throw new Error('No blob provided');
    
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    return new Promise((resolve, reject) => {
      video.onloadedmetadata = () => {
        const metadata = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          aspectRatio: video.videoWidth / video.videoHeight,
        };
        URL.revokeObjectURL(video.src);
        resolve(metadata);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Error loading video metadata'));
      };
      
      video.src = URL.createObjectURL(blob);
    });
  } catch (error) {
    console.error('Error getting video metadata:', error);
    throw error;
  }
}; 