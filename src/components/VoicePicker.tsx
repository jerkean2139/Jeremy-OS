"use client";

import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { rankedVoices, loadVoicePreference, saveVoicePreference } from "@/lib/voices";
import { cn } from "@/lib/utils";

// Lets you choose the device's spoken voice for the offline fallback (the
// premium /api/tts voice is used first when an OpenAI key is set). Surfaces
// only the natural, non-novelty voices so you never land on the robot one.
export function VoicePicker({ className }: { className?: string }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selected, setSelected] = useState<string>("");
  // null = still checking; true/false = premium AI voice configured or not.
  const [premium, setPremium] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const refresh = () => setVoices(rankedVoices(window.speechSynthesis.getVoices()));
    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    setSelected(loadVoicePreference() ?? "");
    fetch("/api/tts")
      .then((r) => r.json())
      .then((d) => setPremium(!!d.configured))
      .catch(() => setPremium(false));
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, []);

  const choose = (name: string) => {
    setSelected(name);
    saveVoicePreference(name || undefined);
    preview(name);
  };

  const preview = (name?: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(
      "Good morning. Let's take one calm step toward the mountain."
    );
    const v = voices.find((x) => x.name === (name || selected));
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    }
    u.rate = 0.96;
    window.speechSynthesis.speak(u);
  };

  if (typeof window !== "undefined" && !window.speechSynthesis) return null;
  if (voices.length === 0) return null;

  return (
    <div className={cn("rounded-2xl border border-ink-700/60 bg-ink-850/70 p-4", className)}>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-mist-100">
        <Volume2 className="h-4 w-4 text-sky-400" /> Coach voice
      </div>

      {/* Premium voice status — the real reason a voice sounds modern or robotic. */}
      {premium !== null && (
        <div
          className={cn(
            "mb-3 flex items-start gap-2 rounded-xl border p-2.5 text-xs leading-relaxed",
            premium
              ? "border-sage-500/25 bg-sage-500/5 text-sage-200"
              : "border-ember-500/25 bg-ember-500/5 text-ember-200/90"
          )}
        >
          <span
            className={cn(
              "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
              premium ? "bg-sage-400" : "bg-ember-400"
            )}
          />
          {premium ? (
            <span>
              Premium AI voice is <strong>active</strong>. If it still sounds robotic, this
              device fell back to a built-in voice — pick a natural one below.
            </span>
          ) : (
            <span>
              Premium AI voice is <strong>not configured</strong>, so you&apos;re hearing your
              device&apos;s built-in voice. Set <code>OPENAI_API_KEY</code> on the server to enable
              the natural voice. Meanwhile, pick the best installed one below.
            </span>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <select
          value={selected}
          onChange={(e) => choose(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5 text-sm text-mist-100 outline-none focus:border-ink-600"
        >
          <option value="">Best available (automatic)</option>
          {voices.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => preview()}
          className="shrink-0 rounded-xl border border-ink-700 px-3 py-2.5 text-sm text-mist-300 hover:border-ink-600 hover:text-mist-100"
        >
          Preview
        </button>
      </div>
      <p className="mt-2 text-xs text-mist-600">
        Used when offline. With an OpenAI key set, a premium voice plays first.
      </p>
    </div>
  );
}
