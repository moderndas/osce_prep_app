import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "../../../lib/db";
import Station from "../../../models/Station";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized' 
    });
  }

  // Connect to database
  await dbConnect();

  // Handle POST request to create a new station
  if (req.method === 'POST') {
    try {
      // Only allow admins to create stations
      if (session.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can create stations'
        });
      }

      const { stationName, clinicalBackground, systemPrompt, analysisPrompt, personaId, isPublic = true } = req.body;

      // Validate required fields
      if (!stationName || !clinicalBackground) {
        return res.status(400).json({
          success: false,
          message: 'Station name and clinical background are required'
        });
      }

      // Create new station
      const station = await Station.create({
        stationName,
        clinicalBackground,
        systemPrompt: systemPrompt || '',
        analysisPrompt: analysisPrompt || '',
        personaId: personaId || '',
        isPublic: isPublic === true || isPublic === 'true',
        createdBy: session.user.id
      });

      return res.status(201).json({
        success: true,
        data: station,
        message: 'Station created successfully'
      });
    } catch (error) {
      console.error('Station creation error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error creating station'
      });
    }
  }

  // Handle GET request to fetch stations
  if (req.method === 'GET') {
    try {
      let query = {};
      
      // If not admin, only fetch public stations or ones created by the user
      if (session.user.role !== 'admin') {
        query = {
          $or: [
            { isPublic: true },
            { createdBy: session.user.id }
          ]
        };
      }
      
      // Fetch stations based on query
      const stations = await Station.find(query).sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        data: stations
      });
    } catch (error) {
      console.error('Error fetching stations:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error fetching stations'
      });
    }
  }

  // Add DELETE method
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      
      // Allow admins to delete any station, but regular users can only delete their own
      const query = session.user.role === 'admin'
        ? { _id: id }
        : { _id: id, createdBy: session.user.id };
        
      const station = await Station.findOneAndDelete(query);

      if (!station) {
        return res.status(404).json({ 
          success: false,
          message: 'Station not found or you don\'t have permission to delete it' 
        });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Error deleting station'
      });
    }
  }

  return res.status(405).json({ 
    success: false, 
    message: 'Method not allowed' 
  });
} 