"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { RESTAURANT_NAMES } from "@/lib/supabase";
import { clearAgentSession, sendAgentSTT, sendAgentTTS, type VoiceCurrentOrder, type VoiceOrderItem } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────
type Phase = "idle" | "listening" | "thinking" | "speaking";

interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
}

// ── Sentence splitter for streaming TTS ───────────────────────────────────────
function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[।.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ── Waveform bars (VAD-reactive) ───────────────────────────────────────────────
function WaveformBars({ analyser, phase }: { analyser: AnalyserNode | null; phase: Phase }) {
  const barsRef = useRef<HTMLDivElement[]>([]);
  const rafRef = useRef<number>(0);
  const NUM = 28;

  useEffect(() => {
    let dataArr: Uint8Array<ArrayBuffer> | null = null;
    if (analyser) {
      analyser.fftSize = 128;
      dataArr = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
    }

    function tick() {
      rafRef.current = requestAnimationFrame(tick);
      if (analyser && dataArr) analyser.getByteFrequencyData(dataArr);

      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        let h: number;
        if (phase === "idle") {
          h = 3 + Math.sin(Date.now() / 600 + i * 0.4) * 2;
        } else if (phase === "listening" && dataArr) {
          const bin = Math.floor((i / NUM) * dataArr.length * 0.6);
          const raw = dataArr[bin] / 255;
          h = 4 + raw * 44;
        } else if (phase === "speaking" && dataArr) {
          const bin = Math.floor((i / NUM) * dataArr.length * 0.5);
          const raw = dataArr[bin] / 255;
          h = 4 + raw * 36;
        } else if (phase === "thinking") {
          const wave = Math.sin(Date.now() / 300 + i * 0.6) * 0.5 + 0.5;
          h = 4 + wave * 20;
        } else {
          h = 4;
        }
        bar.style.height = `${h}px`;
      });
    }
    tick();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, phase]);

  const colors: Record<Phase, string> = {
    idle: "bg-stone-600",
    listening: "bg-amber-400",
    thinking: "bg-violet-400",
    speaking: "bg-emerald-400",
  };

  return (
    <div className="flex items-center gap-[3px]" style={{ height: 52 }}>
      {Array.from({ length: NUM }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { if (el) barsRef.current[i] = el; }}
          className={`w-[3px] rounded-full transition-colors duration-500 ${colors[phase]}`}
          style={{ height: 4 }}
        />
      ))}
    </div>
  );
}

