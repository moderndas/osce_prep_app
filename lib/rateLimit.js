import rateLimit from 'express-rate-limit';

/**
 * Create a rate limiter middleware that can be used in API routes
 * 
 * @param {Object} options - Rate limiter configuration options
 * @returns {Function} Rate limiter middleware
 */
export function createRateLimiter(options = {}) {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes by default
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { 
      error: 'Too many requests, please try again later.' 
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Skip rate limiting in development by providing a function
    skip: (req, res) => process.env.NODE_ENV === 'development',
    ...options
  };

  const limiter = rateLimit(defaultOptions);

  // Return a middleware that works with Next.js API routes
  return async function nextApiRateLimit(req, res) {
    return new Promise((resolve, reject) => {
      limiter(req, res, (result) => {
        if (result instanceof Error) {
          return reject(result);
        }
        return resolve(result);
      });
    });
  };
}

// Pre-configured rate limiters for common scenarios
// These will now be skipped in development due to the above `skip` function
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: { 
    error: 'Too many login attempts. Please try again after 15 minutes.' 
  }
});

export const signupLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 accounts per hour per IP
  message: { 
    error: 'Too many accounts created from this IP. Please try again after an hour.' 
  }
});

export const stationCreationLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 station creations per minute
  message: { 
    error: 'Rate limit exceeded. You can only create up to 5 stations per minute.' 
  }
});

export const sessionStartLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 station sessions per minute per user
  message: { 
    error: 'You can only start 5 station sessions per minute. Please wait before trying again.' 
  }
});

export const apiLimiter = createRateLimiter(); // Default settings for general API endpoints 