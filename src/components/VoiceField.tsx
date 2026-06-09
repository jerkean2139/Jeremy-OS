"use client";

import { useEffect, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useVoice } from "@/hooks/useVoice";
import { useRecorder } from "@/hooks/useRecorder";
import { cn } from "@/lib/utils";

interface VoiceFieldProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}

type Mode = "speech" | "record" | "none";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    // iPadOS 13+ reports as Mac; detect via touch points
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// Voice-first text field: speak or type.
// - Desktop/Android: instant on-device dictation via the Web Speech API.
// - iOS (where Web Speech fails, especially in an installed PWA): record audio
//   and transcribe server-side via Whisper (/api/transcribe).
export function VoiceField({ label, placeholder, value, onChange, rows = 3 }: VoiceFieldProps) {
  const speech = useVoice();
  const recorder = useRecorder();
  const [mode, setMode] = useState<Mode>("none");

  // Decide the best available input path once mounted (client-only APIs).
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

  // Speech mode: stream the live transcript up to the parent while listening.
  useEffect(() => {
    if (mode === "speech" && speech.listening && speech.transcript) {
      onChange(speech.transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.transcript, speech.listening, mode]);

  // If on-device dictation fails (Chrome's network voice service, blocked mic,
  // etc.), fall back to record→transcribe so the button still works.
  useEffect(() => {
    if (mode === "speech" && speech.error && recorder.supported) {
      setMode("record");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.error]);

  const toggleSpeech = () => {
    if (speech.listening) {
      speech.stop();
    } else {
      speech.setText(value);
      speech.start();
    }
  };

  const toggleRecord = async () => {
    if (recorder.recording) {
      const text = await recorder.stopAndTranscribe();
      if (text) onChange(value.trim() ? `${value.trim()} ${text}` : text);
    } else {
      await recorder.start();
    }
  };

  const active = mode === "speech" ? speech.listening : recorder.recording;
  const busy = mode === "record" && recorder.transcribing;

  const buttonLabel = busy
    ? "Transcribing…"
    : active
      ? mode === "speech"
        ? "Listening…"
        : "Stop"
      : "Speak";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-mist-200">{label}</label>
        {mode !== "none" && (
          <button
            type="button"
            onClick={mode === "speech" ? toggleSpeech : toggleRecord}
            disabled={busy}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors disabled:opacity-60",
              active
                ? "bg-ember-500/20 text-ember-400 animate-pulse-soft"
                : "bg-ink-700/70 text-mist-300 hover:bg-ink-600"
            )}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : active ? (
              <MicOff className="h-3.5 w-3.5" />
            ) : (
              <Mic className="h-3.5 w-3.5" />
            )}
            {buttonLabel}
          </button>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-xl border border-ink-700 bg-ink-900/60 px-4 py-3 text-mist-50 placeholder:text-mist-500 focus:border-sage-500/50 focus:outline-none focus:ring-0"
      />
      {recorder.error && mode === "record" && (
        <p className="mt-1.5 text-xs text-ember-400">{recorder.error}</p>
      )}
      {speech.error && (
        <p className="mt-1.5 text-xs text-ember-400">{speech.error.message}</p>
      )}
    </div>
  );
}
