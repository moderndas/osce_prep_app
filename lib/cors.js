import Cors from 'cors';

// List of allowed origins
const allowedOrigins = [
  // Add your production domain(s)
  process.env.NEXT_PUBLIC_VERCEL_URL,
  'https://osceprepapp.com', 
  'https://www.osceprepapp.com',
  // Add localhost for development
  'http://localhost:3000'
].filter(Boolean); // Remove any undefined values

// Initialize the CORS middleware with restrictive settings
const cors = Cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Check if the origin is in our allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true, // Allow cookies to be sent with requests
  maxAge: 86400 // Cache preflight requests for 24 hours
});

// Helper method to initialize and apply CORS middleware
export function initCORS(req, res) {
  return new Promise((resolve, reject) => {
    cors(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default initCORS; 