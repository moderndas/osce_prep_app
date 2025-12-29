// pages/api/stations/respond.js
import dbConnect from "../../../lib/db";
import Station from "../../../models/Station";
import { requireAuth } from "../../../lib/auth-clerk";
import mongoose from "mongoose";

// -----------------------------
// Script-only enforcement helpers
// -----------------------------
function normalizeForMatch(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s) {
  const t = normalizeForMatch(s);
  if (!t) return [];
  return t.split(" ").filter(Boolean);
}

function tokenJaccard(a, b) {
  const A = new Set(tokenize(a));
  const B = new Set(tokenize(b));
  if (!A.size || !B.size) return 0;

  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;

  const union = A.size + B.size - inter;
  return union ? inter / union : 0;
}

function extractAllowedPatientLines(systemPrompt) {
  const lines = [];
  const re = /^Assistant:\s*(.+)$/gim;
  let m;
  while ((m = re.exec(systemPrompt || "")) !== null) {
    const line = (m[1] || "").trim();
    if (line) lines.push(line);
  }
  return lines;
}

// ✅ find the canonical allowed line, even if caller has different casing/punctuation
function findCanonicalAllowedLine(allowed, candidate) {
  const cNorm = normalizeForMatch(candidate);
  if (!cNorm) return null;

  // exact normalized match
  for (const a of allowed) {
    if (normalizeForMatch(a) === cNorm) return a;
  }

  // soft match: pick very close line (prevents tiny wording differences from breaking)
  let best = { score: 0, line: null };
  for (const a of allowed) {
    const s = tokenJaccard(a, candidate);
    if (s > best.score) best = { score: s, line: a };
  }

  // keep conservative
  if (best.score >= 0.86) return best.line;
  return null;
}

function enforceScriptOnlyReply(replyText, systemPrompt, fallback = "") {
  const allowed = extractAllowedPatientLines(systemPrompt);
  const raw = (replyText || "").trim();
  if (!raw) return fallback;

  // exact match
  if (allowed.includes(raw)) return raw;

  // normalized/near match -> return canonical allowed line
  const canon = findCanonicalAllowedLine(allowed, raw);
  if (canon) return canon;

  return fallback;
}

// ✅ pick a confirm token that actually exists in script Assistant lines
function pickConfirmReplyFromScript(systemPrompt) {
  const allowed = extractAllowedPatientLines(systemPrompt);
  const candidates = ["ok", "Ok", "okay", "Okay", "yes", "Yes"];

  for (const c of candidates) {
    if (allowed.includes(c)) return c;
  }

  // If script has no confirm tokens at all, default to "ok"
  return "ok";
}

function extractScriptPairs(systemPrompt) {
  const pairs = [];
  const lines = (systemPrompt || "").split("\n");
  let lastUser = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (/^User:\s*/i.test(line)) {
      lastUser = line.replace(/^User:\s*/i, "").trim();
      continue;
    }

    if (/^Assistant:\s*/i.test(line)) {
      const a = line.replace(/^Assistant:\s*/i, "").trim();
      if (lastUser) {
        pairs.push({ user: lastUser, assistant: a });
        lastUser = null;
      }
    }
  }

  return pairs;
}

function chooseScriptReply(userText, systemPrompt) {
  const pairs = extractScriptPairs(systemPrompt);
  if (!pairs.length) return null;

  const ut = normalizeForMatch(userText);
  if (!ut) return null;

  let best = { score: 0, assistant: "", trigger: "" };

  for (const p of pairs) {
    const trigger = normalizeForMatch(p.user);
    if (!trigger) continue;

    let score = tokenJaccard(ut, trigger);

    if (ut.includes(trigger) || trigger.includes(ut)) score += 0.25;
    if (ut.includes("?") && trigger.includes("?")) score += 0.1;

    if (score > best.score) {
      best = { score, assistant: p.assistant, trigger: p.user };
    }
  }

  const THRESH = 0.42;
  if (best.score >= THRESH && best.assistant) {
    return { text: best.assistant, score: best.score, trigger: best.trigger };
  }

  return null;
}

// -----------------------------
// ✅ sanitize client-provided chat history (do NOT trust it)
// -----------------------------
function sanitizeChatHistory(chatHistory) {
  if (!Array.isArray(chatHistory)) return [];

  const cleaned = [];
  for (const m of chatHistory) {
    const role = m?.role;
    const content = typeof m?.content === "string" ? m.content : "";

    if (role !== "user" && role !== "assistant") continue;
    if (!content.trim()) continue;

    const capped = content.trim().slice(0, 600);
    cleaned.push({ role, content: capped });
  }

  return cleaned.slice(-12);
}

function getLastAssistantText(history) {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]?.role === "assistant") {
      return String(history[i]?.content || "");
    }
  }
  return "";
}

function includesAny(needleTextNorm, keywords = []) {
  const t = String(needleTextNorm || "");
  if (!t) return false;
  if (!Array.isArray(keywords) || !keywords.length) return false;

  for (const k of keywords) {
    const kn = normalizeForMatch(k);
    if (!kn) continue;
    if (t.includes(kn)) return true;
  }
  return false;
}

