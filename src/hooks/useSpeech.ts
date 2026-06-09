"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadVoicePreference, pickBestVoice } from "@/lib/voices";
import { meterTts } from "@/lib/ai-client";

// Keep the available voices warm. getVoices() is empty on first call in some
// browsers until the async `voiceschanged` event fires, so we cache + refresh.
function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

// Text-to-speech with a premium-first, offline-safe strategy:
//   1. Try /api/tts (natural OpenAI voice) — returns audio when a key is set.
//   2. Fall back to the browser's speechSynthesis when no audio comes back,
//      choosing the most natural installed voice instead of the OS default.
// Must be triggered by a user gesture on mobile (the ritual is tap-driven).
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  // Prime the voice list as early as possible (some browsers populate late).
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    getVoices();
    const handler = () => getVoices();
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", handler);
  }, []);

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
    const voice = pickBestVoice(getVoices(), loadVoicePreference());
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    }
    u.rate = 0.96; // a touch slower — calm mentor, not a news anchor
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
          // Meter the premium voice spend (headers set by /api/tts).
          const model = res.headers.get("x-ai-model");
          const chars = Number(res.headers.get("x-ai-chars") || 0);
          if (model && chars) meterTts(model, chars);
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
