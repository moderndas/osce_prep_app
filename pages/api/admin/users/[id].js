import { requireAdmin } from '../../../../lib/auth-clerk';
import dbConnect from '../../../../lib/db';
import User from '../../../../models/User';
import { sanitizeString, sanitizeEmail } from '../../../../lib/sanitize';

/**
 * Admin-only API endpoint for managing a specific user
 * GET - Get user details
 * PUT - Update user details  
 * DELETE - Delete a user
 */
export default async function handler(req, res) {
  // Check if the user is an admin
  const session = await requireAdmin(req, res);
  if (!session) return; // requireAdmin already sends the appropriate error response

  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required'
    });
  }

  await dbConnect();

  if (req.method === 'GET') {
    try {
      const user = await User.findById(id).select('-password');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        data: user
      });

    } catch (error) {
      console.error('Admin user GET error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user'
      });
    }

  } else if (req.method === 'PUT') {
    try {
      const { name, email, role } = req.body;

      // Find the user
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Sanitize inputs
      const sanitizedName = name ? sanitizeString(name) : user.name;
      const sanitizedEmail = email ? sanitizeEmail(email) : user.email;

      // Validate role if provided
      if (role && !['user', 'admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be either "user" or "admin".'
        });
      }

      // Check if email is already in use by another user
      if (sanitizedEmail !== user.email) {
        const existingUser = await User.findOne({ 
          email: sanitizedEmail, 
          _id: { $ne: id } 
        });
        
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email already in use by another user'
          });
        }
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        id,
        {
          name: sanitizedName,
          email: sanitizedEmail,
          ...(role && { role })
        },
        { new: true, runValidators: true }
      ).select('-password');

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser
      });

    } catch (error) {
      console.error('Admin user PUT error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user'
      });
    }

  } else if (req.method === 'DELETE') {
    try {
      const user = await User.findById(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Prevent admin from deleting themselves
      if (user.clerkUserId === session.userId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
      }

      await User.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error) {
      console.error('Admin user DELETE error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      });
    }

  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed`
    });
  }
} 