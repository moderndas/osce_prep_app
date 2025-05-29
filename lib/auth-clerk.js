import { getAuth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import dbConnect from './db';
import User from '../models/User';

/**
 * Create or update user in MongoDB from Clerk webhook data
 * This is optimized for webhooks - uses data directly from webhook payload
 * No additional API calls to Clerk needed
 * @param {Object} webhookData - The webhook data from Clerk
 * @returns {Promise<Object>} The MongoDB user object
 */
export async function createUserFromWebhook(webhookData) {
  await dbConnect();
  
  const { id: clerkUserId, email_addresses, first_name, last_name } = webhookData;
  
  // Extract email and name from webhook data
  const email = email_addresses?.[0]?.email_address || '';
  const name = `${first_name || ''} ${last_name || ''}`.trim() || 'User';
  
  if (!email) {
    throw new Error('Email is required from webhook data');
  }
  
  // Check if user already exists in MongoDB with clerkUserId
  let user = await User.findOne({ clerkUserId });
  
  if (user) {
    // Update existing user with latest data from webhook
    user.email = email;
    user.name = name;
    
    // Ensure admin role is preserved/assigned
    const shouldBeAdmin = isAdminEmail(email);
    if (shouldBeAdmin && user.role !== 'admin') {
      user.role = 'admin';
    }
    
    await user.save();
    console.log(`✅ Updated existing MongoDB user from webhook: ${email} (${user.role})`);
    return user;
  }
  
  // Check if there's an existing MongoDB user with the same email (migration case)
  const existingUser = await User.findOne({ email });
  
  if (existingUser) {
    // MIGRATION: Link existing MongoDB user to new Clerk account
    existingUser.clerkUserId = clerkUserId;
    
    // Update name if it's better from webhook
    if (name && name !== 'User' && (!existingUser.name || existingUser.name === 'User')) {
      existingUser.name = name;
    }
    
    // Ensure admin role is preserved/assigned
    const shouldBeAdmin = isAdminEmail(email);
    if (shouldBeAdmin && existingUser.role !== 'admin') {
      existingUser.role = 'admin';
    }
    
    await existingUser.save();
    console.log(`✅ Linked existing MongoDB user to Clerk via webhook: ${email} (${existingUser.role})`);
    return existingUser;
  }
  
  // No existing user, create new one
  const role = isAdminEmail(email) ? 'admin' : 'user';
  
  user = await User.create({
    clerkUserId,
    email,
    name,
    role
  });
  
  console.log(`✅ Created new MongoDB user from webhook: ${email} (${role})`);
  return user;
}

/**
 * Get or create user in MongoDB from Clerk user
 * This ensures MongoDB user exists automatically on first auth
 * Handles migration: links existing MongoDB users to new Clerk accounts
 * @param {string} clerkUserId - The Clerk user ID
 * @returns {Promise<Object>} The MongoDB user object
 */
export async function getOrCreateMongoUser(clerkUserId) {
  await dbConnect();
  
  // Check if user already exists in MongoDB with clerkUserId
  let user = await User.findOne({ clerkUserId });
  
  if (user) {
    return user;
  }
  
  // User doesn't exist with clerkUserId, get data from Clerk
  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const email = clerkUser.emailAddresses[0]?.emailAddress || '';
    const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User';
    
    // Check if there's an existing MongoDB user with the same email (migration case)
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      // MIGRATION: Link existing MongoDB user to new Clerk account
      existingUser.clerkUserId = clerkUserId;
      
      // Update name if it's better in Clerk
      if (name && name !== 'User' && (!existingUser.name || existingUser.name === 'User')) {
        existingUser.name = name;
      }
      
      // Ensure admin role is preserved/assigned
      const shouldBeAdmin = isAdminEmail(email);
      if (shouldBeAdmin && existingUser.role !== 'admin') {
        existingUser.role = 'admin';
      }
      
      await existingUser.save();
      
      console.log(`✅ Linked existing MongoDB user to Clerk: ${email} (${existingUser.role})`);
      return existingUser;
    }
    
    // No existing user, create new one
    const role = isAdminEmail(email) ? 'admin' : 'user';
    
    user = await User.create({
      clerkUserId,
      email,
      name,
      role
    });
    
    console.log(`✅ Created new MongoDB user: ${email} (${role})`);
    return user;
    
  } catch (error) {
    console.error('Error creating/linking MongoDB user from Clerk:', error);
    
    // Fallback: try to find user by clerkUserId and create basic record
    try {
      const fallbackUser = await User.findOne({ clerkUserId });
      
      if (fallbackUser) {
        return fallbackUser;
      }
      
      // Create a basic user record as last resort
      return await User.create({
        clerkUserId,
        email: '',
        name: 'User',
        role: 'user'
      });
      
    } catch (fallbackError) {
      console.error('Fallback user creation failed:', fallbackError);
      
      // Absolute last resort: return a basic user object
      return await User.create({
        clerkUserId,
        email: '',
        name: 'User',
        role: 'user'
      });
    }
  }
}

/**
 * Helper function to check if the current user is authenticated with Clerk
 * Automatically creates MongoDB user if it doesn't exist
 * @param {Request} req - The request object
 * @param {Response} res - The response object 
 * @returns {Promise<Object|null>} The user object or null if not authenticated
 */
export async function requireAuth(req, res) {
  const { userId } = getAuth(req);
  
  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return null;
  }
  
  // Automatically get or create MongoDB user
  const user = await getOrCreateMongoUser(userId);
  
  return { userId, user };
}

/**
 * Get user with role from MongoDB
 * @param {string} clerkUserId - The Clerk user ID
 * @returns {Promise<Object|null>} The user object with role or null
 */
export async function getUserWithRole(clerkUserId) {
  await dbConnect();
  const user = await User.findOne({ clerkUserId });
  return user;
}

/**
 * Helper function to check if the current user is an admin
 * Automatically creates MongoDB user if it doesn't exist
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @returns {Promise<Object|null>} The user object or null if not an admin
 */
export async function requireAdmin(req, res) {
  const auth = await requireAuth(req, res);
  
  if (!auth) {
    return null;
  }
  
  // Check if user is admin (user was automatically created/fetched in requireAuth)
  if (auth.user.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Forbidden - Admin access required' });
    return null;
  }
  
  return auth;
}

/**
 * List of admin emails (temporary solution until database migration)
 * TODO: Remove this once all admin users are properly migrated
 */
const ADMIN_EMAILS = [
  'applepatient@gmail.com',    // Existing admin user from MongoDB  
  // Add other admin emails here
];

/**
 * Check if an email is an admin (temporary helper)
 * @param {string} email - The email to check
 * @returns {boolean} Whether the email is an admin
 */
export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Middleware for admin-only SSR pages with Clerk
 * @param {function} handler - The page handler function
 * @returns {function} A new handler function that includes admin checks
 */
export function withAdminAuth(handler) {
  return async (context) => {
    const { req, res } = context;
    const { userId } = getAuth(req);

    if (!userId) {
      return {
        redirect: {
          destination: '/auth/signin',
          permanent: false,
        },
      };
    }

    // Automatically get or create MongoDB user
    const user = await getOrCreateMongoUser(userId);
    
    if (!user || user.role !== 'admin') {
      return {
        redirect: {
          destination: '/dashboard',
          permanent: false,
        },
      };
    }

    return handler(context);
  };
} 