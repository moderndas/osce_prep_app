// pages/api/heygen/create-token.js
import crypto from "crypto";
import { requireAuth } from "../../../lib/auth-clerk";
import dbConnect from "../../../lib/db";
import StationUsage from "../../../models/StationUsage";

function rid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

// ----------------------------
// ✅ Best-effort in-memory rate limiter (Vercel-safe, not perfect)
// ----------------------------
function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) return xf.split(",")[0].trim();
  return (
    req.socket?.remoteAddress || req.connection?.remoteAddress || "unknown_ip"
  );
}

function getRateStore() {
  if (!globalThis.__OSCE_RL__) globalThis.__OSCE_RL__ = new Map();
  return globalThis.__OSCE_RL__;
}

function rateLimit({ key, limit, windowMs }) {
  const store = getRateStore();
  const now = Date.now();

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  existing.count += 1;
  store.set(key, existing);

  const remaining = Math.max(0, limit - existing.count);
  return {
    allowed: existing.count <= limit,
    remaining,
    resetAt: existing.resetAt,
  };
}

export default async function handler(req, res) {
  const requestId = req.headers["x-request-id"] || rid();
  const log = (event, meta = {}) =>
    console.log(
      JSON.stringify({
        tag: "OSCE_PIPE",
        svc: "heygen-create-token",
        event,
        requestId,
        ts: new Date().toISOString(),
        ...meta,
      })
    );

  const startAt = Date.now();

  res.setHeader("X-Request-Id", requestId);

  if (req.method !== "POST") {
    log("METHOD_NOT_ALLOWED", { method: req.method });
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ✅ Require signed-in user (prevents public token vending)
  const auth = await requireAuth(req, res);
  if (!auth) {
    log("AUTH_FAIL");
    return;
  }

  // ✅ NEW: must have an active station usage (protects HeyGen billing)
  try {
    await dbConnect();

    const activeUsage = await StationUsage.findOne({
      userId: auth.user._id,
      endedAt: null,
    }).sort({ startedAt: -1 });

    if (!activeUsage) {
      log("NO_ACTIVE_USAGE_BLOCK", { user: String(auth.userId).slice(0, 8) });
      return res.status(403).json({
        error:
          "No active station session. Please start a station before requesting a token.",
      });
    }

    // Optional sanity (doesn't block): log mode
    log("ACTIVE_USAGE_OK", {
      usageId: String(activeUsage._id).slice(0, 8),
      mode: activeUsage.mode,
    });
  } catch (e) {
    log("ACTIVE_USAGE_CHECK_FAIL", { message: e?.message || "unknown" });
    return res.status(500).json({ error: "Server error (usage check)" });
  }

  // ✅ Rate limit (generous so it won't break normal flow)
  const userKey = auth.userId || "unknown_user";
  const ip = getClientIp(req);
  const rlKey = `heygen_token:${userKey}:${ip}`;
  const rl = rateLimit({ key: rlKey, limit: 30, windowMs: 10 * 60 * 1000 });

  if (!rl.allowed) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((rl.resetAt - Date.now()) / 1000)
    );
    res.setHeader("Retry-After", String(retryAfterSec));
    log("RATE_LIMIT_BLOCK", { userKey, ip, retryAfterSec });
    return res
      .status(429)
      .json({ error: "Too many requests. Please try again." });
  }

  // ✅ If client disconnects, stop work
  let closed = false;
  const onClose = () => {
    if (closed) return;
    closed = true;
    log("CLIENT_DISCONNECT");
  };
  req.on("close", onClose);
  req.on("aborted", onClose);

  try {
    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      log("ENV_MISSING", { key: "HEYGEN_API_KEY" });
      return res.status(500).json({ error: "HEYGEN_API_KEY is missing" });
    }

    log("TOKEN_REQ_START", { user: String(userKey).slice(0, 8) });

    const r = await fetch("https://api.heygen.com/v1/streaming.create_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "x-api-key": apiKey,
      },
    });

    const json = await r.json().catch(() => null);

    if (closed) return;

    if (!r.ok) {
      log("TOKEN_REQ_ERR", {
        status: r.status,
        ms: Date.now() - startAt,
      });
      return res.status(r.status).json({
        error: "Failed to create HeyGen token",
        details: json,
      });
    }

    const token =
      json?.data?.token ||
      json?.data?.session_token ||
      json?.data?.sessionToken;

    if (!token) {
      log("TOKEN_MISSING_IN_RESPONSE", {
        ms: Date.now() - startAt,
      });
      return res.status(500).json({
        error: "HeyGen token missing in response",
        details: json,
      });
    }

    log("TOKEN_OK", { ms: Date.now() - startAt });
    return res.status(200).json({ token });
  } catch (e) {
    log("ERROR", {
      message: e?.message || "unknown",
      ms: Date.now() - startAt,
    });
    return res.status(500).json({ error: "Server error", details: e.message });
  } finally {
    try {
      req.off("close", onClose);
      req.off("aborted", onClose);
    } catch {}
  }
}
