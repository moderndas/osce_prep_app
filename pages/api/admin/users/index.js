import { requireAdmin } from '../../../../lib/auth-clerk';
import dbConnect from '../../../../lib/db';
import User from '../../../../models/User';

/**
 * Admin-only API endpoint for user management
 * GET - List all users
 * POST - Create a new user (admin only)
 */
export default async function handler(req, res) {
  // Check if the user is an admin
  const session = await requireAdmin(req, res);
  if (!session) return; // requireAdmin already sends the appropriate error response

  await dbConnect();

  if (req.method === 'GET') {
    try {
      // Get query parameters for filtering and pagination
      const { 
        search, 
        role, 
        sortBy = 'createdAt', 
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = req.query;

      // Build filter object
      const filter = {};
      
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (role) {
        filter.role = role;
      }

      // Calculate pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Get users with pagination (exclude sensitive fields)
      const users = await User.find(filter)
        .select('-password') // Exclude password field
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean();

      // Get total count for pagination
      const total = await User.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            current: pageNum,
            total: Math.ceil(total / limitNum),
            count: users.length,
            totalUsers: total
          }
        }
      });

    } catch (error) {
      console.error('Admin users GET error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }

  } else if (req.method === 'POST') {
    try {
      const {
        name,
        email,
        role = 'user'
      } = req.body;

      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: 'Name and email are required'
        });
      }

      // Validate role
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be either "user" or "admin"'
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Create new user (for MongoDB tracking, Clerk account needs to be created separately)
      const user = await User.create({
        name,
        email,
        role,
        // Note: clerkUserId will be set when the user signs in with Clerk
      });

      // Remove sensitive data from response
      const userResponse = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      res.status(201).json({
        success: true,
        message: 'User created successfully. They will need to sign up with Clerk to activate their account.',
        data: userResponse
      });

    } catch (error) {
      console.error('Admin users POST error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create user'
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