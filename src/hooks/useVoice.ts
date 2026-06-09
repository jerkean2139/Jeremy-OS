"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Voice-first input using the browser's Web Speech API. This keeps morning
// check-ins and reflections hands-free and instant, with no server round-trip.
// Falls back gracefully when the API is unavailable.

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

// Map raw Web Speech error codes to calm, useful copy.
function friendlyError(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Allow the mic, or just type.";
    case "audio-capture":
      return "No microphone found.";
    case "network":
      return "Live dictation isn’t reaching its service — switching to recording.";
    case "no-speech":
      return "Didn’t catch that — try again.";
    default:
      return "Voice hit a snag — switching to recording.";
  }
}

export function useVoice() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  // The last runtime error code, so callers can fall back or show a message.
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const baseRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      setSupported(true);
      const rec: SpeechRecognitionLike = new SR();
      rec.lang = "en-US";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e: any) => {
        let interim = "";
        let final = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const chunk = e.results[i][0].transcript;
          if (e.results[i].isFinal) final += chunk;
          else interim += chunk;
        }
        if (final) baseRef.current = (baseRef.current + " " + final).trim();
        setTranscript((baseRef.current + " " + interim).trim());
      };
      rec.onend = () => setListening(false);
      rec.onerror = (e: any) => {
        const code = String(e?.error ?? "unknown");
        // "aborted" is just us calling stop() — not a real failure.
        if (code !== "aborted") setError({ code, message: friendlyError(code) });
        setListening(false);
      };
      recRef.current = rec;
    }
  }, []);

  const start = useCallback(() => {
    if (!recRef.current) return;
    setError(null);
    try {
      recRef.current.start();
      setListening(true);
    } catch {
      /* already started */
    }
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    baseRef.current = "";
    setTranscript("");
  }, []);

  const setText = useCallback((t: string) => {
    baseRef.current = t;
    setTranscript(t);
  }, []);

  return { supported, listening, transcript, error, start, stop, reset, setText };
}
