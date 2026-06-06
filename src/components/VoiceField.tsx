"use client";

import { useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { useVoice } from "@/hooks/useVoice";
import { cn } from "@/lib/utils";

interface VoiceFieldProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}

// Voice-first text field: speak or type. Web Speech API drives transcription
// locally with no network needed.
export function VoiceField({ label, placeholder, value, onChange, rows = 3 }: VoiceFieldProps) {
  const { supported, listening, transcript, start, stop, setText } = useVoice();

  // While listening, push the live transcript up to the parent.
  useEffect(() => {
    if (listening && transcript) onChange(transcript);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, listening]);

  const toggle = () => {
    if (listening) {
      stop();
    } else {
      setText(value); // continue from existing text
      start();
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-mist-200">{label}</label>
        {supported && (
          <button
            type="button"
            onClick={toggle}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors",
              listening
                ? "bg-ember-500/20 text-ember-400 animate-pulse-soft"
                : "bg-ink-700/70 text-mist-300 hover:bg-ink-600"
            )}
          >
            {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            {listening ? "Listening…" : "Speak"}
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
    </div>
  );
}
