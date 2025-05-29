import { requireAuth } from '../../../lib/auth-clerk';
import dbConnect from '../../../lib/db';
import Station from '../../../models/Station';

export default async function handler(req, res) {
  // Check authentication
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // Connect to database
  await dbConnect();

  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Fetch available stations (created by admins or marked as public)
    const stations = await Station.find({ 
      $or: [
        { isPublic: true },
        { createdBy: 'admin' }
      ]
    }).sort({ createdAt: -1 });

    return res.status(200).json({ 
      success: true, 
      data: stations
    });
  } catch (error) {
    console.error('Error fetching available stations:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
} 