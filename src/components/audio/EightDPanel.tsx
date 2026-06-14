"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Upload, Link2, AlertCircle, User, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { useStore } from "@/lib/store";
import { use8D } from "@/hooks/use8D";
import { EIGHT_D_PRESETS, type EightDPreset } from "@/lib/audio/presets";
import { cn } from "@/lib/utils";

const LENGTHS = [25, 45, 60];

export function EightDPanel() {
  const presetId = useStore((s) => s.eightDPresetId) ?? 1;
  const setPreset = useStore((s) => s.setEightDPreset);
  const audio = use8D();

  const selected = useMemo(
    () => EIGHT_D_PRESETS.find((p) => p.id === presetId) ?? EIGHT_D_PRESETS[0],
    [presetId]
  );

  const [speed, setSpeed] = useState(selected.orbit);
  const [spread, setSpread] = useState(selected.spread);
  const [reverb, setReverb] = useState(selected.reverb);
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Session timer — the built-in soundbed plays for this long, then fades out.
  const [durationMin, setDurationMin] = useState(45);
  const [remaining, setRemaining] = useState(45 * 60);

  // Load the built-in soundbed for the starting preset so Play works instantly.
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    audio.loadBed(selected);
  }, [audio, selected]);

  // Reset the countdown whenever the chosen length changes.
  useEffect(() => setRemaining(durationMin * 60), [durationMin]);

  // Tick down while playing.
  useEffect(() => {
    if (!audio.playing) return;
    const id = window.setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [audio.playing]);

  // Auto-stop when the session ends.
  useEffect(() => {
    if (remaining === 0 && audio.playing) audio.stop();
  }, [remaining, audio]);

  const applyPreset = (p: EightDPreset) => {
    setPreset(p.id);
    setSpeed(p.orbit);
    setSpread(p.spread);
    setReverb(p.reverb);
    audio.loadBed(p); // swaps the built-in bed live, even mid-play
  };

  const onPlay = async () => {
    if (audio.playing) {
      audio.pause();
      return;
    }
    if (remaining <= 0) setRemaining(durationMin * 60);
    // Make sure the engine reflects the current controls before starting.
    audio.applyPreset({ ...selected, orbit: speed, spread, reverb });
    await audio.play();
  };

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const usingOwn = !!fileName;

  return (
    <div className="space-y-5">
      {/* Orbit visualizer + play + session timer */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6">
          <div className="relative h-40 w-40">
            <div className="absolute inset-0 rounded-full border border-ink-700/70" />
            <div className="absolute inset-6 rounded-full border border-ink-800/70" />
            <div className="absolute inset-0 flex items-center justify-center text-mist-600">
              <User className="h-6 w-6" />
            </div>
            <div
              className={cn("absolute inset-0", audio.playing && "motion-safe:animate-spin")}
              style={{ animationDuration: `${speed}s` }}
            >
              <span className="absolute left-1/2 top-1 h-3 w-3 -translate-x-1/2 rounded-full bg-sage-400 shadow-[0_0_12px_2px_rgba(93,156,128,0.6)]" />
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm font-medium text-mist-100">{usingOwn ? fileName : selected.name}</div>
            <div className="text-[11px] text-mist-500">{usingOwn ? "your track" : selected.feel}</div>
          </div>

          <Button size="lg" className="w-full" onClick={onPlay} disabled={!audio.hasSource}>
            {audio.playing ? (
              <><Pause className="h-5 w-5" /> Pause</>
            ) : (
              <><Play className="h-5 w-5" /> Play 8D</>
            )}
          </Button>

          {/* Session length */}
          <div className="flex w-full items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm text-mist-400">
              <Timer className="h-4 w-4 text-sage-400" />
              <span className="tabular-nums text-mist-200">{mmss(remaining)}</span> left
            </span>
            <div className="flex gap-1.5">
              {LENGTHS.map((m) => (
                <button
                  key={m}
                  onClick={() => setDurationMin(m)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    durationMin === m
                      ? "border-sage-500 bg-sage-500/15 text-sage-300"
                      : "border-ink-700 text-mist-500 hover:border-ink-600"
                  )}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
          {audio.error && (
            <p className="flex items-start gap-1.5 text-xs text-ember-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {audio.error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Preset grid — each is a ready-to-play 8D soundbed */}
      <div>
        <div className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
          Soundbeds — tap to play
        </div>
        <div className="grid grid-cols-2 gap-2">
          {EIGHT_D_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                !usingOwn && p.id === presetId
                  ? "border-sage-500/50 bg-sage-500/10"
                  : "border-ink-700 hover:border-ink-600"
              )}
            >
              <div className="text-sm font-medium text-mist-100">{p.name}</div>
              <div className="mt-0.5 text-[11px] text-mist-500">{p.feel}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Manual fine-tune */}
      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
            Fine-tune
          </div>
          <Control label="Orbit speed" value={`${speed.toFixed(1)}s / turn`}>
            <Slider
              min={2}
              max={20}
              step={0.5}
              value={speed}
              onChange={(v) => {
                setSpeed(v);
                audio.setSpeed(v);
              }}
            />
          </Control>
          <Control label="Spread" value={`${spread}%`}>
            <Slider
              min={0}
              max={100}
              step={5}
              value={spread}
              onChange={(v) => {
                setSpread(v);
                audio.setSpread(v);
              }}
            />
          </Control>
          <Control label="Reverb" value={`${reverb}%`}>
            <Slider
              min={0}
              max={100}
              step={5}
              value={reverb}
              onChange={(v) => {
                setReverb(v);
                audio.setReverb(v);
              }}
            />
          </Control>
        </CardContent>
      </Card>

      {/* Bring your own music (optional) */}
      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
            Bring your own music (optional)
          </div>
          <p className="text-xs text-mist-500">
            The presets above need nothing loaded. To spin your own track instead, pick a file —
            streaming links (Spotify, YouTube) are copy-protected and won&apos;t play.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                audio.load(f);
                setFileName(f.name);
              }
            }}
          />
          <Button variant="soft" size="md" className="w-full" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Choose file
          </Button>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="…or paste a direct .mp3 link"
              className="min-w-0 flex-1 rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5 text-sm text-mist-100 placeholder:text-mist-600 outline-none focus:border-ink-600"
            />
            <button
              onClick={() => {
                if (url.trim()) {
                  audio.load(url.trim());
                  setFileName(url.trim().split("/").pop() || "remote track");
                }
              }}
              disabled={!url.trim()}
              className="shrink-0 rounded-xl bg-sky-500/20 p-2.5 text-sky-300 hover:bg-sky-500/30 disabled:opacity-40"
              aria-label="Load URL"
            >
              <Link2 className="h-4 w-4" />
            </button>
          </div>
          {usingOwn && (
            <button
              onClick={() => {
                setFileName(null);
                setUrl("");
                audio.loadBed(selected);
              }}
              className="text-xs text-mist-500 underline hover:text-mist-300"
            >
              ← Back to built-in soundbeds
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Control({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-mist-300">{label}</span>
        <span className="tabular-nums text-mist-500">{value}</span>
      </div>
      {children}
    </div>
  );
}