// ── Order panel ────────────────────────────────────────────────────────────────
function OrderPanel({ order }: { order: VoiceCurrentOrder | null }) {
  const items: VoiceOrderItem[] = order?.items ?? [];
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-950 overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-stone-800/60">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-stone-500">
          Your order
        </p>
      </div>
      <div className="px-4 py-2 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-stone-500 text-xs tabular-nums shrink-0">{item.quantity}×</span>
              <span className="text-sm text-stone-300 truncate">{item.item_name}</span>
              {item.notes ? (
                <span className="text-xs text-stone-600 truncate">· {item.notes}</span>
              ) : null}
            </div>
            <span className="text-sm tabular-nums text-stone-400 shrink-0">₹{item.total}</span>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-stone-800/60 flex justify-between items-center">
        <span className="text-xs text-stone-500">Total</span>
        <span className="text-base font-semibold tabular-nums text-stone-100">
          ₹{order?.total ?? order?.subtotal ?? 0}
        </span>
      </div>
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────────
function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] text-[14px] leading-relaxed px-4 py-2.5 rounded-2xl ${
          isUser
            ? "bg-stone-700 text-stone-100 rounded-br-md"
            : "bg-stone-900 text-stone-200 rounded-bl-md border border-stone-800"
        }`}
      >
        {msg.text}
        {msg.streaming && (
          <span className="inline-block w-0.5 h-3.5 bg-stone-400 ml-0.5 align-middle animate-[blink_0.9s_step-end_infinite]" />
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function VoiceOrderPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.restaurantId as string;
  const restaurantName = RESTAURANT_NAMES[restaurantId] ?? restaurantId;

  const [sessionId] = useState(
    () => `v_${restaurantId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  );

  const [phase, setPhase] = useState<Phase>("idle");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [order, setOrder] = useState<VoiceCurrentOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [showText, setShowText] = useState(false);

  // Audio refs
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  // VAD refs
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceCountRef = useRef(0);
  const SILENCE_THRESHOLD = 10; // amplitude 0-255
  const SILENCE_FRAMES = 30;    // ~1.5s of silence at 20fps

  // TTS sentence queue
  const ttsQueueRef = useRef<string[]>([]);
  const ttsBusyRef = useRef(false);
  const ttsAnalyserRef = useRef<AnalyserNode | null>(null);

  // Scroll
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
      clearAgentSession(sessionId).catch(() => {});
    };
  }, [sessionId]);

  // ── Audio context ────────────────────────────────────────────────────────────
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 128;
      an.smoothingTimeConstant = 0.6;
      audioCtxRef.current = ctx;
      analyserRef.current = an;
      setAnalyserNode(an);
    }
    return { ctx: audioCtxRef.current!, analyser: analyserRef.current! };
  }, []);

  // ── Play audio (base64) ──────────────────────────────────────────────────────
  const playAudio = useCallback(async (b64: string) => {
    if (!b64) return;
    try {
      const { ctx } = getAudioCtx();
      if (ctx.state === "suspended") await ctx.resume();

      if (!ttsAnalyserRef.current) {
        const ttsAn = ctx.createAnalyser();
        ttsAn.fftSize = 128;
        ttsAn.smoothingTimeConstant = 0.6;
        ttsAnalyserRef.current = ttsAn;
        ttsAn.connect(ctx.destination);
        setAnalyserNode(ttsAn);
      }

      const bin = atob(b64);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      const buf = await ctx.decodeAudioData(bytes.buffer as ArrayBuffer);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ttsAnalyserRef.current!);
      return new Promise<void>((resolve) => {
        src.onended = () => resolve();
        src.start();
      });
    } catch { /* ignore */ }
  }, [getAudioCtx]);

  // ── TTS sentence queue processor ─────────────────────────────────────────────
  const processTTSQueue = useCallback(async () => {
    if (ttsBusyRef.current) return;
    ttsBusyRef.current = true;

    while (ttsQueueRef.current.length > 0) {
      const sentence = ttsQueueRef.current.shift()!;
      try {
        const res = await sendAgentTTS(sentence, "hi-IN", sessionId, restaurantId);
        if (res.audio_base64) await playAudio(res.audio_base64);
      } catch { /* ignore TTS errors */ }
    }

    ttsBusyRef.current = false;
    setPhase("idle");
    setAnalyserNode(analyserRef.current);
  }, [sessionId, restaurantId, playAudio]);

  const enqueueTTS = useCallback((sentence: string) => {
    ttsQueueRef.current.push(sentence);
    processTTSQueue();
  }, [processTTSQueue]);

  // ── Streaming LLM call ────────────────────────────────────────────────────────
  const streamLLM = useCallback(async (userText: string) => {
    setPhase("thinking");

    const assistantId = `a_${Date.now()}`;
    setMsgs((prev) => [...prev, { id: assistantId, role: "assistant", text: "", streaming: true }]);

    let fullText = "";
    let sentenceBuffer = "";
    const spokenSentences = new Set<string>();

    try {
      const res = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          session_id: sessionId,
          restaurant_id: restaurantId,
          language: "hi-IN",
        }),
      });

      if (!res.ok || !res.body) throw new Error(`Stream error: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      setPhase("speaking");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          // Final order event
          if (line.startsWith("data: [ORDER]")) {
            try {
              const orderData = JSON.parse(line.slice("data: [ORDER]".length));
              if (orderData?.items?.length > 0) setOrder(orderData);
            } catch { /* ignore */ }
            continue;
          }

          // Custom SSE format: data: "token" (JSON-encoded string)
          if (line.startsWith("data: ") && !line.startsWith("data: [ORDER]")) {
            try {
              const token = JSON.parse(line.slice("data: ".length));
              if (typeof token === "string") {
                fullText += token;
                sentenceBuffer += token;

                setMsgs((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, text: fullText } : m
                  )
                );

                // Check for sentence boundary → enqueue TTS
                const sentences = splitIntoSentences(sentenceBuffer);
                if (sentences.length > 1) {
                  // All but the last are complete
                  for (let i = 0; i < sentences.length - 1; i++) {
                    const s = sentences[i];
                    if (s && !spokenSentences.has(s)) {
                      spokenSentences.add(s);
                      enqueueTTS(s);
                    }
                  }
                  sentenceBuffer = sentences[sentences.length - 1];
                }
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }

      // Speak remaining buffer
      if (sentenceBuffer.trim() && !spokenSentences.has(sentenceBuffer.trim())) {
        enqueueTTS(sentenceBuffer.trim());
      }

      setMsgs((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, streaming: false } : m
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get response");
      setMsgs((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, text: fullText || "Sorry, something went wrong.", streaming: false }
            : m
        )
      );
      setPhase("idle");
    }
  }, [sessionId, restaurantId, enqueueTTS]);

  // ── VAD: auto-stop on silence ─────────────────────────────────────────────────
  const stopRecordingAndProcess = useCallback(async () => {
    const rec = mediaRecRef.current;
    if (!rec || rec.state === "inactive") return;

    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }

    return new Promise<void>((resolve) => {
      rec.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        setAnalyserNode(analyserRef.current);

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];

        if (blob.size < 1000) {
          setPhase("idle");
          resolve();
          return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
          const b64 = (reader.result as string).split(",")[1];
          if (!b64) { setPhase("idle"); resolve(); return; }

          setPhase("thinking");
          try {
            const sttRes = await sendAgentSTT({
              audio_base64: b64,
              session_id: sessionId,
              restaurant_id: restaurantId,
              language: "hi-IN",
            });
            const transcript = sttRes.transcript?.trim();
            if (transcript) {
              setMsgs((prev) => [
                ...prev,
                { id: `u_${Date.now()}`, role: "user", text: transcript },
              ]);
              await streamLLM(transcript);
            } else {
              setPhase("idle");
            }
          } catch (e) {
            setError(e instanceof Error ? e.message : "STT failed");
            setPhase("idle");
          }
          resolve();
        };
        reader.readAsDataURL(blob);
      };
      rec.stop();
    });
  }, [sessionId, restaurantId, streamLLM]);

  // ── Start listening ────────────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    if (phase !== "idle") return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const { ctx, analyser } = getAudioCtx();
      if (ctx.state === "suspended") await ctx.resume();
      const mic = ctx.createMediaStreamSource(stream);
      mic.connect(analyser);
      setAnalyserNode(analyser);

      const rec = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecRef.current = rec;
      rec.start(100);
      setPhase("listening");
      silenceCountRef.current = 0;

      // VAD: check silence every 50ms
      vadIntervalRef.current = setInterval(() => {
        if (!analyser) return;
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((s, v) => s + v, 0) / data.length;

        if (avg < SILENCE_THRESHOLD) {
          silenceCountRef.current++;
          if (silenceCountRef.current >= SILENCE_FRAMES) {
            // Enough silence — stop and process
            clearInterval(vadIntervalRef.current!);
            vadIntervalRef.current = null;
            stopRecordingAndProcess();
          }
        } else {
          silenceCountRef.current = 0;
        }
      }, 50);
    } catch {
      setError("Microphone access denied. Use text input instead.");
      setShowText(true);
    }
  }, [phase, getAudioCtx, stopRecordingAndProcess]);

  // ── Manual stop (tap again) ────────────────────────────────────────────────────
  const handleMicTap = useCallback(() => {
    if (phase === "idle") {
      startListening();
    } else if (phase === "listening") {
      stopRecordingAndProcess();
    }
    // ignore taps during thinking/speaking
  }, [phase, startListening, stopRecordingAndProcess]);

  // ── Text send ─────────────────────────────────────────────────────────────────
  const handleSendText = useCallback(async (text: string) => {
    if (!text.trim() || phase !== "idle") return;
    setTextInput("");
    setError(null);
    setMsgs((prev) => [...prev, { id: `u_${Date.now()}`, role: "user", text: text.trim() }]);
    await streamLLM(text.trim());
  }, [phase, streamLLM]);

  // ── Reset ─────────────────────────────────────────────────────────────────────
  const handleReset = useCallback(async () => {
    if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
    mediaRecRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ttsQueueRef.current = [];
    ttsBusyRef.current = false;
    await clearAgentSession(sessionId).catch(() => {});
    setMsgs([]);
    setOrder(null);
    setPhase("idle");
    setError(null);
  }, [sessionId]);

  const busy = phase === "thinking" || phase === "speaking";

  const phaseLabel: Record<Phase, string> = {
    idle: msgs.length === 0 ? "Tap mic to start" : "Tap to speak",
    listening: "Listening — tap to send",
    thinking: "Thinking...",
    speaking: "Speaking...",
  };

  const micColors: Record<Phase, string> = {
    idle: "bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-stone-100",
    listening: "bg-amber-500 text-stone-950 shadow-[0_0_24px_rgba(245,158,11,0.35)]",
    thinking: "bg-stone-800 text-violet-400 cursor-not-allowed",
    speaking: "bg-stone-800 text-emerald-400 cursor-not-allowed",
  };

  return (
    <div
      className="flex h-[100dvh] flex-col bg-stone-950 text-stone-100"
      style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* Google Font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&display=swap');`}</style>

      {/* ── Header ── */}
      <header className="flex shrink-0 items-center justify-between px-4 py-3 border-b border-stone-800/50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/order")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:text-stone-300 hover:bg-stone-800 transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <p className="text-[14px] font-medium text-stone-100 leading-tight">{restaurantName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`inline-block h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                phase === "idle" ? "bg-stone-700"
                : phase === "listening" ? "bg-amber-400"
                : phase === "thinking" ? "bg-violet-400 animate-pulse"
                : "bg-emerald-400"
              }`} />
              <span className="text-[11px] text-stone-500 font-light">{phaseLabel[phase]}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowText((p) => !p)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              showText ? "bg-stone-800 text-stone-100" : "text-stone-500 hover:text-stone-300 hover:bg-stone-800"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button
            onClick={handleReset}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:text-stone-300 hover:bg-stone-800 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div className="flex flex-1 flex-col min-w-0">

          {/* Messages / empty state */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            {msgs.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center select-none">
                {/* Waveform as hero element */}
                <div className="mb-8">
                  <WaveformBars analyser={analyserNode} phase={phase} />
                </div>
                <p className="text-2xl font-light text-stone-200 tracking-tight">
                  Ready to order?
                </p>
                <p className="mt-2 text-sm text-stone-500 font-light max-w-[240px] leading-relaxed">
                  Tap the mic and speak naturally. Hindi, English, Hinglish — all work.
                </p>
                <div className="mt-6 flex gap-2 flex-wrap justify-center">
                  {["Menu dikhao", "2 butter chicken", "Kya price hai?"].map((hint) => (
                    <button
                      key={hint}
                      onClick={() => { setShowText(true); setTextInput(hint); }}
                      className="text-xs px-3 py-1.5 rounded-full border border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200 transition-colors"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3 pb-2">
                {/* Compact waveform */}
                <div className="flex justify-center py-2">
                  <WaveformBars analyser={analyserNode} phase={phase} />
                </div>
                {msgs.map((m) => <Bubble key={m.id} msg={m} />)}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mx-4 mb-2 rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-2 text-xs text-red-400 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-3 text-red-600 hover:text-red-400">✕</button>
            </div>
          )}

          {/* Text input */}
          {showText && (
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendText(textInput); }}
              className="mx-4 mb-3 flex items-center gap-2 rounded-xl border border-stone-700 bg-stone-900 px-4 py-2.5"
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your order..."
                disabled={busy}
                autoFocus
                className="flex-1 bg-transparent text-sm text-stone-100 placeholder-stone-600 outline-none disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || busy}
                className="text-xs font-semibold text-amber-400 disabled:text-stone-700 transition-colors"
              >
                Send
              </button>
            </form>
          )}

          {/* Mic button */}
          <div className="shrink-0 flex flex-col items-center gap-2 px-4 pb-5 pt-2">
            <button
              onClick={handleMicTap}
              disabled={busy}
              className={`relative flex h-16 w-16 items-center justify-center rounded-full transition-all duration-200 ${micColors[phase]} ${
                !busy ? "active:scale-95" : ""
              }`}
            >
              {phase === "listening" ? (
                <>
                  {/* Stop square */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  <span className="absolute inset-0 rounded-full animate-ping bg-amber-500/20" />
                </>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              )}
            </button>
            <p className="text-[11px] text-stone-500 font-light select-none">
              {phase === "listening" ? "Tap to stop · Auto-stops on silence" : phaseLabel[phase]}
            </p>
          </div>
        </div>

        {/* Desktop order sidebar */}
        <div className="hidden w-64 shrink-0 border-l border-stone-800/50 p-4 lg:block overflow-y-auto">
          <OrderPanel order={order} />
          {(order?.items?.length ?? 0) === 0 && (
            <p className="text-xs text-stone-600 text-center mt-8 leading-relaxed">
              Items appear here as you add them
            </p>
          )}
        </div>
      </div>

      {/* Mobile order bar */}
      {(order?.items?.length ?? 0) > 0 && (
        <div className="flex shrink-0 items-center justify-between border-t border-stone-800/50 bg-stone-900 px-5 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-stone-950">
              {order?.items?.length}
            </div>
            <span className="text-sm text-stone-300">{order?.items?.length} item{(order?.items?.length ?? 0) !== 1 ? "s" : ""}</span>
          </div>
          <span className="text-sm font-semibold tabular-nums text-stone-100">
            ₹{order?.total ?? order?.subtotal ?? 0}
          </span>
        </div>
      )}

      {/* Cursor blink keyframe */}
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  );
}
