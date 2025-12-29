// components/StationDetail.jsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

import StationReferences from "./StationReferences";

// ✅ HeyGen
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
} from "@heygen/streaming-avatar";

// ✅ browser-safe request id (no server crypto)
function makeRequestId() {
  try {
    if (globalThis?.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {}
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * STRICT: only respond when user clearly prompts the patient:
 * - explicit question mark
 * - explicit confirmations ("okay?", "is that okay", "do you understand", etc.)
 * - explicit patient-directed prompts ("any questions/concerns", "how can I help")
 *
 * ✅ IMPORTANT FIX:
 * Some STT outputs drop punctuation. So if a LONG monologue ends with "ok/okay",
 * treat it as confirm even without "?".  (already applied in your paste ✅)
 */
function classifyUserIntent(text) {
  const raw = (text || "").trim();
  const t = raw.toLowerCase();
  if (!t) return { respond: false, type: "none" };

  // ✅ accept short confirm tokens as confirms
  if (t === "ok" || t === "okay" || t === "yes") {
    return { respond: true, type: "confirm" };
  }

  const hasQMark = t.includes("?");

  const confirmSignals = [
    "do you understand",
    "is that okay",
    "is that ok",
    "okay?",
    "ok?",
    "understand?",
    "make sense",
    "alright?",
    "all right?",
    "any questions",
    "any question",
    "any concerns",
    "any concern",
  ];

  const promptSignals = [
    "how can i help",
    "what can i help",
    "do you have",
    "can you tell me",
    "could you tell me",
    "are you",
    "did you",
    "can you",
    "could you",
    "would you",
    "what ",
    "why ",
    "how ",
    "when ",
    "where ",
    "which ",
  ];

  // confirm-style (usually expects ok/yes)
  if (confirmSignals.some((s) => t.includes(s))) {
    return { respond: true, type: "confirm" };
  }

  // punctuation may be missing: long monologue ending with ok/okay
  const endsWithOk = /(\bok\b|\bokay\b)\s*$/.test(t);
  if (endsWithOk && raw.length >= 18) {
    return { respond: true, type: "confirm" };
  }

  // question-style
  if (hasQMark || promptSignals.some((s) => t.startsWith(s) || t.includes(s))) {
    return { respond: true, type: "question" };
  }

  // default: monologue / statement => do not respond
  return { respond: false, type: "statement" };
}

// ✅ NEW: decide what to do right after the 5-min question
function decideFiveMinNextIntent(userText, fiveMinuteRules) {
  const raw = String(userText || "");
  const t = raw.toLowerCase();

  // ✅ strongest signal: our intent classifier (handles no "?" cases like "what if", "how long", etc.)
  const classified = classifyUserIntent(raw);
  if (classified?.type === "question") return "question";

  // If STT kept '?', treat as question
  if (t.includes("?")) return "question";

  // Optional keyword detection (future-proof)
  const keywords = Array.isArray(fiveMinuteRules?.counterQuestionKeywords)
    ? fiveMinuteRules.counterQuestionKeywords
    : [];

  if (keywords.some((k) => k && t.includes(String(k).toLowerCase()))) {
    return "question";
  }

  const fallback = fiveMinuteRules?.defaultNextIntentType || "confirm";

  // We currently support "confirm" + "question" client-side.
  // If someone sets "script", treat it as confirm for now (safe).
  if (fallback === "script") return "confirm";

  return fallback; // "confirm" | "question"
}

// ============================
// ✅ Audio pacing helpers
// ============================
function clamp(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// make short replies feel less “instant/abrupt”
async function maybePreSpeakDelay(text) {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length <= 3) {
    await sleep(160); // tweak 120–220ms if needed
  }
}

// small helper: "does this text look like a prompt that expects patient response?"
function looksLikePromptTail(text) {
  const t = String(text || "")
    .trim()
    .toLowerCase();
  if (!t) return false;
  if (t.includes("?")) return true;
  // common pharmacist confirmation endings without punctuation
  if (/(do you understand|is that ok|is that okay|okay|ok)\s*$/.test(t))
    return true;
  if (/(any questions|any concerns)\s*$/.test(t)) return true;
  return false;
}

// ✅ NEW: tiny helper for JSON POSTs (used for station usage tracking)
async function postJson(url, body, headers = {}) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body || {}),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data: j };
}

