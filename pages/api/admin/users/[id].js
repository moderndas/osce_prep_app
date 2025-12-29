// pages/api/admin/users/[id].js
import {
  requireAdmin,
  syncClerkRestrictedFlag,
} from "../../../../lib/auth-clerk";
import dbConnect from "../../../../lib/db";
import User from "../../../../models/User";
import { sanitizeString, sanitizeEmail } from "../../../../lib/sanitize";

/**
 * Admin-only API endpoint for managing a specific user
 * GET - Get user details
 * PUT - Update user details
 * DELETE - Delete a user
 */
export default async function handler(req, res) {
  // Check if the user is an admin
  const session = await requireAdmin(req, res);
  if (!session) return; // requireAdmin already sends the appropriate error response

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "User ID is required",
    });
  }

  await dbConnect();

  if (req.method === "GET") {
    try {
      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Admin user GET error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch user",
      });
    }
  }

  if (req.method === "PUT") {
    try {
      const { name, email, role, restricted, stationsBalance } = req.body || {};

      // Find the user
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Sanitize inputs (fallback to existing)
      const sanitizedName = name ? sanitizeString(name) : user.name;
      const sanitizedEmail = email ? sanitizeEmail(email) : user.email;

      // Validate role if provided
      if (role && !["user", "admin"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be either "user" or "admin".',
        });
      }

      // Check if email is already in use by another user
      if (sanitizedEmail !== user.email) {
        const existingUser = await User.findOne({
          email: sanitizedEmail,
          _id: { $ne: id },
        });

        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: "Email already in use by another user",
          });
        }
      }

      // Validate / normalize stationsBalance if provided
      let nextStationsBalance = user.stationsBalance;
      if (stationsBalance !== undefined) {
        const n = Number(stationsBalance);
        if (!Number.isFinite(n) || n < 0) {
          return res.status(400).json({
            success: false,
            message: "stationsBalance must be a non-negative number",
          });
        }
        nextStationsBalance = Math.floor(n);
      }

      // Build update object (only include restricted if boolean provided)
      const updateDoc = {
        name: sanitizedName,
        email: sanitizedEmail,
        ...(role && { role }),
        ...(typeof restricted === "boolean" && { restricted: !!restricted }),
        ...(stationsBalance !== undefined && {
          stationsBalance: nextStationsBalance,
        }),
      };

      const updatedUser = await User.findByIdAndUpdate(id, updateDoc, {
        new: true,
        runValidators: true,
      });

      // ✅ IMPORTANT: Mirror restricted into Clerk publicMetadata
      // so middleware can block/allow immediately.
      if (updatedUser?.clerkUserId && typeof restricted === "boolean") {
        await syncClerkRestrictedFlag(
          updatedUser.clerkUserId,
          !!updatedUser.restricted
        );
      }

      return res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Admin user PUT error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update user",
      });
    }
  }

  if (req.method === "DELETE") {
    try {
      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Prevent admin from deleting themselves
      if (user.clerkUserId === session.userId) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete your own account",
        });
      }

      await User.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("Admin user DELETE error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete user",
      });
    }
  }

  res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
  return res.status(405).json({
    success: false,
    message: `Method ${req.method} not allowed`,
  });
}
