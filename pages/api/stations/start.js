// pages/api/stations/start.js
import { requireAuth } from "../../../lib/auth-clerk";
import dbConnect from "../../../lib/db";
import User from "../../../models/User";
import StationUsage from "../../../models/StationUsage";

const TRIAL_CAP_SECONDS = 120;

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });

  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const { stationId } = req.body || {};
    if (!stationId)
      return res
        .status(400)
        .json({ error: "stationId is required", code: "MISSING_STATION_ID" });

    await dbConnect();

    const user = await User.findById(auth.user._id);
    if (!user)
      return res
        .status(404)
        .json({ error: "User not found", code: "USER_NOT_FOUND" });

    // ✅ Restricted users: block station usage and let UI redirect them to /restricted
    if (user.restricted) {
      return res.status(403).json({
        error: "Account restricted. Please contact support.",
        code: "RESTRICTED",
        restricted: true,
      });
    }

    // ============================
    // ✅ Anti-abuse: only 1 active station at a time
    // ✅ NEW: auto-expire stale actives so users don't get stuck forever
    // ============================
    const active = await StationUsage.findOne({
      userId: user._id,
      endedAt: null,
    });

    if (active) {
      const now = Date.now();
      const startedAtMs = active.startedAt
        ? new Date(active.startedAt).getTime()
        : now;
      const ageSec = Math.floor((now - startedAtMs) / 1000);

      // If older than 8 minutes, force-close it so user can start again
      if (ageSec >= 480) {
        const dur = Math.max(0, Math.min(420, ageSec));

        active.endedAt = new Date();
        active.durationSeconds = dur;
        await active.save();

        // If that stale session was trial, count it (cap at 120 seconds lifetime)
        if (active.mode === "trial") {
          const used = Math.min(TRIAL_CAP_SECONDS, user.trialSecondsUsed || 0);
          user.trialSecondsUsed = Math.min(TRIAL_CAP_SECONDS, used + dur);
          await user.save();
        }
      } else {
        return res.status(409).json({
          error:
            "You already have an active station session. Please end it before starting a new one.",
          code: "ACTIVE_SESSION",
          restricted: false,
        });
      }
    }

    const trialUsed = Math.min(TRIAL_CAP_SECONDS, user.trialSecondsUsed || 0);
    const trialSecondsRemaining = Math.max(0, TRIAL_CAP_SECONDS - trialUsed);

    // ✅ Decide mode
    let mode = "paid";
    let chargedCredits = 1;

    if (trialSecondsRemaining > 0) {
      mode = "trial";
      chargedCredits = 0;
    } else {
      // ✅ Atomic decrement: only if balance >= 1
      const updated = await User.findOneAndUpdate(
        { _id: user._id, stationsBalance: { $gte: 1 } },
        { $inc: { stationsBalance: -1 } },
        { new: true }
      );

      if (!updated) {
        // ✅ Not restricted: just paywall
        return res.status(402).json({
          error: "No station credits remaining. Please buy a pack to continue.",
          code: "NO_CREDITS",
          restricted: false,
          stationsBalance: user.stationsBalance || 0,
          trialSecondsRemaining,
        });
      }
    }

    // Create usage record
    const usage = await StationUsage.create({
      userId: user._id,
      stationId: String(stationId),
      mode,
      chargedCredits,
      startedAt: new Date(),
      endedAt: null,
      durationSeconds: 0,
    });

    // Re-fetch balance after decrement (or same user for trial)
    const latestUser = await User.findById(user._id);

    return res.status(200).json({
      ok: true,
      usageId: usage._id.toString(),
      mode,
      stationsBalance: latestUser?.stationsBalance || 0,
      trialSecondsRemaining,
    });
  } catch (e) {
    console.error("Station start error:", e);
    return res.status(500).json({
      error: "Failed to start station",
      message: e.message,
      code: "SERVER_ERROR",
    });
  }
}
