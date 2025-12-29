// pages/api/anamanalysis.js
import crypto from "crypto";
import { analysisPrompt as defaultAnalysisPrompt } from "../../src/config/analysisConfig";
import OpenAI from "openai";

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
        svc: "anamanalysis",
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

  // Cancel OpenAI work if client disconnects
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

  try {
    if (!process.env.OPENAI_API_KEY) {
      log("ENV_MISSING", { key: "OPENAI_API_KEY" });
      return res.status(500).json({ error: "OPENAI_API_KEY is missing" });
    }

    // ✅ Guard: req.body can sometimes be a string (depends on client / middleware)
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { userTurns = [], assistantTurns = [], analysisPrompt } = body || {};

    const safeUserTurns = Array.isArray(userTurns) ? userTurns : [];
    const safeAssistantTurns = Array.isArray(assistantTurns)
      ? assistantTurns
      : [];

    log("REQ", {
      userTurns: safeUserTurns.length,
      assistantTurns: safeAssistantTurns.length,
      hasCustomPrompt: Boolean(analysisPrompt),
    });

    if (safeUserTurns.length === 0 && safeAssistantTurns.length === 0) {
      log("NO_TURNS");
      return res.status(400).json({ error: "No turns provided" });
    }

    const promptToUse = (
      analysisPrompt ||
      defaultAnalysisPrompt ||
      ""
    ).toString();

    const messages = [{ role: "system", content: promptToUse }];

    if (safeAssistantTurns.length > 0) {
      const maxLen = Math.max(safeUserTurns.length, safeAssistantTurns.length);
      for (let i = 0; i < maxLen; i++) {
        const u = safeUserTurns[i];
        const a = safeAssistantTurns[i];
        if (typeof u === "string" && u.trim())
          messages.push({ role: "user", content: u.trim() });
        if (typeof a === "string" && a.trim())
          messages.push({ role: "assistant", content: a.trim() });
      }
    } else {
      safeUserTurns.forEach((t) => {
        if (typeof t === "string" && t.trim())
          messages.push({ role: "user", content: t.trim() });
      });
    }

    log("MESSAGES_BUILT", {
      count: messages.length,
      promptLen: promptToUse.length,
    });

    if (closed) return;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    log("OPENAI_CALL_START", { model: "gpt-4o" });

    // ✅ FIX: signal goes in 2nd argument (options)
    const resp = await openai.chat.completions.create(
      {
        model: "gpt-4o",
        messages,
        temperature: 0,
      },
      { signal: ac.signal }
    );

    if (closed) return;

    const analysis = resp?.choices?.[0]?.message?.content || "";

    log("OPENAI_CALL_OK", {
      analysisLen: analysis.length,
      ms: Date.now() - startAt,
    });

    return res.status(200).json({ analysis });
  } catch (err) {
    if (err?.name === "AbortError" || ac.signal.aborted) {
      log("ABORTED", { ms: Date.now() - startAt });
      try {
        if (!res.headersSent)
          return res.status(499).json({ error: "Client closed" });
      } catch {}
      return;
    }

    log("ERROR", {
      message: err?.message || "unknown_error",
      ms: Date.now() - startAt,
    });
    console.error("anamanalysis error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  } finally {
    try {
      req.off("close", onClose);
      req.off("aborted", onClose);
      res.off("close", onClose);
    } catch {}
  }
}
