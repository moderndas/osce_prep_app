// pages/api/email/welcome.js
import { requireAuth } from "../../../lib/auth-clerk";
import { sendWelcomeEmail } from "../../../lib/email/postmark";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const { toEmail, firstName } = req.body || {};
    if (!toEmail) return res.status(400).json({ error: "toEmail is required" });

    await sendWelcomeEmail({ toEmail, firstName });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({
      error: "Failed to send welcome email",
      message: e?.message || "unknown",
    });
  }
}
