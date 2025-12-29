// pages/api/stations/end.js
import { requireAuth } from "../../../lib/auth-clerk";
import dbConnect from "../../../lib/db";
import User from "../../../models/User";
import StationUsage from "../../../models/StationUsage";

const TRIAL_CAP_SECONDS = 120;
const MAX_SESSION_SECONDS = 420;

function clamp(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });

  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const { usageId, durationSeconds } = req.body || {};

    await dbConnect();

    // ✅ Allow fallback: if usageId missing, end latest active usage for this user
    let usage = null;

    if (usageId) {
      // ✅ Prefer active usage only (endedAt:null). If already ended, we'll treat as idempotent.
      usage = await StationUsage.findOne({ _id: usageId, endedAt: null });
      if (!usage) {
        // If it exists but already ended, return ok (idempotent) instead of 404
        const alreadyEnded = await StationUsage.findById(usageId);
        if (alreadyEnded) return res.status(200).json({ ok: true });
      }
    } else {
      usage = await StationUsage.findOne({
        userId: auth.user._id,
        endedAt: null,
      }).sort({ startedAt: -1 });
    }

    if (!usage)
      return res
        .status(404)
        .json({ error: "Usage not found", code: "USAGE_NOT_FOUND" });

    // user can only end their own usage
    if (String(usage.userId) !== String(auth.user._id)) {
      return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN" });
    }

    // Idempotent end (usage here is guaranteed active)
    const now = Date.now();
    const started = usage.startedAt ? new Date(usage.startedAt).getTime() : now;

    // ✅ Authoritative duration from server time
    let dur = Math.floor((now - started) / 1000);
    dur = clamp(dur, 0, MAX_SESSION_SECONDS);

    // ✅ If startedAt missing/bad OR server duration is 0, fall back to client duration (still clamped)
    if (!usage.startedAt || dur === 0) {
      dur = clamp(durationSeconds || 0, 0, MAX_SESSION_SECONDS);
    }

    usage.endedAt = new Date();
    usage.durationSeconds = dur;
    await usage.save();

    // If trial, increment trialSecondsUsed (cap at 120)
    if (usage.mode === "trial") {
      const user = await User.findById(auth.user._id);
      if (user) {
        const used = clamp(user.trialSecondsUsed || 0, 0, TRIAL_CAP_SECONDS);
        const next = clamp(used + dur, 0, TRIAL_CAP_SECONDS);
        user.trialSecondsUsed = next;
        await user.save();
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Station end error:", e);
    return res.status(500).json({
      error: "Failed to end station",
      message: e.message,
      code: "SERVER_ERROR",
    });
  }
}
