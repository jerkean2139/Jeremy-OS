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

export function useVoice() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
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
      rec.onerror = () => setListening(false);
      recRef.current = rec;
    }
  }, []);

  const start = useCallback(() => {
    if (!recRef.current) return;
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

  return { supported, listening, transcript, start, stop, reset, setText };
}
