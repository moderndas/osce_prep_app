import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/db';
import User from '../../../models/User';

/**
 * API endpoint for users to update their own information
 * This allows users to update their profile details including email
 */
export default async function handler(req, res) {
  // Only allow PUT method
  if (req.method !== 'PUT') {
    return res.status(405).json({ 
      success: false, 
      message: `Method ${req.method} not allowed` 
    });
  }

  try {
    // Get the authenticated user's session
    const session = await getServerSession(req, res, authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    // Connect to database
    await dbConnect();
    
    // Get the user's ID from the session
    const userId = session.user.id;
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const { name, email } = req.body;
    
    // Update user information
    // Only update fields that are provided in the request
    if (name) user.name = name;
    
    // If email is being changed, check if it's already in use by another account
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== userId) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use by another account'
        });
      }
      user.email = email;
    }
    
    // Save the updated user
    await user.save();
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'User information updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 