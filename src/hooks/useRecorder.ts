"use client";

import { useCallback, useRef, useState } from "react";
import { meterTranscribe } from "@/lib/ai-client";

// Audio recording via MediaRecorder + server-side transcription (Whisper).
// This is the reliable voice path for iOS PWAs, where the Web Speech API
// (useVoice) does not work. Records a short clip, uploads it to /api/transcribe.

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm", "audio/mp4", "audio/ogg"];
  for (const m of candidates) {
    try {
      if (MediaRecorder.isTypeSupported?.(m)) return m;
    } catch {
      /* ignore */
    }
  }
  return "";
}

function extFor(mime: string): string {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

export function useRecorder() {
  const supported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);

  const start = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = pickMime();
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.start();
      recorderRef.current = mr;
      startedAtRef.current = Date.now();
      setRecording(true);
      return true;
    } catch {
      setError("Microphone permission denied.");
      return false;
    }
  }, [supported]);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const cancel = useCallback(() => {
    const mr = recorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.onstop = null;
      mr.stop();
    }
    cleanupStream();
    setRecording(false);
  }, []);

  const stopAndTranscribe = useCallback(async (): Promise<string | null> => {
    const mr = recorderRef.current;
    if (!mr) return null;
    const mime = mr.mimeType || "audio/webm";

    const blob: Blob = await new Promise((resolve) => {
      mr.onstop = () => resolve(new Blob(chunksRef.current, { type: mime }));
      try {
        mr.stop();
      } catch {
        resolve(new Blob(chunksRef.current, { type: mime }));
      }
    });
    cleanupStream();
    setRecording(false);

    if (blob.size === 0) return null;
    setTranscribing(true);
    try {
      const form = new FormData();
      form.append("file", blob, `audio.${extFor(mime)}`);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      if (!res.ok) {
        setError(res.status === 503 ? "Voice needs an OpenAI key." : "Couldn't transcribe.");
        return null;
      }
      const json = await res.json().catch(() => ({}));
      // Meter the transcription spend by recorded duration.
      const seconds = startedAtRef.current ? (Date.now() - startedAtRef.current) / 1000 : 0;
      if (json?.model && seconds) meterTranscribe(String(json.model), seconds);
      return (json?.text as string) || null;
    } catch {
      setError("Couldn't reach the transcription service.");
      return null;
    } finally {
      setTranscribing(false);
    }
  }, []);

  return { supported, recording, transcribing, error, start, stopAndTranscribe, cancel };
}
