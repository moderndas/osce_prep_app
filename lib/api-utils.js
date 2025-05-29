/**
 * Utility functions for making API calls with SSRF protection
 */
const axios = require('axios');
const { validateUrl } = require('./ssrf-protection');

/**
 * Make a fetch request with SSRF protection
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 * @throws {Error} - If URL is invalid or fails SSRF validation
 */
async function safeFetch(url, options = {}) {
  // Validate URL against SSRF vulnerabilities
  const validation = await validateUrl(url);
  
  if (!validation.valid) {
    throw new Error(`SSRF protection: ${validation.error}`);
  }
  
  // URL is safe, proceed with fetch
  return fetch(validation.url.toString(), options);
}

/**
 * Make an Axios request with SSRF protection
 * @param {string} url - The URL to request
 * @param {Object} options - Axios request config
 * @returns {Promise<AxiosResponse>} - Axios response
 * @throws {Error} - If URL is invalid or fails SSRF validation
 */
async function safeAxios(url, options = {}) {
  // Validate URL against SSRF vulnerabilities
  const validation = await validateUrl(url);
  
  if (!validation.valid) {
    throw new Error(`SSRF protection: ${validation.error}`);
  }
  
  // URL is safe, proceed with axios request
  return axios({
    url: validation.url.toString(),
    ...options
  });
}

module.exports = {
  safeFetch,
  safeAxios
}; 