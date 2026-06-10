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
//   2. Fall back to the browser's speechSynthesis, choosing the most natural
//      installed voice instead of the OS default.
// `speakChunks` plays an ordered list end-to-end (for long readings).
// Must be triggered by a user gesture on mobile (the ritual is tap-driven).
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  // Bumped on cancel/new run so any in-flight sequence knows to stop.
  const runRef = useRef(0);

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
    runRef.current++; // invalidate any running sequence
    cleanupAudio();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, [cleanupAudio]);

  // Speak one chunk via the browser voice; resolves when done.
  const browserSpeak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      const voice = pickBestVoice(getVoices(), loadVoicePreference());
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      }
      u.rate = 0.96; // a touch slower — calm mentor, not a news anchor
      u.pitch = 1;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  }, []);

  // Speak one chunk premium-first, browser-fallback; resolves when done.
  const playText = useCallback(
    async (text: string): Promise<void> => {
      const t = (text ?? "").trim();
      if (!t) return;
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: t }),
        });
        const type = res.headers.get("content-type") || "";
        if (res.ok && type.includes("audio")) {
          const model = res.headers.get("x-ai-model");
          const chars = Number(res.headers.get("x-ai-chars") || 0);
          if (model && chars) meterTts(model, chars);
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          urlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;
          await new Promise<void>((resolve) => {
            audio.onended = () => {
              cleanupAudio();
              resolve();
            };
            audio.onerror = () => {
              cleanupAudio();
              browserSpeak(t).then(resolve);
            };
            audio.play().catch(() => browserSpeak(t).then(resolve));
          });
          return;
        }
      } catch {
        /* fall through to browser voice */
      }
      await browserSpeak(t);
    },
    [cleanupAudio, browserSpeak]
  );

  const speak = useCallback(
    async (text: string) => {
      const t = (text ?? "").trim();
      if (!t) return;
      cancel();
      const run = ++runRef.current;
      setSpeaking(true);
      await playText(t);
      if (runRef.current === run) setSpeaking(false);
    },
    [cancel, playText]
  );

  // Play an ordered list of chunks end-to-end (long readings).
  const speakChunks = useCallback(
    async (chunks: string[]) => {
      const list = chunks.map((c) => c.trim()).filter(Boolean);
      if (!list.length) return;
      cancel();
      const run = ++runRef.current;
      setSpeaking(true);
      for (const chunk of list) {
        if (runRef.current !== run) return; // cancelled mid-sequence
        await playText(chunk);
      }
      if (runRef.current === run) setSpeaking(false);
    },
    [cancel, playText]
  );

  useEffect(() => () => cancel(), [cancel]);

  return { speak, speakChunks, cancel, speaking };
}