// -----------------------------
// ✅ 5-minute interrupt follow-up: deterministic server-side handling
// Uses station.fiveMinuteRules.* (keywords + replies)
// -----------------------------
function handleFiveMinuteFollowUpIfNeeded({
  station,
  systemPrompt,
  history,
  userText,
}) {
  const fiveQ = String(station?.fiveMinuteQuestion || "").trim();
  if (!fiveQ) return null;

  const lastA = getLastAssistantText(history).trim();
  if (!lastA) return null;

  // Only apply follow-up rules if the LAST assistant line was the 5-min question
  if (normalizeForMatch(lastA) !== normalizeForMatch(fiveQ)) return null;

  const rules = station?.fiveMinuteRules || {};
  const allowed = extractAllowedPatientLines(systemPrompt);
  const confirmText = pickConfirmReplyFromScript(systemPrompt);

  const ut = normalizeForMatch(userText);

  // ✅ configurable keywords (with safe defaults)
  const counterKw =
    Array.isArray(rules.counterQuestionKeywords) &&
    rules.counterQuestionKeywords.length
      ? rules.counterQuestionKeywords
      : [
          "what do you mean",
          "why are you asking",
          "why are you asking?",
          "why do you ask",
          "can you explain what you mean",
          "what do you mean by",
        ];

  const endKw =
    Array.isArray(rules.endConversationKeywords) &&
    rules.endConversationKeywords.length
      ? rules.endConversationKeywords
      : [
          "any other questions",
          "anything else",
          "any questions",
          "no more questions",
          "we are done",
          "that is all",
          "that's all",
          "thats all",
        ];

  const isCounter = includesAny(ut, counterKw);
  const isEndish = includesAny(ut, endKw);

  // ✅ configurable replies (must exist as Assistant: lines somewhere in systemPrompt)
  const desiredCounter =
    String(rules.counterQuestionReply || "").trim() ||
    "I just want to know when I should expect to feel better.";

  const desiredEnd =
    String(rules.endConversationReply || "").trim() || "No, that's all.";

  // For “answered normally” OR “something else not covered” -> default reply
  // If admin sets defaultReply, we try to use it; else use confirmText (script-safe)
  const desiredDefault = String(rules.defaultReply || "").trim() || confirmText;

  let desired = desiredDefault;
  if (isCounter) desired = desiredCounter;
  else if (isEndish) desired = desiredEnd;

  // return exact canonical allowed line if present; else fall back to confirm
  const canon = findCanonicalAllowedLine(allowed, desired);
  return {
    assistantText: canon || confirmText,
    route: "FIVE_MIN_FOLLOWUP_RULE",
  };
}

// -----------------------------
// OpenAI call (reuses your existing /api/openai-stream)
// -----------------------------
async function callOpenAIStream(req, messages) {
  const baseUrl =
    process.env.APP_BASE_URL ||
    `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}`;

  const r = await fetch(`${baseUrl}/api/openai-stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(req.headers["x-request-id"]
        ? { "X-Request-Id": req.headers["x-request-id"] }
        : {}),
    },
    body: JSON.stringify({ messages }),
  });

  if (!r.ok) {
    throw new Error("Failed to get response from OpenAI");
  }

  const text = await r.text();
  return String(text || "").trim();
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
    }

    const auth = await requireAuth(req, res);
    if (!auth) return;

    await dbConnect();

    const { stationId, userText, intentType, chatHistory } = req.body || {};

    if (!stationId || !mongoose.Types.ObjectId.isValid(stationId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid stationId" });
    }
    if (!userText || !String(userText).trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Missing userText" });
    }

    const station = await Station.findById(stationId);
    if (!station) {
      return res
        .status(404)
        .json({ success: false, message: "Station not found" });
    }

    const isAdmin = auth.user?.role === "admin";

    if (!isAdmin && !station.isPublic) {
      return res
        .status(403)
        .json({ success: false, message: "This station is not available" });
    }

    const systemPrompt = String(station.systemPrompt || "").trim();

    if (!systemPrompt) {
      const fallback = intentType === "confirm" ? "ok" : "I'm not sure.";
      return res.status(200).json({
        success: true,
        data: { assistantText: fallback, route: "NO_SCRIPT_FALLBACK" },
      });
    }

    // ✅ Confirm fast-path (script-respecting)
    if (intentType === "confirm") {
      const confirmText = pickConfirmReplyFromScript(systemPrompt);
      return res.status(200).json({
        success: true,
        data: { assistantText: confirmText, route: "FAST_CONFIRM" },
      });
    }

    const history = sanitizeChatHistory(chatHistory);

    // ✅ 5-minute follow-up deterministic handling (no OpenAI guessing)
    const fiveMinRuleHit = handleFiveMinuteFollowUpIfNeeded({
      station,
      systemPrompt,
      history,
      userText: String(userText),
    });
    if (fiveMinRuleHit) {
      return res.status(200).json({
        success: true,
        data: {
          assistantText: fiveMinRuleHit.assistantText,
          route: fiveMinRuleHit.route,
        },
      });
    }

    // ✅ Local script match fast-path
    const match = chooseScriptReply(String(userText), systemPrompt);
    if (match?.text) {
      const fallback = pickConfirmReplyFromScript(systemPrompt);
      const enforced = enforceScriptOnlyReply(
        match.text,
        systemPrompt,
        fallback
      );
      return res.status(200).json({
        success: true,
        data: {
          assistantText: enforced,
          route: "FAST_SCRIPT_MATCH",
          score: Number(match.score?.toFixed?.(2) || 0),
        },
      });
    }

    // ✅ OpenAI slow path (still script-locked)
    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: String(userText).trim().slice(0, 700) },
    ];

    const raw = await callOpenAIStream(req, messages);

    // ✅ script-safe fallback (never "I'm not sure." unless it's in script)
    const fallback = pickConfirmReplyFromScript(systemPrompt);
    const enforced = enforceScriptOnlyReply(raw, systemPrompt, fallback);

    return res.status(200).json({
      success: true,
      data: { assistantText: enforced, route: "OPENAI" },
    });
  } catch (e) {
    console.error("API /api/stations/respond error:", e);
    return res.status(500).json({
      success: false,
      message: e?.message || "Internal server error",
    });
  }
}
