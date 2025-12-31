// pages/api/admin/stations.js
import { requireAdmin } from "../../../lib/auth-clerk";
import dbConnect from "../../../lib/db";
import Station from "../../../models/Station";

/**
 * Admin-only API endpoint for managing stations
 * GET  - List all stations (with filtering/sorting)
 * POST - Create new station (admin only)
 */
export default async function handler(req, res) {
  // Check if the user is an admin
  const session = await requireAdmin(req, res);
  if (!session) return; // requireAdmin already sent response

  await dbConnect();

  // -----------------------------
  // GET: list stations
  // -----------------------------
  if (req.method === "GET") {
    try {
      const {
        search,
        isPublic,
        sortBy = "createdAt",
        sortOrder = "desc",
        page = 1,
        limit = 50,
      } = req.query;

      const filter = {};

      if (search) {
        filter.$or = [
          { stationName: { $regex: search, $options: "i" } },
          { clinicalBackground: { $regex: search, $options: "i" } },
        ];
      }

      if (isPublic !== undefined) {
        filter.isPublic = isPublic === "true";
      }

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      const stations = await Station.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await Station.countDocuments(filter);

      return res.status(200).json({
        success: true,
        data: {
          stations,
          pagination: {
            current: pageNum,
            total: Math.ceil(total / limitNum),
            count: stations.length,
            totalStations: total,
          },
        },
      });
    } catch (error) {
      console.error("Admin stations GET error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch stations",
      });
    }
  }

  // -----------------------------
  // POST: create station
  // -----------------------------
  if (req.method === "POST") {
    try {
      const {
        stationName,
        clinicalBackground,
        difficulty,
        systemPrompt,
        analysisPrompt,
        heygenAvatarName,
        personaId,
        isPublic = true,

        // ✅ NEW: 5-min question + future rules (optional)
        fiveMinuteQuestion,
        fiveMinuteRules,
      } = req.body || {};

      if (!stationName || !clinicalBackground) {
        return res.status(400).json({
          success: false,
          message: "Station name and clinical background are required",
        });
      }

      // normalize isPublic (in case it comes as string)
      const isPublicBool = isPublic === true || isPublic === "true";

      // normalize fiveMinuteRules safely
      const normalizedFiveMinuteRules = fiveMinuteRules
        ? {
            defaultNextIntentType:
              fiveMinuteRules.defaultNextIntentType || "confirm",
            counterQuestionKeywords: Array.isArray(
              fiveMinuteRules.counterQuestionKeywords
            )
              ? fiveMinuteRules.counterQuestionKeywords
                  .map((s) => String(s || "").trim())
                  .filter(Boolean)
              : [],
          }
        : undefined;

      const station = await Station.create({
        stationName,
        clinicalBackground,
        difficulty: difficulty || "Medium",
        systemPrompt: systemPrompt || "",
        analysisPrompt: analysisPrompt || "",
        heygenAvatarName: (heygenAvatarName || "").trim(),
        personaId: personaId || "",
        isPublic: isPublicBool,

        // ✅ NEW fields
        fiveMinuteQuestion:
          String(fiveMinuteQuestion || "").trim() || undefined,
        fiveMinuteRules: normalizedFiveMinuteRules,

        createdBy: session.userId, // Clerk user ID
      });

      return res.status(201).json({
        success: true,
        message: "Station created successfully",
        data: station,
      });
    } catch (error) {
      console.error("Admin stations POST error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create station",
      });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({
    success: false,
    message: `Method ${req.method} not allowed`,
  });
}
