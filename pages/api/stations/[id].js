import { requireAuth, requireAdmin } from '../../../lib/auth-clerk';
import dbConnect from '../../../lib/db';
import Station from '../../../models/Station';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  // Get the station ID from the URL
  const { id } = req.query;
  
  // Check if the user is authenticated
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // Connect to MongoDB
  await dbConnect();
  
  // Check if it's a valid ObjectId using mongoose
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid station ID' 
    });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      try {
        // Find the station by ID
        const station = await Station.findById(id);
        
        if (!station) {
          return res.status(404).json({ 
            success: false, 
            message: 'Station not found' 
          });
        }
        
        // Check if the user has permission to view this station
        const isAdmin = auth.user.role === 'admin';
        if (!isAdmin && station.createdBy !== auth.userId && !station.isPublic) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to access this station'
          });
        }
        
        return res.status(200).json({
          success: true,
          data: station
        });
      } catch (error) {
        console.error('Error fetching station:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Server error' 
        });
      }
      
    case 'PUT':
      try {
        // Check if user is admin
        if (auth.user.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'Only administrators can update stations'
          });
        }
        
        // Get data from request body
        const { 
          stationName, 
          clinicalBackground, 
          systemPrompt, 
          analysisPrompt, 
          personaId,
          isPublic 
        } = req.body;
        
        // Validate required fields
        if (!stationName || !clinicalBackground) {
          return res.status(400).json({ 
            success: false, 
            message: 'Station name and clinical background are required' 
          });
        }
        
        // Find and update the station
        const station = await Station.findByIdAndUpdate(
          id,
          {
            stationName,
            clinicalBackground,
            systemPrompt,
            analysisPrompt,
            personaId: personaId || '',
            isPublic: isPublic === true || isPublic === 'true',
            updatedAt: new Date()
          },
          { new: true, runValidators: true }
        );
        
        if (!station) {
          return res.status(404).json({ 
            success: false, 
            message: 'Station not found' 
          });
        }
        
        return res.status(200).json({
          success: true,
          data: station,
          message: 'Station updated successfully'
        });
      } catch (error) {
        console.error('Error updating station:', error);
        return res.status(500).json({ 
          success: false, 
          message: error.message || 'Server error' 
        });
      }
      
    case 'DELETE':
      try {
        // Check if user is admin
        if (auth.user.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'Only administrators can delete stations'
          });
        }
        
        // Find and delete the station
        const station = await Station.findByIdAndDelete(id);
        
        if (!station) {
          return res.status(404).json({ 
            success: false, 
            message: 'Station not found' 
          });
        }
        
        return res.status(200).json({
          success: true,
          message: 'Station deleted successfully'
        });
      } catch (error) {
        console.error('Error deleting station:', error);
        return res.status(500).json({ 
          success: false, 
          message: error.message || 'Server error' 
        });
      }
      
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ 
        success: false, 
        message: `Method ${req.method} not allowed` 
      });
  }
} 