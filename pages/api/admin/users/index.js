import { requireAdmin } from "../../../../lib/auth-clerk";
import dbConnect from "../../../../lib/db";
import User from "../../../../models/User";

/**
 * Admin-only API endpoint for user management
 * GET - List all users
 * POST - (DISABLED) Creating Mongo users manually is unsafe because clerkUserId is required.
 *       Users must be created via Clerk signup/webhook.
 */
export default async function handler(req, res) {
  // Check if the user is an admin
  const session = await requireAdmin(req, res);
  if (!session) return;

  await dbConnect();

  if (req.method === "GET") {
    try {
      // Get query parameters for filtering and pagination
      const {
        search,
        role,
        sortBy = "createdAt",
        sortOrder = "desc",
        page = 1,
        limit = 20,
      } = req.query;

      // Build filter object
      const filter = {};

      if (search) {
        filter.$or = [
          { name: { $regex: String(search), $options: "i" } },
          { email: { $regex: String(search), $options: "i" } },
        ];
      }

      if (role) {
        filter.role = role;
      }

      // Calculate pagination
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      // Build sort object (basic allow-list)
      const allowedSortFields = ["createdAt", "email", "name", "role"];
      const safeSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : "createdAt";

      const sort = {};
      sort[safeSortBy] = sortOrder === "asc" ? 1 : -1;

      // Get users with pagination
      const users = await User.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean();

      // Get total count for pagination
      const total = await User.countDocuments(filter);

      return res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            current: pageNum,
            total: Math.ceil(total / limitNum),
            count: users.length,
            totalUsers: total,
          },
        },
      });
    } catch (error) {
      console.error("Admin users GET error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch users",
      });
    }
  }

  if (req.method === "POST") {
    // ✅ Disabled: UserSchema requires clerkUserId (and we don't want admin creating shadow users)
    return res.status(405).json({
      success: false,
      message:
        "Creating users here is disabled. Users must sign up via Clerk so clerkUserId exists, then Mongo is linked automatically via webhook.",
    });
  }

  res.setHeader("Allow", ["GET"]);
  return res.status(405).json({
    success: false,
    message: `Method ${req.method} not allowed`,
  });
}
