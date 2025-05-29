import xss from 'xss';
import validator from 'validator';

/**
 * Sanitizes a string to prevent XSS attacks
 * @param {string} input - The string to sanitize
 * @returns {string} The sanitized string
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Remove dangerous HTML and scripts
  return xss(input.trim());
}

/**
 * Sanitizes an email address
 * @param {string} email - The email to sanitize
 * @returns {string} The sanitized email or empty string if invalid
 */
export function sanitizeEmail(email) {
  if (typeof email !== 'string') {
    return '';
  }
  
  const sanitized = email.trim().toLowerCase();
  
  if (validator.isEmail(sanitized)) {
    return sanitized;
  }
  
  return '';
}

/**
 * Sanitizes an object by sanitizing all string properties
 * @param {Object} obj - The object to sanitize
 * @returns {Object} The sanitized object
 */
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Sanitize request body
 * @param {Object} req - Express request object
 */
export function sanitizeRequestBody(req) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
}

/**
 * Middleware to sanitize all incoming request data
 */
export function sanitizeMiddleware(req, res, next) {
  // Sanitize query parameters
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key]);
      }
    }
  }
  
  // Sanitize request body
  sanitizeRequestBody(req);
  
  // Continue to the next middleware or route handler
  if (typeof next === 'function') {
    next();
  }
} 