export default function StationDetail({ station }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  // ============================
  // ✅ Debug logging (minimal)
  // ============================
  const DEBUG_LOGS = true; // <- set false to silence all logs
  const sessionRequestIdRef = useRef(null);

  function log(...args) {
    if (!DEBUG_LOGS) return;
    const rid = sessionRequestIdRef.current
      ? String(sessionRequestIdRef.current).slice(0, 8)
      : "noRID";
    console.log(`[OSCE:${rid}]`, ...args);
  }

  function apiHeaders(extra = {}) {
    const rid = sessionRequestIdRef.current;
    return {
      "Content-Type": "application/json",
      ...(rid ? { "X-Request-Id": rid } : {}),
      ...extra,
    };
  }

  // ✅ Usage tracking refs (credit/trial enforcement is server-side)
  const stationUsageIdRef = useRef(null);
  const stationModeRef = useRef(null); // "trial" or "paid"
  const usageEndSentRef = useRef(false);
  const usageStartedAtMsRef = useRef(null);

  async function markUsageEnded(durationSeconds) {
    if (usageEndSentRef.current) return;
    if (!stationUsageIdRef.current) return;

    usageEndSentRef.current = true;

    const dur =
      typeof durationSeconds === "number"
        ? durationSeconds
        : usageStartedAtMsRef.current
        ? Math.max(
            0,
            Math.floor((Date.now() - usageStartedAtMsRef.current) / 1000)
          )
        : 0;

    try {
      await postJson(
        "/api/stations/end",
        {
          usageId: stationUsageIdRef.current,
          durationSeconds: dur,
        },
        sessionRequestIdRef.current
          ? { "X-Request-Id": sessionRequestIdRef.current }
          : {}
      );

      log("USAGE_ENDED_SENT", {
        usageId: stationUsageIdRef.current,
        durationSeconds: dur,
        mode: stationModeRef.current,
      });
    } catch (e) {
      console.error("Failed to mark usage end:", e);
    }
  }

  // HeyGen refs
  const avatarRef = useRef(null);
  const videoRef = useRef(null);

  // Guards
  const inFlightTurnRef = useRef(false);
  const endingRef = useRef(false);

  // Refs synced with state
  const isSessionActiveRef = useRef(false);
  const isSpeakingRef = useRef(false);

  // ✅ IMPORTANT CHANGE:
  // pauseSttRef now means: "pause STT streaming", NOT VAD itself.
  const pauseSttRef = useRef(false);
  const lastPauseStateRef = useRef(false);

  // ✅ Used to avoid spamming ForceEndpoint
  const endpointForcedRef = useRef(false);

  // ✅ 5-minute forced question
  const fiveMinTimerRef = useRef(null);
  const fiveMinFiredRef = useRef(false);
  const awaitingFiveMinAnswerRef = useRef(false); // ✅ one-turn branch flag

  // ✅ NEW: protect the forced interrupt question from being cut off / mis-detected
  const forcedInterruptSpeakingRef = useRef(false); // true while patient is asking forced question
  const armFiveMinAfterSpeakRef = useRef(false); // arm "awaiting answer" ONLY after question finishes

  // ✅ Processing state (show UI + handle barge-in cancel)
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const isProcessingTurnRef = useRef(false);

  // ✅ Abort + stale-guard (for /api/stations/respond)
  const respondAbortRef = useRef(null);
  const pendingReplyIdRef = useRef(0);

  // ✅ LATENCY LOGS
  const lastSpeechStartAtPerfRef = useRef(0);
  const lastSpeechEndAtPerfRef = useRef(0);
  const lastTurnAcceptedAtPerfRef = useRef(0);

  function setProcessing(v) {
    setIsProcessingTurn(v);
    isProcessingTurnRef.current = v;
  }

  function cancelPendingAssistant(reason = "cancel") {
    try {
      respondAbortRef.current?.abort?.();
    } catch {}
    respondAbortRef.current = null;

    // bump id so any awaiting handler becomes stale
    pendingReplyIdRef.current += 1;

    if (isProcessingTurnRef.current) {
      log("TURN_CANCELLED:", reason);
    }
    setProcessing(false);
  }

  // State
  const [error, setError] = useState(null);
  const [blockState, setBlockState] = useState(null);
  // blockState = null | { type: "paywall", message, stationsBalance, trialSecondsRemaining }

  const [isLoading, setIsLoading] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isUserTalking, setIsUserTalking] = useState(false);

  useEffect(() => {
    isSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    isProcessingTurnRef.current = isProcessingTurn;
  }, [isProcessingTurn]);

  // Transcript storage
  const [userTurns, setUserTurns] = useState([]);
  const userTurnsRef = useRef([]);

  const [assistantTurns, setAssistantTurns] = useState([]);
  const assistantTurnsRef = useRef([]);

  const [analysis, setAnalysis] = useState("");
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);

  // Timer
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);
  const hasBeepedRef = useRef(false);

  // Chat history for server (never store scripts client-side)
  const chatHistoryRef = useRef([]);

  // ----------------------------
  // ✅ Always-on mic + VAD
  // ----------------------------
  const micStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const vadIntervalRef = useRef(null);
  const processorRef = useRef(null);
  const zeroGainRef = useRef(null);

  // VAD state
  const speechActiveRef = useRef(false);
  const lastVoiceAtRef = useRef(0);
  const speechStartAtRef = useRef(0);
  // ✅ track sustained voice streak to ignore tiny noise spikes
  const voiceStreakMsRef = useRef(0);

  // ✅ anti-spam acceptance filters
  const lastAcceptedTextRef = useRef("");
  const lastAcceptedAtRef = useRef(0);

  // ✅ Hang-time finalize (GPT mic feel)
  const pendingFinalizeRef = useRef(false);
  const pendingFinalizeTimerRef = useRef(null);

  // ----------------------------
  // ✅ AssemblyAI streaming (ONE WS per session)
  // ----------------------------
  const wsRef = useRef(null);
  const wsReadyRef = useRef(false);

  // current partial text for the *active* user turn
  const currentTurnTextRef = useRef("");

  // per-turn "final transcript" awaiter
  const awaitingFinalRef = useRef(false);
  const finalResolverRef = useRef(null);
  const finalRejecterRef = useRef(null);

  // ----------------------------
  // ✅ PCM capture (fallback) — NO MediaRecorder
  // ----------------------------
  const pcmCaptureActiveRef = useRef(false);
  const pcmChunksRef = useRef([]); // Int16Array chunks at 16kHz mono

  // ----------------------------
  // ✅ Tunables
  // ----------------------------
  const VAD_POLL_MS = 50;

  // ✅ Dynamic silence/hang (protect long monologues + reduce latency for short prompts)
  const SILENCE_SHORT_MS = 650; // faster for short turns
  const SILENCE_NORMAL_MS = 850; // default
  const SILENCE_LONG_MS = 1250; // protect thinking pauses in long monologues

  const MIN_SPEECH_MS = 350;
  const RMS_THRESHOLD = 0.022;

  const MIN_TURN_CHARS = 6;
  const MIN_TURN_WORDS = 2;

  const HANG_SHORT_MS = 200; // snappier
  const HANG_NORMAL_MS = 280; // default
  const HANG_LONG_MS = 380; // keep safe for long speech

  // small "settle" wait to let final tokens arrive (bounded)
  const FINAL_TEXT_SETTLE_MS = 120;

  function cancelPendingFinalize() {
    pendingFinalizeRef.current = false;
    endpointForcedRef.current = false;
    if (pendingFinalizeTimerRef.current) {
      clearTimeout(pendingFinalizeTimerRef.current);
      pendingFinalizeTimerRef.current = null;
    }
  }

  function startTimer() {
    clearInterval(timerRef.current);
    setSeconds(0);
    hasBeepedRef.current = false;

    timerRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev + 1 === 300 && !hasBeepedRef.current) {
          hasBeepedRef.current = true;
          new Audio("/sounds/beep.mp3").play().catch(() => {});
        }

        if (prev + 1 >= 420) {
          clearInterval(timerRef.current);
          handleSessionEnd();
          return prev;
        }

        return prev + 1;
      });
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerRef.current);
  }

  async function getHeygenToken() {
    const r = await fetch("/api/heygen/create-token", {
      method: "POST",
      headers: sessionRequestIdRef.current
        ? { "X-Request-Id": sessionRequestIdRef.current }
        : {},
    });

    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || "Failed to create HeyGen token");
    if (!j?.token) throw new Error("No HeyGen token returned");
    return j.token;
  }

  // ----------------------------
  // ✅ Audio helpers
  // ----------------------------
  function computeRms(float32) {
    let sum = 0;
    for (let i = 0; i < float32.length; i++) sum += float32[i] * float32[i];
    return Math.sqrt(sum / float32.length);
  }

  function downsampleBuffer(buffer, sampleRate, outRate) {
    if (outRate === sampleRate) return buffer;
    if (outRate > sampleRate) return buffer;
    const ratio = sampleRate / outRate;
    const newLen = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLen);
    let offset = 0;

    for (let i = 0; i < newLen; i++) {
      const nextOffset = Math.round((i + 1) * ratio);
      let sum = 0;
      let count = 0;

      for (let j = offset; j < nextOffset && j < buffer.length; j++) {
        sum += buffer[j];
        count++;
      }

      result[i] = count ? sum / count : 0;
      offset = nextOffset;
    }

    return result;
  }

  function floatTo16BitPCM(float32) {
    const out = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      let s = Math.max(-1, Math.min(1, float32[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }

  function encodeWavFromInt16Mono(int16, sampleRate = 16000) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = int16.length * 2;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    function writeStr(off, s) {
      for (let i = 0; i < s.length; i++)
        view.setUint8(off + i, s.charCodeAt(i));
    }

    writeStr(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, "WAVE");

    writeStr(12, "fmt ");
    view.setUint32(16, 16, true); // PCM
    view.setUint16(20, 1, true); // audio format = PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    writeStr(36, "data");
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < int16.length; i++, offset += 2) {
      view.setInt16(offset, int16[i], true);
    }

    return new Blob([buffer], { type: "audio/wav" });
  }

  function startPcmCapture({ force = false } = {}) {
    pcmChunksRef.current = [];
    pcmCaptureActiveRef.current = false;

    // if STT paused and not forced, don't capture
    if (pauseSttRef.current && !force) return;

    pcmCaptureActiveRef.current = true;
  }

  function stopPcmCaptureToWavBlob() {
    pcmCaptureActiveRef.current = false;

    const chunks = pcmChunksRef.current || [];
    if (!chunks.length) return null;

    let total = 0;
    for (const c of chunks) total += c.length;
    if (!total) return null;

    const all = new Int16Array(total);
    let off = 0;
    for (const c of chunks) {
      all.set(c, off);
      off += c.length;
    }

    pcmChunksRef.current = [];
    return encodeWavFromInt16Mono(all, 16000);
  }

  // ----------------------------
  // ✅ AssemblyAI session WS (single token, single WS)
  // ----------------------------
  async function getAssemblyStreamingToken() {
    const rid = sessionRequestIdRef.current;

    const r = await fetch(
      "/api/assemblyai?expires_in_seconds=600&max_session_duration_seconds=420",
      {
        headers: rid ? { "X-Request-Id": rid } : {},
      }
    );

    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || "Failed to get AssemblyAI token");
    if (!j?.token) throw new Error("No AssemblyAI token returned");
    return j.token;
  }

  function closeWsSilently() {
    try {
      wsRef.current?.close?.();
    } catch {}
    wsRef.current = null;
    wsReadyRef.current = false;

    awaitingFinalRef.current = false;
    try {
      finalRejecterRef.current?.(new Error("ws_closed"));
    } catch {}
    finalResolverRef.current = null;
    finalRejecterRef.current = null;
  }

  function sendPcmToAssembly(int16Chunk) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== 1) return;
    try {
      ws.send(int16Chunk.buffer);
    } catch {}
  }

  function forceEndpointOnly() {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== 1 || !wsReadyRef.current) return;
    try {
      ws.send(JSON.stringify({ type: "ForceEndpoint" }));
    } catch {}
  }

  function terminateAssemblySession() {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1 && wsReadyRef.current) {
      try {
        ws.send(JSON.stringify({ type: "Terminate" }));
      } catch {}
    }
    closeWsSilently();
  }

  function beginNewTurnFinalAwaiter() {
    currentTurnTextRef.current = "";
    awaitingFinalRef.current = true;

    finalResolverRef.current = null;
    finalRejecterRef.current = null;

    return new Promise((resolve, reject) => {
      finalResolverRef.current = (txt) => {
        resolve(String(txt || "").trim());
      };
      finalRejecterRef.current = reject;
    });
  }

  async function waitForFinalOrTimeout(promise, timeoutMs) {
    let t = null;
    try {
      return await Promise.race([
        promise,
        new Promise((resolve) => {
          t = setTimeout(() => resolve(""), timeoutMs);
        }),
      ]);
    } finally {
      if (t) clearTimeout(t);
    }
  }

  async function startAssemblyStreamingSession() {
    if (wsRef.current) return;
    const token = await getAssemblyStreamingToken();

    const url = `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&encoding=pcm_s16le&token=${encodeURIComponent(
      token
    )}`;

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      wsReadyRef.current = false;

      ws.onopen = () => {
        wsReadyRef.current = true;
        resolve();
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);

          if (typeof msg?.transcript === "string") {
            currentTurnTextRef.current = msg.transcript.trim();
          } else if (typeof msg?.text === "string") {
            currentTurnTextRef.current = msg.text.trim();
          }

          const end = msg?.type === "Turn" && msg?.end_of_turn === true;

          if (end && awaitingFinalRef.current) {
            awaitingFinalRef.current = false;
            const finalText = (currentTurnTextRef.current || "").trim();
            console.log("[OSCE] AAI_TURN_FINAL:", finalText);
            try {
              finalResolverRef.current?.(finalText);
            } catch {}
            finalResolverRef.current = null;
            finalRejecterRef.current = null;
          }
        } catch {
          // ignore
        }
      };

      ws.onerror = () => {
        reject(new Error("AssemblyAI streaming error"));
        closeWsSilently();
      };

      ws.onclose = () => {
        wsReadyRef.current = false;
      };
    });
  }

  // ----------------------------
  // ✅ Fallback pre-recorded transcription (WAV blob)
  // ----------------------------
  async function transcribeFallbackPreRecorded(blob) {
    const arrayBuf = await blob.arrayBuffer();
    const rid = sessionRequestIdRef.current;

    const res = await fetch("/api/assemblyai", {
      method: "POST",
      headers: {
        "Content-Type": blob?.type || "application/octet-stream",
        ...(rid ? { "X-Request-Id": rid } : {}),
      },
      body: arrayBuf,
    });

    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || "Fallback transcription failed");
    return (j?.text || "").trim();
  }

  // ✅ Decide if we accept this text as a “real” user turn
  function shouldAcceptTurn(text) {
    const t = (text || "").trim();
    if (!t) {
      log("TURN_REJECT: empty");
      return false;
    }

    const low = t.toLowerCase().trim();

    if (low === "ok" || low === "okay" || low === "yes") {
      log("TURN_ACCEPT: short_confirm", t);

      lastAcceptedTextRef.current = t;
      lastAcceptedAtRef.current = Date.now();
      return true;
    }

    const words = t.split(/\s+/).filter(Boolean);
    if (t.length < MIN_TURN_CHARS) {
      log("TURN_REJECT: too_short_chars", { len: t.length, text: t });
      return false;
    }
    if (words.length < MIN_TURN_WORDS) {
      log("TURN_REJECT: too_few_words", { words: words.length, text: t });
      return false;
    }

    const badExact = new Set(["uh", "um", "hmm", "thanks"]);
    if (badExact.has(low)) {
      log("TURN_REJECT: filler_exact", t);
      return false;
    }

    const now = Date.now();
    if (
      low === (lastAcceptedTextRef.current || "").toLowerCase() &&
      now - lastAcceptedAtRef.current < 1500
    ) {
      log("TURN_REJECT: dedupe", t);
      return false;
    }

    lastAcceptedTextRef.current = t;
    lastAcceptedAtRef.current = now;
    return true;
  }

  function recordUserOnlyTurn(userText) {
    setUserTurns((prev) => {
      const next = [...prev, userText];
      userTurnsRef.current = next;
      return next;
    });
    log("TURN_RECORDED_ONLY:", userText);
  }

  function getDynamicThresholds({ speechMs, currentText }) {
    const prompty = looksLikePromptTail(currentText);

    if (speechMs < 1800) {
      return {
        silenceMs: prompty ? 520 : SILENCE_SHORT_MS,
        hangMs: HANG_SHORT_MS,
      };
    }

    if (speechMs >= 6500) {
      return {
        silenceMs: prompty ? SILENCE_NORMAL_MS : SILENCE_LONG_MS,
        hangMs: prompty ? HANG_NORMAL_MS : HANG_LONG_MS,
      };
    }

    return {
      silenceMs: SILENCE_NORMAL_MS,
      hangMs: HANG_NORMAL_MS,
    };
  }

  async function finalizeTurnAfterHang(stream, finalPromise) {
    if (endingRef.current) return;
    if (!isSessionActiveRef.current) return;

    speechActiveRef.current = false;
    setIsUserTalking(false);

    if (!endpointForcedRef.current && !pauseSttRef.current) {
      endpointForcedRef.current = true;
      forceEndpointOnly();
    }

    let text = "";
    if (!pauseSttRef.current && finalPromise) {
      text = await waitForFinalOrTimeout(finalPromise, 1200);
    } else {
      text = (currentTurnTextRef.current || "").trim();
    }

    if (text) {
      await sleep(FINAL_TEXT_SETTLE_MS);
      const t2 = (currentTurnTextRef.current || "").trim();
      if (t2 && t2.length > text.length) text = t2;
    }

    const hasUsableStreamingText = Boolean(text);

    let wavBlob = null;
    if (!hasUsableStreamingText) {
      wavBlob = stopPcmCaptureToWavBlob();
    } else {
      pcmCaptureActiveRef.current = false;
      pcmChunksRef.current = [];
    }

    if (!text && wavBlob) {
      try {
        text = await transcribeFallbackPreRecorded(wavBlob);
      } catch {}
    }

    if (!text) {
      log("TURN_FINALIZE: empty_text_after_finalize");
      return;
    }

    if (!shouldAcceptTurn(text)) {
      log("TURN_IGNORED:", text);
      return;
    }

    lastTurnAcceptedAtPerfRef.current = performance.now();

    // ✅ If we just asked the 5-min question, FORCE the next turn to get a patient response
    let intent = classifyUserIntent(text);

    if (awaitingFiveMinAnswerRef.current) {
      awaitingFiveMinAnswerRef.current = false;

      const nextIntentType = decideFiveMinNextIntent(
        text,
        station?.fiveMinuteRules
      );

      intent = { respond: true, type: nextIntentType };
      log("5_MIN_NEXT_TURN_FORCED", { text, nextIntentType });
    }

    log("TURN_ACCEPTED:", {
      text,
      intent,
      tail: text.slice(Math.max(0, text.length - 28)),
      speechStartToAcceptedMs: lastSpeechStartAtPerfRef.current
        ? Math.round(
            lastTurnAcceptedAtPerfRef.current - lastSpeechStartAtPerfRef.current
          )
        : null,
      speechEndToAcceptedMs: lastSpeechEndAtPerfRef.current
        ? Math.round(
            lastTurnAcceptedAtPerfRef.current - lastSpeechEndAtPerfRef.current
          )
        : null,
    });

    if (!intent.respond) {
      recordUserOnlyTurn(text);
      return;
    }

    setProcessing(true);

    if (!inFlightTurnRef.current) {
      inFlightTurnRef.current = true;
      try {
        await handleUserTurn(text, intent.type);
      } finally {
        inFlightTurnRef.current = false;
      }
    }
  }

  // ----------------------------
  // ✅ Start mic + VAD pipeline
  // ----------------------------
  async function startMicAndVad() {
    if (micStreamRef.current) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    micStreamRef.current = stream;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;

    try {
      await audioCtx.resume?.();
    } catch {}

    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;

    source.connect(analyser);

    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    const zero = audioCtx.createGain();
    zero.gain.value = 0;
    zeroGainRef.current = zero;

    source.connect(processor);
    processor.connect(zero);
    zero.connect(audioCtx.destination);

    setIsListening(true);
    log("MIC_VAD_STARTED");

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const down = downsampleBuffer(input, audioCtx.sampleRate, 16000);
      const int16 = floatTo16BitPCM(down);

      if (pcmCaptureActiveRef.current) {
        pcmChunksRef.current.push(new Int16Array(int16));
      }

      if (pauseSttRef.current) return;
      if (!wsRef.current || wsRef.current.readyState !== 1) return;

      sendPcmToAssembly(int16);
    };

    const buf = new Float32Array(analyser.fftSize);

    const activeTurnFinalPromiseRef = { current: null };

    vadIntervalRef.current = setInterval(async () => {
      if (!analyserRef.current) return;
      if (endingRef.current) return;
      if (!isSessionActiveRef.current) return;

      if (pauseSttRef.current !== lastPauseStateRef.current) {
        lastPauseStateRef.current = pauseSttRef.current;
        log(pauseSttRef.current ? "STT_PAUSED" : "STT_RESUMED");
      }

      analyserRef.current.getFloatTimeDomainData(buf);
      const rms = computeRms(buf);
      const now = Date.now();

      const voiceNow = rms > RMS_THRESHOLD;

      if (voiceNow) voiceStreakMsRef.current += VAD_POLL_MS;
      else voiceStreakMsRef.current = 0;

      if (voiceNow) {
        lastVoiceAtRef.current = now;

        if (pendingFinalizeRef.current) {
          const sustained = voiceStreakMsRef.current >= 120;
          const strong = rms > RMS_THRESHOLD * 1.8;
          if (sustained || strong) cancelPendingFinalize();
        } else {
          cancelPendingFinalize();
        }

        if (isProcessingTurnRef.current && !isSpeakingRef.current) {
          cancelPendingAssistant("user_barge_in");
        }

        if (isSpeakingRef.current) {
          // ✅ If this is our forced interrupt question, DO NOT barge-in interrupt it,
          // and DO NOT start capturing a "user turn" while it is speaking.
          if (forcedInterruptSpeakingRef.current) {
            return;
          }

          const interruptFn = avatarRef.current?.interrupt;
          if (typeof interruptFn === "function") {
            try {
              await interruptFn.call(avatarRef.current);
              log("BARGE_IN_INTERRUPT");
            } catch {}
          }

          if (!speechActiveRef.current) {
            speechActiveRef.current = true;
            speechStartAtRef.current = now;
            setIsUserTalking(true);

            lastSpeechStartAtPerfRef.current = performance.now();
            log("VAD_SPEECH_START");

            startPcmCapture({ force: true });

            if (!pauseSttRef.current) {
              activeTurnFinalPromiseRef.current = beginNewTurnFinalAwaiter();
            }
          }

          return;
        }

        if (!speechActiveRef.current) {
          speechActiveRef.current = true;
          speechStartAtRef.current = now;
          setIsUserTalking(true);

          lastSpeechStartAtPerfRef.current = performance.now();
          log("VAD_SPEECH_START");

          startPcmCapture();

          if (!pauseSttRef.current) {
            activeTurnFinalPromiseRef.current = beginNewTurnFinalAwaiter();
          }
        } else {
          if (!pauseSttRef.current && !activeTurnFinalPromiseRef.current) {
            activeTurnFinalPromiseRef.current = beginNewTurnFinalAwaiter();
          }
        }
      } else {
        if (speechActiveRef.current) {
          const speechMs = now - speechStartAtRef.current;
          const silenceMs = now - lastVoiceAtRef.current;

          if (pendingFinalizeRef.current) return;

          const snapText = (currentTurnTextRef.current || "").trim();
          const { silenceMs: needSilence, hangMs } = getDynamicThresholds({
            speechMs,
            currentText: snapText,
          });

          if (speechMs >= MIN_SPEECH_MS && silenceMs >= needSilence) {
            pendingFinalizeRef.current = true;

            lastSpeechEndAtPerfRef.current = performance.now();

            if (!endpointForcedRef.current && !pauseSttRef.current) {
              endpointForcedRef.current = true;
              forceEndpointOnly();
            }

            log("VAD_SPEECH_END -> HANG_FINALIZE", {
              speechMs,
              silenceMs,
              needSilence,
              hangMs,
              tail: snapText.slice(Math.max(0, snapText.length - 28)),
            });

            const finalPromiseSnapshot = activeTurnFinalPromiseRef.current;

            pendingFinalizeTimerRef.current = setTimeout(async () => {
              pendingFinalizeRef.current = false;
              pendingFinalizeTimerRef.current = null;
              endpointForcedRef.current = false;

              activeTurnFinalPromiseRef.current = null;

              await finalizeTurnAfterHang(stream, finalPromiseSnapshot);
            }, hangMs);
          }
        }
      }
    }, VAD_POLL_MS);
  }

  function stopMicAndVad() {
    cancelPendingFinalize();

    try {
      clearInterval(vadIntervalRef.current);
    } catch {}
    vadIntervalRef.current = null;

    setIsListening(false);
    setIsUserTalking(false);

    speechActiveRef.current = false;

    pcmCaptureActiveRef.current = false;
    pcmChunksRef.current = [];

    try {
      if (processorRef.current) processorRef.current.onaudioprocess = null;
    } catch {}
    processorRef.current = null;

    try {
      zeroGainRef.current?.disconnect?.();
    } catch {}
    zeroGainRef.current = null;

    try {
      audioCtxRef.current?.close?.();
    } catch {}
    audioCtxRef.current = null;
    analyserRef.current = null;

    try {
      micStreamRef.current?.getTracks?.().forEach((t) => t.stop());
    } catch {}
    micStreamRef.current = null;

    log("MIC_VAD_STOPPED");
  }

  // ----------------------------
  // ✅ HeyGen session lifecycle
  // ----------------------------
  const startSession = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!isLoaded || !isSignedIn) {
        setError("Please sign in to start a station.");
        return;
      }

      sessionRequestIdRef.current = makeRequestId();

      const startRes = await postJson(
        "/api/stations/start",
        { stationId: String(station?._id || "") },
        sessionRequestIdRef.current
          ? { "X-Request-Id": sessionRequestIdRef.current }
          : {}
      );

      if (!startRes.ok) {
        const msg =
          startRes.data?.error ||
          startRes.data?.message ||
          "You cannot start this station. Please buy credits.";

        const code =
          startRes.data?.code ||
          startRes.data?.errorCode ||
          startRes.data?.reason ||
          "";

        const isRestricted =
          startRes.data?.restricted === true ||
          String(code).toLowerCase().includes("restrict") ||
          String(msg).toLowerCase().includes("restricted");

        if (isRestricted) {
          log("STATION_START_RESTRICTED", {
            status: startRes.status,
            msg,
            code,
          });
          setError(null);
          setBlockState(null);
          router.push("/restricted");
          return;
        }

        log("STATION_START_PAYWALL", { status: startRes.status, msg, code });

        setError(null);
        setBlockState({
          type: "paywall",
          message: msg,
          stationsBalance: startRes.data?.stationsBalance,
          trialSecondsRemaining: startRes.data?.trialSecondsRemaining,
        });

        return;
      }

      stationUsageIdRef.current = startRes.data?.usageId || null;
      stationModeRef.current = startRes.data?.mode || null;
      usageEndSentRef.current = false;
      usageStartedAtMsRef.current = Date.now();

      log("STATION_START_ALLOWED", {
        usageId: stationUsageIdRef.current,
        mode: stationModeRef.current,
        remaining: startRes.data?.stationsBalance,
        trialRemaining: startRes.data?.trialSecondsRemaining,
      });

      setBlockState(null);
      setError(null);

      log("SESSION_START", {
        station: station?.stationName,
        avatar: station?.heygenAvatarName,
      });

      inFlightTurnRef.current = false;
      endingRef.current = false;

      setIsAnalysisComplete(false);
      setAnalysis("");

      setUserTurns([]);
      userTurnsRef.current = [];

      setAssistantTurns([]);
      assistantTurnsRef.current = [];

      chatHistoryRef.current = [];
      setIsSpeaking(false);
      isSpeakingRef.current = false;

      pauseSttRef.current = false;
      lastPauseStateRef.current = false;

      cancelPendingFinalize();
      cancelPendingAssistant("session_start_reset");

      fiveMinFiredRef.current = false;
      awaitingFiveMinAnswerRef.current = false;
      forcedInterruptSpeakingRef.current = false;
      armFiveMinAfterSpeakRef.current = false;

      if (fiveMinTimerRef.current) clearTimeout(fiveMinTimerRef.current);

      setIsSessionActive(false);
      isSessionActiveRef.current = false;

      await abortSession(true);

      await startMicAndVad();

      await startAssemblyStreamingSession();
      log("ASSEMBLY_WS_READY");

      const token = await getHeygenToken();
      const avatar = new StreamingAvatar({ token });
      avatarRef.current = avatar;

      avatar.on(StreamingEvents.STREAM_READY, (event) => {
        const stream = event.detail;
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        log("HEYGEN_STREAM_READY");
      });

      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        if (videoRef.current) videoRef.current.srcObject = null;

        setIsSpeaking(false);
        isSpeakingRef.current = false;

        pauseSttRef.current = false;

        setIsSessionActive(false);
        isSessionActiveRef.current = false;

        inFlightTurnRef.current = false;

        cancelPendingFinalize();
        cancelPendingAssistant("stream_disconnected");

        terminateAssemblySession();

        awaitingFiveMinAnswerRef.current = false;
        forcedInterruptSpeakingRef.current = false;
        armFiveMinAfterSpeakRef.current = false;

        log("HEYGEN_STREAM_DISCONNECTED");
      });

      const onAvatarStartTalking = async () => {
        setIsSpeaking(true);
        isSpeakingRef.current = true;

        setProcessing(false);

        pauseSttRef.current = true;

        cancelPendingFinalize();

        try {
          forceEndpointOnly();
        } catch {}

        const tNow = performance.now();
        const latencyFromSpeechStartMs = lastSpeechStartAtPerfRef.current
          ? Math.round(tNow - lastSpeechStartAtPerfRef.current)
          : null;
        const latencyFromSpeechEndMs = lastSpeechEndAtPerfRef.current
          ? Math.round(tNow - lastSpeechEndAtPerfRef.current)
          : null;
        const latencyFromTurnAcceptedMs = lastTurnAcceptedAtPerfRef.current
          ? Math.round(tNow - lastTurnAcceptedAtPerfRef.current)
          : null;

        log("AVATAR_START_TALKING", {
          latencyFromSpeechStartMs,
          latencyFromSpeechEndMs,
          latencyFromTurnAcceptedMs,
        });
      };

      const onAvatarStopTalking = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;

        pauseSttRef.current = false;

        // ✅ If we just finished the forced interrupt question, NOW arm the one-turn branch.
        if (armFiveMinAfterSpeakRef.current) {
          armFiveMinAfterSpeakRef.current = false;
          forcedInterruptSpeakingRef.current = false;

          // Now the *next* user turn will be treated as the 5-min answer
          awaitingFiveMinAnswerRef.current = true;

          // clear partial text so we don't accidentally reuse old monologue text
          currentTurnTextRef.current = "";
          log("5_MIN_ARMED_AFTER_QUESTION");
        }

        log("AVATAR_STOP_TALKING");
      };

      const START_EVT = StreamingEvents?.AVATAR_START_TALKING;
      const STOP_EVT = StreamingEvents?.AVATAR_STOP_TALKING;

      if (START_EVT) avatar.on(START_EVT, onAvatarStartTalking);
      if (STOP_EVT) avatar.on(STOP_EVT, onAvatarStopTalking);

      const avatarName =
        station?.heygenAvatarName?.trim() || "Anastasia_Grey_Shirt_public";

      const voiceRate = clamp(station?.heygenVoiceRate ?? 0.88, 0.7, 1.0);
      const voiceEmotion = station?.heygenVoiceEmotion || "soothing";

      await avatar.createStartAvatar({
        quality: AvatarQuality.High,
        avatarName,
        voice: {
          rate: voiceRate,
          emotion: voiceEmotion,
          voiceId: "45d1bc0c65e9426b9da4327d52e1f346", // Elizabeth - Soothing
        },
      });

      log("HEYGEN_AVATAR_STARTED", { avatarName, voiceRate, voiceEmotion });

      startTimer();

      setIsSessionActive(true);
      isSessionActiveRef.current = true;

      fiveMinTimerRef.current = setTimeout(async () => {
        try {
          if (fiveMinFiredRef.current) return;
          if (!isSessionActiveRef.current) return;
          if (endingRef.current) return;
          if (!avatarRef.current) return;

          fiveMinFiredRef.current = true;

          const q =
            station?.fiveMinuteQuestion?.trim() ||
            "How long will this take to start working?";

          log("5_MIN_QUESTION_FIRE");

          // ✅ We are about to speak the forced interrupt question.
          // Do NOT arm "awaiting answer" yet — arm it only AFTER question is finished.
          forcedInterruptSpeakingRef.current = true;
          armFiveMinAfterSpeakRef.current = true;

          // Clear any partial transcript so ongoing monologue doesn't get treated as the "answer"
          currentTurnTextRef.current = "";

          // Cancel any pending finalize (prevents old speech from finalizing right after question)
          cancelPendingFinalize();

          // ✅ IMPORTANT FIX:
          // Put the forced question into history BEFORE speaking,
          // so backend "FIVE_MIN_FOLLOWUP_RULE" can trigger reliably.
          chatHistoryRef.current.push({ role: "assistant", content: q });

          setAssistantTurns((prev) => {
            const next = [...prev, q];
            assistantTurnsRef.current = next;
            return next;
          });

          try {
            await maybePreSpeakDelay(q);

            await avatarRef.current.speak({
              text: q,
              task_type: TaskType.REPEAT,
            });
          } catch (e) {
            // rollback if speak failed (so UI/history isn't lying)
            try {
              const last =
                chatHistoryRef.current[chatHistoryRef.current.length - 1];
              if (last?.role === "assistant" && last?.content === q) {
                chatHistoryRef.current.pop();
              }
            } catch {}

            setAssistantTurns((prev) => {
              if (!prev?.length) return prev;
              const last = prev[prev.length - 1];
              if (last === q) {
                const next = prev.slice(0, -1);
                assistantTurnsRef.current = next;
                return next;
              }
              return prev;
            });

            throw e;
          }
        } catch (e) {
          console.error("5_MIN_QUESTION_FAILED", e);
          forcedInterruptSpeakingRef.current = false;
          armFiveMinAfterSpeakRef.current = false;
        }
      }, 20000); // ✅ testing: 30 seconds
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to start session");

      setIsSessionActive(false);
      isSessionActiveRef.current = false;

      pauseSttRef.current = false;

      stopMicAndVad();
      terminateAssemblySession();

      try {
        await markUsageEnded(0);
      } catch {}

      sessionRequestIdRef.current = null;

      cancelPendingAssistant("startSession_error");
    } finally {
      setIsLoading(false);
    }
  };

  async function abortSession(silent = false) {
    try {
      stopTimer();

      setIsSessionActive(false);
      isSessionActiveRef.current = false;

      setIsSpeaking(false);
      isSpeakingRef.current = false;

      pauseSttRef.current = false;

      cancelPendingFinalize();
      cancelPendingAssistant("abortSession");

      awaitingFiveMinAnswerRef.current = false;
      forcedInterruptSpeakingRef.current = false;
      armFiveMinAfterSpeakRef.current = false;

      if (fiveMinTimerRef.current) clearTimeout(fiveMinTimerRef.current);
      fiveMinTimerRef.current = null;

      stopMicAndVad();

      terminateAssemblySession();

      try {
        await avatarRef.current?.stopAvatar?.();
      } catch {}
      avatarRef.current = null;

      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }

      log("SESSION_ABORTED");
    } catch (e) {
      console.error("Abort error:", e);
      if (!silent) setError("Failed to end session. Refresh the page.");
    }
  }

  // ----------------------------
  // ✅ Conversation turn (server-locked, script never sent to browser)
  // ----------------------------
  async function handleUserTurn(userText, intentType = "question") {
    // store user turn
    setUserTurns((prev) => {
      const next = [...prev, userText];
      userTurnsRef.current = next;
      return next;
    });

    const fallback = intentType === "confirm" ? "ok" : "I'm not sure.";

    const myReplyId = pendingReplyIdRef.current + 1;
    pendingReplyIdRef.current = myReplyId;

    const speakIfStillValid = async (assistantText, meta = "") => {
      if (endingRef.current) return;
      if (!isSessionActiveRef.current) return;
      if (myReplyId !== pendingReplyIdRef.current) {
        log("TURN_STALE_SKIP:", meta);
        return;
      }

      // keep local context (safe: only user/assistant lines, never station script)
      chatHistoryRef.current.push({ role: "user", content: userText });
      chatHistoryRef.current.push({
        role: "assistant",
        content: assistantText,
      });

      setAssistantTurns((prev) => {
        const next = [...prev, assistantText];
        assistantTurnsRef.current = next;
        return next;
      });

      if (avatarRef.current && assistantText) {
        try {
          const t0 = performance.now();

          await maybePreSpeakDelay(assistantText);

          const tSpeakRequest = performance.now();
          log("HEYGEN_SPEAK_START", meta, {
            text: assistantText,
            latencyFromSpeechStartMs: lastSpeechStartAtPerfRef.current
              ? Math.round(tSpeakRequest - lastSpeechStartAtPerfRef.current)
              : null,
            latencyFromSpeechEndMs: lastSpeechEndAtPerfRef.current
              ? Math.round(tSpeakRequest - lastSpeechEndAtPerfRef.current)
              : null,
            latencyFromTurnAcceptedMs: lastTurnAcceptedAtPerfRef.current
              ? Math.round(tSpeakRequest - lastTurnAcceptedAtPerfRef.current)
              : null,
          });

          await avatarRef.current.speak({
            text: assistantText,
            task_type: TaskType.REPEAT,
          });
          log("HEYGEN_SPEAK_DONE", meta, {
            ms: Math.round(performance.now() - t0),
          });
        } catch (e) {
          console.error("HEYGEN_SPEAK_FAILED", e);
          setError("HeyGen speak failed: " + (e?.message || "unknown"));
        } finally {
          setProcessing(false);
        }
      } else {
        setProcessing(false);
      }
    };

    try {
      // FAST PATH: confirms are instant (skip server)
      if (intentType === "confirm") {
        log("ROUTE_FAST_CONFIRM", { reply: fallback });
        await speakIfStillValid(fallback, "FAST_CONFIRM");
        return;
      }

      cancelPendingAssistant("new_server_request");
      pendingReplyIdRef.current = myReplyId;

      const controller = new AbortController();
      respondAbortRef.current = controller;

      const t0 = performance.now();
      log("ROUTE_SERVER_RESPOND_START");

      const r = await fetch("/api/stations/respond", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          stationId: String(station?._id || ""),
          userText,
          intentType,
          chatHistory: chatHistoryRef.current,
        }),
        signal: controller.signal,
      });

      const j = await r.json().catch(() => ({}));

      if (myReplyId !== pendingReplyIdRef.current) {
        log("SERVER_DONE_BUT_STALE");
        return;
      }

      const assistantText = (j?.data?.assistantText || "").trim() || fallback;

      log("SERVER_DONE", {
        ms: Math.round(performance.now() - t0),
        route: j?.data?.route,
      });

      await speakIfStillValid(
        assistantText,
        j?.data?.route || "SERVER_RESPOND"
      );
    } catch (e) {
      const msg = String(e?.name || e?.message || "");
      if (msg.includes("Abort") || msg.includes("aborted")) {
        log("SERVER_REQUEST_ABORTED");
        return;
      }
      console.error("HANDLE_USER_TURN_FAILED", e);
      setError("Failed to get AI response. Try again.");
    } finally {
      respondAbortRef.current = null;
      if (!isSpeakingRef.current) setProcessing(false);
    }
  }

  // ----------------------------
  // ✅ Analysis
  // ----------------------------
  async function runAnalysis() {
    const analysisPrompt = station?.analysisPrompt || null;

    const requestBody = {
      userTurns: userTurnsRef.current,
      assistantTurns: assistantTurnsRef.current,
    };
    if (analysisPrompt) requestBody.analysisPrompt = analysisPrompt;

    const res = await fetch("/api/anamanalysis", {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) throw new Error("Analysis failed");
    const { analysis } = await res.json();
    setAnalysis(analysis);
    return analysis;
  }

  const handleSessionEnd = async () => {
    if (endingRef.current) return;
    endingRef.current = true;

    setIsSessionActive(false);
    isSessionActiveRef.current = false;

    pauseSttRef.current = false;

    cancelPendingFinalize();
    cancelPendingAssistant("session_end");

    inFlightTurnRef.current = true;
    stopTimer();
    setIsLoading(true);
    setError(null);

    log("SESSION_END_REQUESTED");

    try {
      await markUsageEnded();
    } catch {}

    try {
      await runAnalysis();
    } catch (e) {
      setError("Failed to analyze interaction. " + (e.message || ""));
    }

    await abortSession(true);

    setIsAnalysisComplete(true);
    setIsLoading(false);
    inFlightTurnRef.current = false;

    log("SESSION_ENDED");
  };

  const finalizeSessionEnd = async () => {
    await abortSession(true);

    try {
      await markUsageEnded();
    } catch {}

    sessionRequestIdRef.current = null;
    router.push("/dashboard/stations");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortSession(true);

      markUsageEnded().catch(() => {});

      sessionRequestIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Billing safety net
  useEffect(() => {
    const kill = () => {
      abortSession(true);

      markUsageEnded().catch(() => {});

      sessionRequestIdRef.current = null;
    };

    const onVisibility = () => {
      if (document.hidden) kill();
    };

    router.events?.on("routeChangeStart", kill);
    window.addEventListener("beforeunload", kill);
    window.addEventListener("pagehide", kill);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      router.events?.off("routeChangeStart", kill);
      window.removeEventListener("beforeunload", kill);
      window.removeEventListener("pagehide", kill);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{station.stationName}</h1>
          <Link href="/dashboard/stations" className="btn btn-ghost">
            Back to Stations
          </Link>
        </div>
        <div className="divider my-2"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-base-200 p-4 rounded-lg mb-4">
            <h2 className="font-semibold mb-2">Clinical Background:</h2>
            <p>{station.clinicalBackground}</p>
          </div>

          {blockState?.type === "paywall" && (
            <div className="alert alert-warning mb-4">
              <div className="flex flex-col gap-2">
                <div className="font-semibold">Station locked</div>
                <div className="text-sm">{blockState.message}</div>

                <div className="flex gap-2 flex-wrap">
                  <Link
                    href="/dashboard/subscription"
                    className="btn btn-primary btn-sm"
                  >
                    Buy credits
                  </Link>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setBlockState(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4 mb-4">
            {!isSessionActive && !isAnalysisComplete && (
              <button
                onClick={startSession}
                disabled={isLoading || !isLoaded || !isSignedIn}
                className={`btn ${isLoading ? "btn-disabled" : "btn-primary"}`}
              >
                {isLoading ? "Starting..." : "Start Session"}
              </button>
            )}

            {isSessionActive && !isAnalysisComplete && (
              <>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <span
                    className={`badge ${
                      isListening ? "badge-success" : "badge-ghost"
                    }`}
                  >
                    {isListening ? "Mic On" : "Mic Off"}
                  </span>
                  <span
                    className={`badge ${
                      isUserTalking ? "badge-warning" : "badge-ghost"
                    }`}
                  >
                    {isUserTalking ? "You’re speaking…" : "Waiting…"}
                  </span>
                  <span
                    className={`badge ${
                      isSpeaking ? "badge-info" : "badge-ghost"
                    }`}
                  >
                    {isSpeaking ? "Patient speaking" : "Patient silent"}
                  </span>
                  <span
                    className={`badge ${
                      pauseSttRef.current ? "badge-neutral" : "badge-ghost"
                    }`}
                  >
                    {pauseSttRef.current ? "STT Paused" : "STT Live"}
                  </span>

                  <span
                    className={`badge ${
                      isProcessingTurn ? "badge-accent" : "badge-ghost"
                    }`}
                  >
                    {isProcessingTurn ? "Thinking…" : "Ready"}
                  </span>
                </div>

                <button
                  onClick={handleSessionEnd}
                  disabled={isLoading}
                  className={`btn ${isLoading ? "btn-disabled" : "btn-error"}`}
                >
                  {isLoading ? "Analyzing..." : "End Session"}
                </button>
              </>
            )}

            {isAnalysisComplete && (
              <button onClick={finalizeSessionEnd} className="btn btn-primary">
                Return to Stations
              </button>
            )}
          </div>

          <div className="w-full">
            <div className="relative aspect-video bg-base-300 rounded-lg overflow-hidden mb-4">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-base-300">
                  <div className="loading loading-spinner loading-lg"></div>
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-base-300">
                  <div className="text-error text-center p-4">{error}</div>
                </div>
              )}

              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
              />

              {isAnalysisComplete && (
                <div className="absolute inset-0 bg-base-300 bg-opacity-50 flex items-center justify-center">
                  <div className="bg-base-100 px-6 py-4 rounded-lg shadow-lg text-center">
                    <h3 className="text-xl font-bold text-base-content">
                      This OSCE station has ended
                    </h3>
                    <p className="mt-2 text-base-content/70">
                      Your analysis is available below
                    </p>
                  </div>
                </div>
              )}

              {isSessionActive && !isAnalysisComplete && (
                <div className="fixed bottom-2 right-2 text-xs bg-base-300 bg-opacity-70 text-base-content px-2 py-1 rounded">
                  {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                  {String(seconds % 60).padStart(2, "0")}
                </div>
              )}
            </div>
          </div>

          {analysis && (
            <div className="card bg-base-100 shadow-xl mt-8 overflow-hidden">
              <div className="bg-primary text-primary-content p-4">
                <h2 className="card-title text-2xl font-bold">
                  Performance Analysis
                </h2>
              </div>
              <div className="card-body">
                <div className="prose max-w-none">
                  {analysis.split("\n").map((p, i) => {
                    const isScore =
                      /grade|score|\d\/\d|[0-9]+\s*%|[0-9]+\s*points/i.test(p);
                    const isHeading = p.length < 50 && p.trim().endsWith(":");
                    if (!p.trim()) return <div key={i} className="my-2"></div>;
                    if (isScore)
                      return (
                        <div
                          key={i}
                          className="bg-base-200 p-3 rounded-lg font-semibold text-lg my-2"
                        >
                          {p}
                        </div>
                      );
                    if (isHeading)
                      return (
                        <h4 key={i} className="font-bold mt-4 mb-2">
                          {p}
                        </h4>
                      );
                    return (
                      <p key={i} className="my-2 text-base-content/90">
                        {p}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <StationReferences stationId={station._id} />
          </div>
        </div>
      </div>
    </div>
  );
}
