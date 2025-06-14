import { requireAdmin } from '../../../lib/auth-clerk';
import dbConnect from '../../../lib/db';
import Station from '../../../models/Station';

/**
 * Admin-only API endpoint for managing stations
 * GET - List all stations (with filtering/sorting)
 * POST - Create new station (admin only)
 * Only accessible to users with admin role
 */
export default async function handler(req, res) {
  // Check if the user is an admin
  const session = await requireAdmin(req, res);
  if (!session) return; // The requireAdmin function already sends the appropriate error response

  await dbConnect();

  if (req.method === 'GET') {
    try {
      // Get query parameters for filtering and sorting
      const { 
        search, 
        isPublic, 
        sortBy = 'createdAt', 
        sortOrder = 'desc',
        page = 1,
        limit = 50
      } = req.query;

      // Build filter object
      const filter = {};
      
      if (search) {
        filter.$or = [
          { stationName: { $regex: search, $options: 'i' } },
          { clinicalBackground: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (isPublic !== undefined) {
        filter.isPublic = isPublic === 'true';
      }

      // Calculate pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Get stations with pagination
      const stations = await Station.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean();

      // Get total count for pagination
      const total = await Station.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: {
          stations,
          pagination: {
            current: pageNum,
            total: Math.ceil(total / limitNum),
            count: stations.length,
            totalStations: total
          }
        }
      });

    } catch (error) {
      console.error('Admin stations GET error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stations'
      });
    }

  } else if (req.method === 'POST') {
    try {
      const {
        stationName,
        clinicalBackground,
        difficulty,
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

      // Create new station
      const station = await Station.create({
        stationName,
        clinicalBackground,
        difficulty: difficulty || 'Medium',
        systemPrompt: systemPrompt || '',
        analysisPrompt: analysisPrompt || '',
        personaId: personaId || '',
        isPublic,
        createdBy: session.userId  // Use Clerk user ID
      });

      res.status(201).json({
        success: true,
        message: 'Station created successfully',
        data: station
      });

    } catch (error) {
      console.error('Admin stations POST error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create station'
      });
    }

  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed`
    });
  }
} 