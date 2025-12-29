// pages/api/user/subscription.js
import { requireAuth } from "../../../lib/auth-clerk";
import dbConnect from "../../../lib/db";
import User from "../../../models/User";

const TRIAL_CAP_SECONDS = 120;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    await dbConnect();

    const user = await User.findById(auth.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const used = Math.min(TRIAL_CAP_SECONDS, user.trialSecondsUsed || 0);
    const trialSecondsRemaining = Math.max(0, TRIAL_CAP_SECONDS - used);

    return res.status(200).json({
      restricted: !!user.restricted,
      stationsBalance: user.stationsBalance || 0,
      trialSecondsRemaining,
    });
  } catch (e) {
    console.error("subscription access error:", e);
    return res.status(500).json({ error: "Server error", message: e.message });
  }
}
