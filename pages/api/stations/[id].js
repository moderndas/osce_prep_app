// pages/api/stations/[id].js
import { requireAuth } from "../../../lib/auth-clerk";
import dbConnect from "../../../lib/db";
import Station from "../../../models/Station";
import mongoose from "mongoose";

export default async function handler(req, res) {
  const { id } = req.query;

  const auth = await requireAuth(req, res);
  if (!auth) return;

  await dbConnect();

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid station ID",
    });
  }

  const isAdmin = auth.user?.role === "admin";

  switch (req.method) {
    case "GET":
      try {
        const station = await Station.findById(id);
        if (!station) {
          return res.status(404).json({
            success: false,
            message: "Station not found",
          });
        }

        // - Admin can open anything
        // - Users can open ONLY public stations
        if (!isAdmin && !station.isPublic) {
          return res.status(403).json({
            success: false,
            message: "This station is not available",
          });
        }

        // 🚫 Do NOT leak scripts/prompts to normal users
        if (!isAdmin) {
          const safe = station.toObject();
          delete safe.systemPrompt;
          delete safe.analysisPrompt;

          return res.status(200).json({
            success: true,
            data: safe,
          });
        }

        // Admin can receive full station
        return res.status(200).json({
          success: true,
          data: station,
        });
      } catch (error) {
        console.error("Error fetching station:", error);
        return res.status(500).json({
          success: false,
          message: "Server error",
        });
      }

    case "PUT":
      try {
        if (!isAdmin) {
          return res.status(403).json({
            success: false,
            message: "Only administrators can update stations",
          });
        }

        const {
          stationName,
          clinicalBackground,
          difficulty,
          systemPrompt,
          analysisPrompt,
          heygenAvatarName,
          personaId,
          isPublic,

          // ✅ NEW: 5-min question + future rules
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

        const update = {
          stationName,
          clinicalBackground,
          difficulty: difficulty || "Medium",
          systemPrompt: systemPrompt ?? "",
          analysisPrompt: analysisPrompt ?? "",
          heygenAvatarName: (heygenAvatarName || "").trim(),
          personaId: personaId || "",
          isPublic: isPublicBool,
          updatedAt: new Date(),

          // ✅ NEW fields
          fiveMinuteQuestion:
            String(fiveMinuteQuestion || "").trim() || undefined,
          fiveMinuteRules: normalizedFiveMinuteRules,
        };

        const station = await Station.findByIdAndUpdate(id, update, {
          new: true,
          runValidators: true,
        });

        if (!station) {
          return res.status(404).json({
            success: false,
            message: "Station not found",
          });
        }

        return res.status(200).json({
          success: true,
          data: station,
          message: "Station updated successfully",
        });
      } catch (error) {
        console.error("Error updating station:", error);
        return res.status(500).json({
          success: false,
          message: error.message || "Server error",
        });
      }

    case "DELETE":
      try {
        if (!isAdmin) {
          return res.status(403).json({
            success: false,
            message: "Only administrators can delete stations",
          });
        }

        const station = await Station.findByIdAndDelete(id);
        if (!station) {
          return res.status(404).json({
            success: false,
            message: "Station not found",
          });
        }

        return res.status(200).json({
          success: true,
          message: "Station deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting station:", error);
        return res.status(500).json({
          success: false,
          message: error.message || "Server error",
        });
      }

    default:
      res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
      return res.status(405).json({
        success: false,
        message: `Method ${req.method} not allowed`,
      });
  }
}
