"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Volume2, Loader2 } from "lucide-react";
import { useVoice } from "@/hooks/useVoice";
import { useRecorder } from "@/hooks/useRecorder";
import { useSpeech } from "@/hooks/useSpeech";
import { askCoach } from "@/lib/ai-client";
import { cn } from "@/lib/utils";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

type Mode = "speech" | "record" | "none";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// A hands-free, back-and-forth voice conversation with the coach.
// Listening uses the best path per device — Whisper (/api/transcribe via the
// recorder) on iOS where Web Speech fails, on-device Web Speech elsewhere.
// Replies come from /api/coach and are spoken with the premium-or-fallback voice.
export function VoiceChat({
  context,
  memory,
  opener = "I'm here. Talk to me — what's on your mind this morning?",
}: {
  context?: string;
  memory?: string[];
  opener?: string;
}) {
  const speech = useVoice();
  const recorder = useRecorder();
  const { speak, cancel, speaking } = useSpeech();
  const [mode, setMode] = useState<Mode>("none");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(false);
  const [started, setStarted] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Pick the best available input path once mounted (client-only APIs).
  useEffect(() => {
    if (isIOS()) {
      setMode(recorder.supported ? "record" : speech.supported ? "speech" : "none");
    } else if (speech.supported) {
      setMode("speech");
    } else if (recorder.supported) {
      setMode("record");
    } else {
      setMode("none");
    }
  }, [speech.supported, recorder.supported]);

  // If on-device dictation fails at runtime, fall back to record→transcribe.
  useEffect(() => {
    if (mode === "speech" && speech.error && recorder.supported) {
      setMode("record");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.error]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, thinking]);

  useEffect(() => () => cancel(), [cancel]);

  const begin = () => {
    setStarted(true);
    setTurns([{ role: "assistant", content: opener }]);
    speak(opener);
  };

  const onMic = async () => {
    if (mode === "speech") {
      if (speech.listening) {
        speech.stop();
        const said = speech.transcript.trim();
        if (said) sendTurn(said);
        speech.reset();
      } else {
        cancel();
        speech.reset();
        speech.start();
      }
    } else if (mode === "record") {
      if (recorder.recording) {
        const said = (await recorder.stopAndTranscribe())?.trim();
        if (said) sendTurn(said);
      } else {
        cancel();
        await recorder.start();
      }
    }
  };

  const sendTurn = async (said: string) => {
    const next = [...turns, { role: "user" as const, content: said }];
    setTurns(next);
    setThinking(true);
    try {
      const data = await askCoach(
        { mode: "chat", messages: next.slice(-10), context, memory },
        "coach"
      );
      const reply = String(data.reply ?? "I'm here.");
      setTurns((t) => [...t, { role: "assistant", content: reply }]);
      speak(reply);
    } catch {
      const reply = "I'm here, even offline. What's the one mountain today?";
      setTurns((t) => [...t, { role: "assistant", content: reply }]);
      speak(reply);
    } finally {
      setThinking(false);
    }
  };

  if (!started) {
    return (
      <button
        onClick={begin}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/10 py-3 text-sm font-medium text-sky-300 hover:bg-sky-500/15"
      >
        <Volume2 className="h-4 w-4" />
        Talk it through with the coach
      </button>
    );
  }

  const listening = mode === "speech" ? speech.listening : recorder.recording;
  const busy = mode === "record" && recorder.transcribing;

  return (
    <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 p-4">
      <div className="max-h-56 space-y-2.5 overflow-y-auto">
        {turns.map((t, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
              t.role === "user"
                ? "ml-auto bg-sky-500/15 text-mist-100"
                : "bg-ink-800/80 text-mist-200"
            )}
          >
            {t.content}
          </div>
        ))}
        {(thinking || listening || busy) && (
          <div className="flex items-center gap-2 text-xs text-mist-500">
            {thinking ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> thinking…
              </>
            ) : busy ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> transcribing…
              </>
            ) : (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-ember-400" />
                listening…
                {mode === "speech" && speech.transcript && (
                  <span className="text-mist-400">“{speech.transcript}”</span>
                )}
              </>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        {mode === "none" ? (
          <p className="text-xs text-mist-500">Voice input isn’t supported on this browser.</p>
        ) : (
          <button
            onClick={onMic}
            disabled={busy}
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full transition-colors disabled:opacity-60",
              listening
                ? "bg-ember-500/20 text-ember-300 ring-2 ring-ember-400/50"
                : "bg-sage-500/20 text-sage-300 hover:bg-sage-500/30"
            )}
            aria-label={listening ? "Stop and send" : "Tap to talk"}
          >
            {busy ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : listening ? (
              <Square className="h-5 w-5" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </button>
        )}
        {speaking && (
          <button
            onClick={cancel}
            className="flex items-center gap-1.5 rounded-full bg-ink-800 px-3 py-2 text-xs text-mist-400 hover:text-mist-200"
          >
            <Volume2 className="h-3.5 w-3.5 animate-pulse" /> stop voice
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-mist-600">
        {listening ? "Tap to send" : "Tap the mic, speak, tap again"}
      </p>
      {recorder.error && mode === "record" && (
        <p className="mt-1 text-center text-[11px] text-ember-400">{recorder.error}</p>
      )}
      {speech.error && (
        <p className="mt-1 text-center text-[11px] text-ember-400">{speech.error.message}</p>
      )}
    </div>
  );
}
