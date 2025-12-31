// pages/api/openai-stream.js
import OpenAI from "openai";
import crypto from "crypto";

function rid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export default async function handler(req, res) {
  const requestId = req.headers["x-request-id"] || rid();
  const log = (event, meta = {}) =>
    console.log(
      JSON.stringify({
        tag: "OSCE_PIPE",
        svc: "openai-stream",
        event,
        requestId,
        ts: new Date().toISOString(),
        ...meta,
      })
    );

  const startAt = Date.now();

  if (req.method !== "POST") {
    log("METHOD_NOT_ALLOWED", { method: req.method });
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("X-Request-Id", requestId);

  // Abort OpenAI streaming if client disconnects
  const ac = new AbortController();
  let aborted = false;

  const onClose = () => {
    if (aborted) return;
    aborted = true;
    log("CLIENT_DISCONNECT");
    try {
      ac.abort();
    } catch {}
  };

  req.on("close", onClose);
  req.on("aborted", onClose);
  res.on("close", onClose);

  try {
    if (!process.env.OPENAI_API_KEY) {
      log("ENV_MISSING", { key: "OPENAI_API_KEY" });
      return res.status(500).json({ error: "OPENAI_API_KEY is missing" });
    }

    const { messages, temperature = 0.7, model = "gpt-4o" } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      log("BAD_REQUEST", { reason: "messages_missing_or_empty" });
      return res
        .status(400)
        .json({ error: "messages must be a non-empty array" });
    }

    // Basic safe telemetry (no content)
    const sysLen = String(messages?.[0]?.content || "").length;
    const lastUser = [...messages].reverse().find((m) => m?.role === "user");
    const lastUserLen = String(lastUser?.content || "").length;

    log("REQ", {
      msgCount: messages.length,
      temperature,
      model,
      sysLen,
      lastUserLen,
    });

    // Streaming-friendly headers
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // ✅ signal must be 2nd argument (options)
    const stream = await openai.chat.completions.create(
      {
        model,
        messages,
        temperature,
        stream: true,
      },
      { signal: ac.signal }
    );

    log("STREAM_OPEN");

    let totalChars = 0;
    let chunks = 0;
    let lastLogAt = 0;
    let firstTokenLogged = false;

    for await (const chunk of stream) {
      const content = chunk?.choices?.[0]?.delta?.content || "";
      if (!content) continue;

      if (!firstTokenLogged) {
        firstTokenLogged = true;
        log("STREAM_FIRST_TOKEN", { msToFirstToken: Date.now() - startAt });
      }

      if (res.writableEnded) break;

      res.write(content);
      chunks += 1;
      totalChars += content.length;

      const now = Date.now();
      if (now - lastLogAt > 1000) {
        lastLogAt = now;
        log("STREAM_PROGRESS", { chunks, totalChars });
      }
    }

    log("DONE", { chunks, totalChars, ms: Date.now() - startAt });

    try {
      if (!res.writableEnded) res.end();
    } catch {}
  } catch (error) {
    if (error?.name === "AbortError" || ac.signal.aborted) {
      log("ABORTED", { ms: Date.now() - startAt });
      try {
        if (!res.writableEnded) res.end();
      } catch {}
      return;
    }

    log("ERROR", { message: error?.message || "unknown_error" });
    console.error("OpenAI streaming error:", error);

    try {
      if (!res.headersSent) {
        return res.status(500).json({ error: error.message || "Server error" });
      }
      if (!res.writableEnded) res.end();
    } catch {}
  } finally {
    try {
      req.off("close", onClose);
      req.off("aborted", onClose);
      res.off("close", onClose);
    } catch {}
  }
}
