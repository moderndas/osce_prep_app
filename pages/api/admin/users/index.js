import { requireAdmin } from '../../../../lib/auth';
import dbConnect from '../../../../lib/db';
import User from '../../../../models/User';

/**
 * Admin-only API endpoint for user management
 * GET: Retrieve all users
 * POST: Create a new user (optional)
 */
export default async function handler(req, res) {
  // Check if the user is an admin
  const session = await requireAdmin(req, res);
  if (!session) return; // requireAdmin already sends the appropriate error response
  
  // Connect to database
  await dbConnect();
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      try {
        // Fetch all users
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        
        return res.status(200).json({ 
          success: true, 
          users 
        });
      } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Server error' 
        });
      }
      
    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ 
        success: false, 
        message: `Method ${req.method} not allowed` 
      });
  }
} 