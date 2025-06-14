import { getAuth } from '@clerk/nextjs/server';
import dbConnect from "../../../lib/db";
import Station from "../../../models/Station";
import { stationCreationLimiter } from "../../../lib/rateLimit";
import { requireAuth } from "../../../lib/auth-clerk";

export default async function handler(req, res) {
  // Get authenticated user (automatically creates MongoDB user if needed)
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // Connect to database
  await dbConnect();

  // Handle POST request to create a new station
  if (req.method === 'POST') {
    try {
      // Apply station creation rate limiting
      await stationCreationLimiter(req, res);
      
      // For now, allow any authenticated user to create stations
      // Later you can add role-based restrictions via Clerk metadata
      
      const { stationName, clinicalBackground, difficulty, systemPrompt, analysisPrompt, personaId, isPublic = true } = req.body;

      // Validate required fields
      if (!stationName || !clinicalBackground) {
        return res.status(400).json({
          success: false,
          message: 'Station name and clinical background are required'
        });
      }

      // Create new station with Clerk user ID
      const station = await Station.create({
        stationName,
        clinicalBackground,
        difficulty: difficulty || 'Medium',
        systemPrompt: systemPrompt || '',
        analysisPrompt: analysisPrompt || '',
        personaId: personaId || '',
        isPublic: isPublic === true || isPublic === 'true',
        createdBy: auth.userId  // Use Clerk user ID
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
      // For now, show all public stations and user's own stations
      // Later you can add role-based filtering via Clerk metadata
      const query = {
        $or: [
          { isPublic: true },
          { createdBy: auth.userId }
        ]
      };
      
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
      
      // Users can only delete their own stations for now
      // Later you can add admin role checking via Clerk metadata
      const query = { _id: id, createdBy: auth.userId };
        
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