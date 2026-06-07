"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Volume2, Loader2 } from "lucide-react";
import { useVoice } from "@/hooks/useVoice";
import { useSpeech } from "@/hooks/useSpeech";
import { cn } from "@/lib/utils";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

// A hands-free, back-and-forth voice conversation with the coach. Listens via
// the Web Speech API, replies via /api/coach, and speaks the reply with the
// premium-or-fallback voice. Kept separate from the persisted coach history.
export function VoiceChat({
  context,
  memory,
  opener = "I'm here. Talk to me — what's on your mind this morning?",
}: {
  context?: string;
  memory?: string[];
  opener?: string;
}) {
  const { supported, listening, transcript, start, stop, reset } = useVoice();
  const { speak, cancel, speaking } = useSpeech();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(false);
  const [started, setStarted] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, thinking]);

  useEffect(() => () => cancel(), [cancel]);

  const begin = () => {
    setStarted(true);
    setTurns([{ role: "assistant", content: opener }]);
    speak(opener);
  };

  const onMic = () => {
    if (listening) {
      stop();
      const said = transcript.trim();
      if (said) sendTurn(said);
      reset();
    } else {
      cancel();
      reset();
      start();
    }
  };

  const sendTurn = async (said: string) => {
    const next = [...turns, { role: "user" as const, content: said }];
    setTurns(next);
    setThinking(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          messages: next.slice(-10),
          context,
          memory,
        }),
      });
      const data = await res.json();
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
        {(thinking || listening) && (
          <div className="flex items-center gap-2 text-xs text-mist-500">
            {thinking ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> thinking…
              </>
            ) : (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-ember-400" />
                listening… {transcript && <span className="text-mist-400">“{transcript}”</span>}
              </>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        {!supported ? (
          <p className="text-xs text-mist-500">Voice input isn’t supported on this browser.</p>
        ) : (
          <button
            onClick={onMic}
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
              listening
                ? "bg-ember-500/20 text-ember-300 ring-2 ring-ember-400/50"
                : "bg-sage-500/20 text-sage-300 hover:bg-sage-500/30"
            )}
            aria-label={listening ? "Stop and send" : "Hold to talk"}
          >
            {listening ? <Square className="h-5 w-5" /> : <Mic className="h-6 w-6" />}
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
    </div>
  );
}
