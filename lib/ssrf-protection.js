const { URL } = require('url');
const dns = require('dns');
const { promisify } = require('util');

const dnsLookup = promisify(dns.lookup);

/**
 * List of allowed domains for outgoing requests
 * Add all trusted domains to this list
 */
const ALLOWED_DOMAINS = [
  'api.openai.com',
  'api.anam.ai',
  'api.stripe.com',
  'api.assemblyai.com',
  'api.elevenlabs.io',
  // Add other trusted API domains as needed
];

/**
 * Regex patterns for private IP ranges
 */
const PRIVATE_IP_PATTERNS = [
  /^127\./,                // 127.0.0.0/8 (localhost)
  /^10\./,                 // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
  /^192\.168\./,           // 192.168.0.0/16
  /^169\.254\./,           // 169.254.0.0/16 (link local)
  /^::1$/,                 // localhost IPv6
  /^fc00:/,                // IPv6 private range
  /^fd/                    // IPv6 private range
];

/**
 * Parse and validate a URL string
 * @param {string} urlString - The URL to validate
 * @returns {URL|null} - Parsed URL object or null if invalid
 */
function parseUrl(urlString) {
  try {
    const url = new URL(urlString);
    
    // Only allow http and https protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    
    return url;
  } catch (error) {
    // URL parsing failed
    return null;
  }
}

/**
 * Check if a domain is in the allowed list
 * @param {string} domain - The domain to check
 * @returns {boolean} - True if domain is allowed
 */
function isAllowedDomain(domain) {
  return ALLOWED_DOMAINS.some(allowedDomain => {
    // Allow exact matches and subdomains of allowed domains
    return domain === allowedDomain || 
           domain.endsWith(`.${allowedDomain}`);
  });
}

/**
 * Check if an IP address is private
 * @param {string} ip - The IP address to check
 * @returns {boolean} - True if the IP is private
 */
function isPrivateIP(ip) {
  return PRIVATE_IP_PATTERNS.some(pattern => pattern.test(ip));
}

/**
 * Validate a URL for SSRF protection
 * @param {string} urlString - The URL to validate
 * @returns {Promise<{valid: boolean, url?: URL, error?: string}>} - Validation result
 */
async function validateUrl(urlString) {
  // Parse the URL
  const url = parseUrl(urlString);
  if (!url) {
    return { valid: false, error: 'Invalid URL format' };
  }
  
  // Validate hostname (domain)
  const hostname = url.hostname;
  
  // Check if domain is in allowed list
  if (!isAllowedDomain(hostname)) {
    return { valid: false, error: 'Domain not in allowed list' };
  }

  try {
    // Resolve hostname to IP
    const { address } = await dnsLookup(hostname);
    
    // Check if IP is private
    if (isPrivateIP(address)) {
      return { valid: false, error: 'URL resolves to a private IP address' };
    }
    
    // URL is valid and safe
    return { valid: true, url };
    
  } catch (error) {
    return { valid: false, error: 'Failed to resolve hostname' };
  }
}

/**
 * Express middleware for SSRF protection
 * @param {string} paramName - The name of the parameter containing the URL
 * @returns {Function} - Express middleware function
 */
function ssrfProtectionMiddleware(paramName = 'url') {
  return async (req, res, next) => {
    // Get URL from request parameters, query or body
    const urlString = req.params[paramName] || req.query[paramName] || 
                     (req.body && req.body[paramName]);
    
    if (!urlString) {
      return next();
    }
    
    try {
      const validation = await validateUrl(urlString);
      
      if (!validation.valid) {
        return res.status(403).json({
          success: false,
          message: `SSRF protection: ${validation.error}`
        });
      }
      
      // Add validated URL to request object
      req.validatedUrl = validation.url;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'URL validation error'
      });
    }
  };
}

module.exports = {
  parseUrl,
  validateUrl,
  isAllowedDomain,
  isPrivateIP,
  ssrfProtectionMiddleware
}; 