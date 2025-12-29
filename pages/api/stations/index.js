// pages/api/stations/index.js
import dbConnect from "../../../lib/db";
import Station from "../../../models/Station";
import { stationCreationLimiter } from "../../../lib/rateLimit";
import { requireAuth } from "../../../lib/auth-clerk";

export default async function handler(req, res) {
  try {
    // Auth (also ensures Mongo user exists)
    const auth = await requireAuth(req, res);
    if (!auth) return;

    await dbConnect();

    const isAdmin = auth.user?.role === "admin";

    // ======================================================
    // ✅ CREATE station (ADMIN ONLY)
    // ======================================================
    if (req.method === "POST") {
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Only administrators can create stations",
        });
      }

      await stationCreationLimiter(req, res);
      if (res.headersSent) return;

      const {
        stationName,
        clinicalBackground,
        difficulty,
        systemPrompt,
        analysisPrompt,
        heygenAvatarName,
        personaId,
        isPublic = true,
      } = req.body || {};

      if (!stationName || !clinicalBackground) {
        return res.status(400).json({
          success: false,
          message: "Station name and clinical background are required",
        });
      }

      const station = await Station.create({
        stationName,
        clinicalBackground,
        difficulty: difficulty || "Medium",
        systemPrompt: systemPrompt || "",
        analysisPrompt: analysisPrompt || "",
        heygenAvatarName: heygenAvatarName || "",
        personaId: personaId || "",
        isPublic: isPublic === true || isPublic === "true",
        createdBy: auth.userId,
      });

      // Admin-only endpoint, ok to return full object
      return res.status(201).json({
        success: true,
        data: station,
        message: "Station created successfully",
      });
    }

    // ======================================================
    // ✅ LIST stations
    // - Admin: sees ALL stations (including prompts)
    // - User: sees ONLY public + PROMPTS REMOVED
    // ======================================================
    if (req.method === "GET") {
      const query = isAdmin ? {} : { isPublic: true };

      const stationsQuery = Station.find(query).sort({ createdAt: -1 });

      // 🚫 Do NOT leak scripts/prompts to normal users
      if (!isAdmin) {
        stationsQuery.select("-systemPrompt -analysisPrompt");
      }

      const stations = await stationsQuery;

      return res.status(200).json({
        success: true,
        data: stations,
      });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed`,
    });
  } catch (error) {
    console.error("API /api/stations error:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
}
