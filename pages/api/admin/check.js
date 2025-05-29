import { requireAdmin } from '../../../lib/auth-clerk';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const auth = await requireAdmin(req, res);
    
    if (!auth) {
      // requireAdmin already sent the error response
      return;
    }

    res.status(200).json({ 
      success: true, 
      isAdmin: true,
      user: {
        id: auth.user._id,
        email: auth.user.email,
        role: auth.user.role
      }
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
} 