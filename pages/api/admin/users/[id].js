import { requireAdmin } from '../../../../lib/auth';
import dbConnect from '../../../../lib/db';
import User from '../../../../models/User';

/**
 * Admin-only API endpoint for managing a specific user
 * GET: Retrieve a specific user
 * PATCH: Update a user (e.g., change role)
 * DELETE: Delete a user
 */
export default async function handler(req, res) {
  // Check if the user is an admin
  const session = await requireAdmin(req, res);
  if (!session) return; // requireAdmin already sends the appropriate error response
  
  // Get user ID from the URL
  const { id } = req.query;
  
  // Connect to database
  await dbConnect();
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      try {
        const user = await User.findById(id).select('-password');
        
        if (!user) {
          return res.status(404).json({ 
            success: false, 
            message: 'User not found' 
          });
        }
        
        return res.status(200).json({ 
          success: true, 
          user 
        });
      } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Server error' 
        });
      }
      
    case 'PATCH':
      try {
        const { role } = req.body;
        
        // Validate the role
        if (role && !['user', 'admin'].includes(role)) {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid role. Must be either "user" or "admin".' 
          });
        }
        
        // Find and update the user
        const updatedUser = await User.findByIdAndUpdate(
          id, 
          { role }, 
          { new: true, runValidators: true }
        ).select('-password');
        
        if (!updatedUser) {
          return res.status(404).json({ 
            success: false, 
            message: 'User not found' 
          });
        }
        
        return res.status(200).json({ 
          success: true, 
          user: updatedUser 
        });
      } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Server error' 
        });
      }
      
    case 'DELETE':
      try {
        // Protect against deleting your own account
        if (id === session.user.id) {
          return res.status(400).json({ 
            success: false, 
            message: 'You cannot delete your own account while logged in.' 
          });
        }
        
        // Find and delete the user
        const deletedUser = await User.findByIdAndDelete(id);
        
        if (!deletedUser) {
          return res.status(404).json({ 
            success: false, 
            message: 'User not found' 
          });
        }
        
        return res.status(200).json({ 
          success: true, 
          message: 'User deleted successfully' 
        });
      } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Server error' 
        });
      }
      
    default:
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
      return res.status(405).json({ 
        success: false, 
        message: `Method ${req.method} not allowed` 
      });
  }
} 