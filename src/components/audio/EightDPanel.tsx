"use client";

import { useMemo, useRef, useState } from "react";
import { Play, Pause, Upload, Link2, AlertCircle, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { useStore } from "@/lib/store";
import { use8D } from "@/hooks/use8D";
import { EIGHT_D_PRESETS, type EightDPreset } from "@/lib/audio/presets";
import { cn } from "@/lib/utils";

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

  const applyPreset = (p: EightDPreset) => {
    setPreset(p.id);
    setSpeed(p.orbit);
    setSpread(p.spread);
    setReverb(p.reverb);
    audio.applyPreset(p);
  };

  const onPlay = async () => {
    if (audio.playing) {
      audio.pause();
      return;
    }
    // Make sure the engine reflects the current controls before starting.
    audio.applyPreset({ ...selected, orbit: speed, spread, reverb });
    await audio.play();
  };

  return (
    <div className="space-y-5">
      {/* Source loader */}
      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
            Load a track
          </div>
          <div className="flex gap-2">
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
            <Button
              variant="soft"
              size="md"
              className="flex-1"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" /> Choose file
            </Button>
          </div>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="…or paste a CORS-enabled URL"
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
          {fileName && (
            <p className="truncate text-xs text-sage-300">Loaded: {fileName}</p>
          )}
          {audio.error && (
            <p className="flex items-start gap-1.5 text-xs text-ember-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {audio.error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Orbit visualizer + play */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6">
          <div className="relative h-40 w-40">
            <div className="absolute inset-0 rounded-full border border-ink-700/70" />
            <div className="absolute inset-6 rounded-full border border-ink-800/70" />
            <div className="absolute inset-0 flex items-center justify-center text-mist-600">
              <User className="h-6 w-6" />
            </div>
            <div
              className={cn(
                "absolute inset-0",
                audio.playing && "motion-safe:animate-spin"
              )}
              style={{ animationDuration: `${speed}s` }}
            >
              <span className="absolute left-1/2 top-1 h-3 w-3 -translate-x-1/2 rounded-full bg-sage-400 shadow-[0_0_12px_2px_rgba(93,156,128,0.6)]" />
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={onPlay}
            disabled={!audio.hasSource}
          >
            {audio.playing ? (
              <><Pause className="h-5 w-5" /> Pause</>
            ) : (
              <><Play className="h-5 w-5" /> Play 8D</>
            )}
          </Button>
          {!audio.hasSource && (
            <p className="text-xs text-mist-600">Load a track to begin.</p>
          )}
        </CardContent>
      </Card>

      {/* Preset grid */}
      <div>
        <div className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
          Presets
        </div>
        <div className="grid grid-cols-2 gap-2">
          {EIGHT_D_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                p.id === presetId
                  ? "border-sage-500/50 bg-sage-500/10"
                  : "border-ink-700 hover:border-ink-600"
              )}
            >
              <div className="text-sm font-medium text-mist-100">{p.name}</div>
              <div className="mt-0.5 text-[11px] text-mist-500">
                {p.orbit}s · {p.spread}% wide · {p.reverb}% air
              </div>
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
