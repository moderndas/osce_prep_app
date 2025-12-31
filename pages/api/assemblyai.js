// pages/api/assemblyai.js
import crypto from "crypto";
import axios from "axios";
import { requireAuth } from "../../lib/auth-clerk";

export const config = {
  api: {
    bodyParser: false,
  },
};

function rid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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
        svc: "assemblyai",
        event,
        requestId,
        ts: new Date().toISOString(),
        ...meta,
      })
    );

  const startAt = Date.now();

  // Always return requestId for correlation
  res.setHeader("X-Request-Id", requestId);

  // ✅ Require signed-in user (prevents public usage)
  const auth = await requireAuth(req, res);
  if (!auth) {
    log("AUTH_FAIL");
    return;
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    log("ENV_MISSING", { key: "ASSEMBLYAI_API_KEY" });
    return res.status(500).json({ error: "ASSEMBLYAI_API_KEY is missing" });
  }

  // ✅ Abort all upstream calls if client disconnects
  const ac = new AbortController();
  let closed = false;

  const onClose = () => {
    if (closed) return;
    closed = true;
    log("CLIENT_DISCONNECT");
    try {
      ac.abort();
    } catch {}
  };

  req.on("close", onClose);
  req.on("aborted", onClose);
  res.on("close", onClose);

  // axios client with abort + timeout
  // ✅ IMPORTANT: Use Authorization header and keep it on per-request overrides.
  const ax = axios.create({
    timeout: 30_000,
    headers: { Authorization: apiKey },
    signal: ac.signal,
  });

  try {
    log("REQ", { method: req.method });

    const userKey = auth.userId || "unknown_user";
    const ip = getClientIp(req);

    // ------------------------------------------------------------
    // GET = temporary token for Streaming STT (browser-safe)
    // ------------------------------------------------------------
    if (req.method === "GET") {
      // ✅ Rate limit token minting (reduced; 1 token per session is normal)
      const rlKey = `aai_stream_token:${userKey}:${ip}`;
      const rl = rateLimit({
        key: rlKey,
        limit: 6,
        windowMs: 10 * 60 * 1000,
      }); // 6 / 10 min
      if (!rl.allowed) {
        const retryAfterSec = Math.max(
          1,
          Math.ceil((rl.resetAt - Date.now()) / 1000)
        );
        res.setHeader("Retry-After", String(retryAfterSec));
        log("RATE_LIMIT_BLOCK", {
          type: "GET_TOKEN",
          userKey,
          ip,
          retryAfterSec,
        });
        return res
          .status(429)
          .json({ error: "Too many requests. Please try again." });
      }

      // token lifetime: 1..600 seconds
      const expiresIn = Number(req.query.expires_in_seconds || 60);
      const safeExpires = Number.isFinite(expiresIn)
        ? Math.min(Math.max(expiresIn, 1), 600)
        : 60;

      // session cap: 60..10800 seconds
      const maxSessionIn = Number(
        req.query.max_session_duration_seconds || 420
      );
      const safeMaxSession = Number.isFinite(maxSessionIn)
        ? Math.min(Math.max(maxSessionIn, 60), 10800)
        : 420;

      log("TOKEN_REQ", { safeExpires, safeMaxSession });

      const tokenResp = await ax.get(
        "https://streaming.assemblyai.com/v3/token",
        {
          params: {
            expires_in_seconds: safeExpires,
            max_session_duration_seconds: safeMaxSession,
          },
          timeout: 15_000,
        }
      );

      const token = tokenResp.data?.token;
      const exp = tokenResp.data?.expires_in_seconds ?? safeExpires;

      if (!token) {
        log("TOKEN_ERR", { reason: "missing_token_in_response" });
        return res
          .status(500)
          .json({ error: "Failed to generate streaming token" });
      }

      log("TOKEN_OK", {
        expires_in_seconds: exp,
        max_session_duration_seconds:
          tokenResp.data?.max_session_duration_seconds ?? safeMaxSession,
        ms: Date.now() - startAt,
      });

      return res.status(200).json({
        token,
        expires_in_seconds: exp,
        max_session_duration_seconds:
          tokenResp.data?.max_session_duration_seconds ?? safeMaxSession,
      });
    }

    // ------------------------------------------------------------
    // POST = pre-recorded fallback transcription (upload + poll)
    // ------------------------------------------------------------
    if (req.method !== "POST") {
      log("METHOD_NOT_ALLOWED", { method: req.method });
      return res.status(405).json({ error: "Method not allowed" });
    }

    // ✅ Rate limit expensive fallback uploads (still generous)
    const rlKey = `aai_fallback_post:${userKey}:${ip}`;
    const rl = rateLimit({ key: rlKey, limit: 10, windowMs: 10 * 60 * 1000 }); // 10 / 10 min
    if (!rl.allowed) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((rl.resetAt - Date.now()) / 1000)
      );
      res.setHeader("Retry-After", String(retryAfterSec));
      log("RATE_LIMIT_BLOCK", {
        type: "POST_FALLBACK",
        userKey,
        ip,
        retryAfterSec,
      });
      return res
        .status(429)
        .json({ error: "Too many requests. Please try again." });
    }

    log("FALLBACK_POST_START");

    const audioBuffer = await readRawBody(req);
    if (!audioBuffer?.length) {
      log("FALLBACK_EMPTY_BODY");
      return res.status(400).json({ error: "Empty audio body" });
    }

    const contentType =
      req.headers["content-type"] || "application/octet-stream";

    const MAX_BYTES = 25 * 1024 * 1024; // 25MB
    if (audioBuffer.length > MAX_BYTES) {
      log("FALLBACK_TOO_LARGE", {
        bytes: audioBuffer.length,
        maxBytes: MAX_BYTES,
      });
      return res.status(413).json({
        error: "Audio too large for pre-recorded fallback",
        maxBytes: MAX_BYTES,
      });
    }

    log("FALLBACK_BODY_OK", { bytes: audioBuffer.length, contentType });

    if (closed) return;

    // 1) Upload audio
    log("UPLOAD_START");

    const uploadResp = await ax.post(
      "https://api.assemblyai.com/v2/upload",
      audioBuffer,
      {
        headers: {
          Authorization: apiKey,
          "Content-Type": contentType,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 60_000,
      }
    );

    const audio_url = uploadResp.data?.upload_url;
    if (!audio_url) {
      log("UPLOAD_ERR", { reason: "missing_upload_url" });
      return res.status(500).json({ error: "AssemblyAI upload failed" });
    }

    log("UPLOAD_OK");

    if (closed) return;

    // 2) Start transcript job
    log("TRANSCRIPT_CREATE_START");

    const createResp = await ax.post(
      "https://api.assemblyai.com/v2/transcript",
      {
        audio_url,
        language_code: "en",
        disfluencies: true,
        format_text: false,
        punctuate: false,
      },
      {
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        timeout: 30_000,
      }
    );

    const id = createResp.data?.id;
    if (!id) {
      log("TRANSCRIPT_CREATE_ERR", { reason: "missing_id" });
      return res.status(500).json({
        error: "AssemblyAI transcript create failed",
      });
    }

    log("TRANSCRIPT_CREATE_OK", { id });

    // 3) Poll
    const deadlineMs = Date.now() + 90_000;
    let pollCount = 0;

    while (Date.now() < deadlineMs) {
      if (closed) return;

      pollCount += 1;

      const t = await ax.get(`https://api.assemblyai.com/v2/transcript/${id}`, {
        timeout: 20_000,
      });

      const status = t.data?.status;

      if (pollCount % 3 === 0) {
        log("POLL", { id, status, pollCount, ms: Date.now() - startAt });
      }

      if (status === "completed") {
        const text = t.data?.text || "";
        log("DONE", {
          id,
          textLen: text.length,
          confidence: t.data?.confidence ?? null,
          ms: Date.now() - startAt,
        });

        return res.status(200).json({
          text,
          words: t.data?.words || null,
          confidence: t.data?.confidence ?? null,
          id,
        });
      }

      if (status === "error") {
        log("ERR_STATUS", {
          id,
          ms: Date.now() - startAt,
          detailsType: typeof t.data?.error,
        });

        return res.status(500).json({
          error: "AssemblyAI transcription error",
          details: t.data?.error || "unknown",
          id,
        });
      }

      await sleep(1200);
    }

    log("TIMEOUT", { id, ms: Date.now() - startAt });
    return res.status(504).json({ error: "Transcription timed out", id });
  } catch (err) {
    if (err?.name === "AbortError" || ac.signal.aborted) {
      log("ABORTED", { ms: Date.now() - startAt });
      try {
        // ✅ Avoid non-standard 499; client is gone anyway
        if (!res.headersSent) return res.status(204).end();
      } catch {}
      return;
    }

    log("ERROR", {
      message: err?.message || "unknown",
      status: err?.response?.status || 500,
      ms: Date.now() - startAt,
    });

    console.error("AssemblyAI API error:", err?.response?.data || err);

    return res.status(500).json({
      error: err.message || "Server error",
      details: err?.response?.data || null,
    });
  } finally {
    try {
      req.off("close", onClose);
      req.off("aborted", onClose);
      res.off("close", onClose);
    } catch {}
  }
}
