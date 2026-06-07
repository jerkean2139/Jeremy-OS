"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Text-to-speech with a premium-first, offline-safe strategy:
//   1. Try /api/tts (natural OpenAI voice) — returns audio when a key is set.
//   2. Fall back to the browser's speechSynthesis when no audio comes back.
// Must be triggered by a user gesture on mobile (the ritual is tap-driven).
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    cleanupAudio();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, [cleanupAudio]);

  const fallback = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.98;
    u.pitch = 1;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      const t = (text ?? "").trim();
      if (!t) return;
      cancel();
      setSpeaking(true);
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: t }),
        });
        const type = res.headers.get("content-type") || "";
        if (res.ok && type.includes("audio")) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          urlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => {
            setSpeaking(false);
            cleanupAudio();
          };
          audio.onerror = () => {
            setSpeaking(false);
            cleanupAudio();
            fallback(t);
          };
          await audio.play();
          return;
        }
      } catch {
        /* fall through to browser voice */
      }
      fallback(t);
    },
    [cancel, cleanupAudio, fallback]
  );

  useEffect(() => () => cancel(), [cancel]);

  return { speak, cancel, speaking };
}
