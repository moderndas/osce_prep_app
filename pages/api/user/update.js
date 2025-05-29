import { requireAuth } from '../../../lib/auth-clerk';
import dbConnect from '../../../lib/db';
import User from '../../../models/User';
import { sanitizeString } from '../../../lib/sanitize';
import { createClerkClient } from '@clerk/nextjs/server';

/**
 * API endpoint for users to update their own information
 * Users are automatically created on first auth, so this just updates existing records
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
    // Check if Clerk secret key is available
    if (!process.env.CLERK_SECRET_KEY) {
      console.error('❌ CLERK_SECRET_KEY environment variable is not set');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error. Please contact support.'
      });
    }

    // Create Clerk client instance
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Get authenticated user (automatically creates MongoDB user if needed)
    const auth = await requireAuth(req, res);
    if (!auth) return;

    // Connect to database
    await dbConnect();
    
    // User should already exist from requireAuth, but just in case
    let mongoUserInstance = auth.user;
    const clerkUserId = auth.userId;
    
    if (!mongoUserInstance) {
      return res.status(404).json({ success: false, message: 'User not found in database.' });
    }
    
    const { name } = req.body;
    
    const newSanitizedName = sanitizeString(name);
    
    if (!newSanitizedName) {
      return res.status(400).json({ success: false, message: 'Name cannot be empty.' });
    }

    // Proceed only if the name has actually changed
    if (newSanitizedName === mongoUserInstance.name) {
      return res.status(200).json({
        success: true,
        message: 'No changes detected in name.',
        user: {
          id: mongoUserInstance._id,
          clerkUserId: mongoUserInstance.clerkUserId,
          name: mongoUserInstance.name,
          email: mongoUserInstance.email,
          role: mongoUserInstance.role
        }
      });
    }

    // Prepare name parts for Clerk
    let clerkFirstName = newSanitizedName;
    let clerkLastName = '';
    const nameParts = newSanitizedName.trim().split(' ');
    if (nameParts.length > 1) {
      clerkFirstName = nameParts.slice(0, -1).join(' ');
      clerkLastName = nameParts[nameParts.length - 1];
    } else {
      clerkFirstName = newSanitizedName; // Use full name as first name if only one word
    }

    // Update Clerk user
    try {
      console.log('🔄 Updating Clerk user:', clerkUserId, { firstName: clerkFirstName, lastName: clerkLastName });
      
      if (!clerkClient || !clerkClient.users) {
        throw new Error('clerkClient is not properly initialized');
      }
      
      await clerkClient.users.updateUser(clerkUserId, {
        firstName: clerkFirstName,
        lastName: clerkLastName,
      });
      
      console.log('✅ Successfully updated Clerk user');
    } catch (clerkError) {
      console.error('❌ Error updating user name in Clerk:', clerkError);
      const errorMessage = clerkError.errors?.[0]?.longMessage || clerkError.errors?.[0]?.message || clerkError.message || 'Failed to update name in Clerk.';
      return res.status(500).json({
        success: false,
        message: errorMessage
      });
    }

    // Update user name in MongoDB
    mongoUserInstance.name = newSanitizedName;

    try {
      await mongoUserInstance.save();
      console.log('✅ Successfully updated MongoDB user');
    } catch (dbError) {
      console.error("❌ Error saving updated name to MongoDB:", dbError);
      // Potentially attempt to revert Clerk change or log for manual reconciliation
      return res.status(500).json({ 
        success: false, 
        message: "Name was updated in the authentication system, but saving to the local database failed. Please contact support.",
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Name updated successfully.',
      user: {
        id: mongoUserInstance._id,
        clerkUserId: mongoUserInstance.clerkUserId,
        name: mongoUserInstance.name,
        email: mongoUserInstance.email,
        role: mongoUserInstance.role
      }
    });
    
  } catch (error) {
    console.error('❌ Overall error in /api/user/update (name update):', error);
    // Catch errors from requireAuth or dbConnect or any other unexpected ones
    return res.status(500).json({ 
      success: false, 
      message: 'A server error occurred while updating user name.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 