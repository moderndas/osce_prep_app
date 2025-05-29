const path = require('path');

/**
 * Safely resolve a file path to prevent path traversal attacks
 * @param {string} basePath - The base directory path (safe location)
 * @param {string} userPath - The user-provided path that needs to be sanitized
 * @returns {string|null} - The safely resolved absolute path, or null if unsafe
 */
export function safePathResolve(basePath, userPath) {
  // Normalize the base path
  const normalizedBasePath = path.normalize(basePath);
  
  // Attempt to resolve the complete path
  const resolvedPath = path.resolve(normalizedBasePath, userPath);
  
  // Check if the resolved path starts with the normalized base path
  // If not, it means the path has traversed outside the intended directory
  if (!resolvedPath.startsWith(normalizedBasePath)) {
    return null; // Path traversal detected, return null
  }
  
  // Return the safely resolved path
  return resolvedPath;
}

/**
 * Middleware to prevent path traversal in file access
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @param {string} basePath - The base directory path (safe location)
 */
export function pathTraversalProtection(req, res, next, basePath) {
  // Get the path from request parameters or query
  const userPath = req.params.path || req.query.path || '';
  
  if (userPath) {
    const safePath = safePathResolve(basePath, userPath);
    
    // If path is unsafe, return an error
    if (!safePath) {
      return res.status(400).json({
        success: false,
        message: 'Invalid path'
      });
    }
    
    // Add the safe path to the request object for use in route handlers
    req.safePath = safePath;
  }
  
  // Continue to the next middleware
  if (typeof next === 'function') {
    next();
  }
}

export default {
  safePathResolve,
  pathTraversalProtection
}; 