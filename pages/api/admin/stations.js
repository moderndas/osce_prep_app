import { requireAdmin } from '../../../lib/auth';
import dbConnect from '../../../lib/db';
import Station from '../../../models/Station';

/**
 * Admin-only API endpoint for managing stations
 * GET: List all stations
 * POST: Create a new station
 * Only accessible to users with admin role
 */
export default async function handler(req, res) {
  // Check if the user is an admin
  const session = await requireAdmin(req, res);
  if (!session) return; // The requireAdmin function already sends the appropriate error response
  
  // Connect to the database
  await dbConnect();
  
  switch (req.method) {
    case 'GET':
      try {
        // Fetch all stations
        const stations = await Station.find({}).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: stations });
      } catch (error) {
        console.error('Error fetching stations:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
      }
      
    case 'POST':
      try {
        // Extract station data from request body - match field names exactly
        const { 
          stationName, 
          clinicalBackground, 
          systemPrompt,
          analysisPrompt,
          personaId,
          isPublic = true
        } = req.body;
        
        // Validate required fields
        if (!stationName || !clinicalBackground) {
          return res.status(400).json({ 
            success: false, 
            message: 'Station name and clinical background are required' 
          });
        }
        
        // Create the station
        const station = await Station.create({
          stationName,
          clinicalBackground,
          systemPrompt: systemPrompt || '',
          analysisPrompt: analysisPrompt || '',
          personaId: personaId || '',
          isPublic: isPublic === true || isPublic === 'true',
          createdBy: session.user.id,
        });
        
        return res.status(201).json({
          success: true,
          data: station,
          message: 'Station created successfully'
        });
      } catch (error) {
        console.error('Error creating station:', error);
        return res.status(500).json({ 
          success: false, 
          message: error.message || 'Server error' 
        });
      }
      
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
  }
} 