import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/[...nextauth]';

/**
 * Helper function to check if the current user is authenticated
 * @param {Request} req - The request object
 * @param {Response} res - The response object 
 * @returns {Promise<Object|null>} The session object or null if not authenticated
 */
export async function requireAuth(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return null;
  }
  
  return session;
}

/**
 * Helper function to check if the current user is an admin
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @returns {Promise<Object|null>} The session object or null if not an admin
 */
export async function requireAdmin(req, res) {
  const session = await requireAuth(req, res);
  
  if (!session) {
    return null;
  }
  
  if (session.user.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Forbidden - Admin access required' });
    return null;
  }
  
  return session;
}

/**
 * Middleware for admin-only SSR pages
 * @param {function} handler - The page handler function
 * @returns {function} A new handler function that includes admin checks
 */
export function withAdminAuth(handler) {
  return async (context) => {
    const { req, res } = context;
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return {
        redirect: {
          destination: '/auth/signin',
          permanent: false,
        },
      };
    }

    if (session.user.role !== 'admin') {
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