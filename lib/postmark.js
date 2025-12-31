// lib/postmark.js
import * as postmark from "postmark";

const POSTMARK_TOKEN = process.env.POSTMARK_API_TOKEN;
const EMAIL_FROM = process.env.EMAIL_FROM || "info@oscehelp.com";
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

function requireToken() {
  if (!POSTMARK_TOKEN) {
    throw new Error("POSTMARK_API_TOKEN is missing");
  }
}

export function getStationsUrl() {
  // ensure no double slashes
  const base = String(APP_BASE_URL || "").replace(/\/+$/, "");
  return `${base}/dashboard/stations`;
}

export async function sendWelcomeEmail({ toEmail, firstName }) {
  requireToken();

  const client = new postmark.ServerClient(POSTMARK_TOKEN);

  const safeName = String(firstName || "there").trim() || "there";

  const subject = `Hi ${safeName}, Welcome to OSCE Help ✅`;
  const stationsUrl = getStationsUrl();

  const textBody = `Hi ${safeName},

Welcome to OSCE Help ✅ 🎉

You’re all set. Here’s what you can do right now:

1) Use your free trial minutes first
   New accounts can try stations for a short trial. When the trial ends, you’ll see a clear message to buy credits to continue.

2) Start practicing OSCE stations
   Go to Stations: ${stationsUrl}

If you need help or something feels off, just reply to this email — we read every message.

Thanks,
OSCE Help Team
info@oscehelp.com`;

  const htmlBody = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
    <p>Hi ${safeName},</p>

    <p>Welcome to <strong>OSCE Help ✅</strong> 🎉</p>

    <p>You’re all set. Here’s what you can do right now:</p>

    <ol style="padding-left: 18px;">
      <li>
        <strong>Use your free trial minutes first</strong><br/>
        <span>New accounts can try stations for a short trial. When the trial ends, you’ll see a clear message to <strong>buy credits</strong> to continue.</span>
      </li>
      <li style="margin-top: 10px;">
        <strong>Start practicing OSCE stations</strong><br/>
        <a href="${stationsUrl}" style="color:#2563eb; text-decoration:underline;">Click here to practice</a>
      </li>
    </ol>

    <p>If you need help or something feels off, just reply to this email — we read every message.</p>

    <p>Thanks,<br/>
    <strong>OSCE Help Team</strong><br/>
    <span>info@oscehelp.com</span></p>
  </div>
  `;

  return client.sendEmail({
    From: EMAIL_FROM,
    To: toEmail,
    Subject: subject,
    TextBody: textBody,
    HtmlBody: htmlBody,
    MessageStream: "outbound",
  });
}
