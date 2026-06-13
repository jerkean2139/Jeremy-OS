"use client";

import { useMemo, useRef, useState } from "react";
import { Play, Pause, AlertCircle, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { useStore } from "@/lib/store";
import { useBinaural } from "@/hooks/useBinaural";
import { BINAURAL_PRESETS } from "@/lib/audio/presets";
import type { BackgroundType } from "@/lib/audio/binaural";
import { cn } from "@/lib/utils";

const BACKGROUNDS: { type: BackgroundType; label: string }[] = [
  { type: "none", label: "None" },
  { type: "pink", label: "Pink noise" },
  { type: "brown", label: "Brown noise" },
  { type: "track", label: "My track" },
];

export function BinauralPanel() {
  const presetId = useStore((s) => s.binauralPresetId) ?? 6;
  const setPreset = useStore((s) => s.setBinauralPreset);
  const audio = useBinaural();

  const selected = useMemo(
    () => BINAURAL_PRESETS.find((p) => p.id === presetId) ?? BINAURAL_PRESETS[5],
    [presetId]
  );

  const [volume, setVolume] = useState(50);
  const [bg, setBg] = useState<BackgroundType>("none");
  const [bgLevel, setBgLevel] = useState(40);
  const [trackName, setTrackName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPlay = async () => {
    if (audio.playing) {
      audio.pause();
      return;
    }
    audio.applyPreset(selected);
    audio.setVolume(volume);
    audio.setBackground(bg, bgLevel);
    await audio.play();
  };

  const pickPreset = (id: number) => {
    const p = BINAURAL_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPreset(id);
    audio.applyPreset(p); // ramps smoothly if already playing
  };

  const chooseBackground = (type: BackgroundType) => {
    if (type === "track" && !trackName) {
      fileRef.current?.click();
      return;
    }
    setBg(type);
    audio.setBackground(type, bgLevel);
  };

  return (
    <div className="space-y-5">
      {/* Now playing readout + play */}
      <Card>
        <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
          <div className="text-2xl font-semibold text-mist-50">{selected.name}</div>
          <div className="flex items-center gap-2 text-sm text-mist-400">
            <span className="rounded-full bg-ink-800 px-2 py-0.5 text-xs text-sky-300">
              {selected.band}
            </span>
            <span className="tabular-nums">{selected.beat} Hz beat</span>
            <span className="text-mist-600">·</span>
            <span className="tabular-nums">{selected.carrier} Hz carrier</span>
          </div>
          <Button size="lg" className="mt-1 w-full" onClick={onPlay}>
            {audio.playing ? (
              <><Pause className="h-5 w-5" /> Pause</>
            ) : (
              <><Play className="h-5 w-5" /> Play tones</>
            )}
          </Button>
          {audio.error && (
            <p className="flex items-start gap-1.5 text-xs text-ember-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {audio.error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Preset grid */}
      <div>
        <div className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
          Presets
        </div>
        <div className="grid grid-cols-2 gap-2">
          {BINAURAL_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => pickPreset(p.id)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                p.id === presetId
                  ? "border-sage-500/50 bg-sage-500/10"
                  : "border-ink-700 hover:border-ink-600"
              )}
            >
              <div className="text-sm font-medium text-mist-100">{p.name}</div>
              <div className="mt-0.5 text-[11px] text-mist-500">
                {p.band} · {p.beat} Hz
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Volume + background */}
      <Card>
        <CardContent className="space-y-4 pt-5">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-mist-300">Tone volume</span>
              <span className="tabular-nums text-mist-500">{volume}%</span>
            </div>
            <Slider
              min={0}
              max={100}
              step={5}
              value={volume}
              onChange={(v) => {
                setVolume(v);
                audio.setVolume(v);
              }}
            />
          </div>

          <div>
            <div className="mb-2 text-sm text-mist-300">Background</div>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  audio.setTrack(f);
                  setTrackName(f.name);
                  setBg("track");
                  audio.setBackground("track", bgLevel);
                }
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              {BACKGROUNDS.map((b) => (
                <button
                  key={b.type}
                  onClick={() => chooseBackground(b.type)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition-colors",
                    bg === b.type
                      ? "border-sky-500/50 bg-sky-500/10 text-sky-200"
                      : "border-ink-700 text-mist-300 hover:border-ink-600"
                  )}
                >
                  {b.type === "track" && <Upload className="h-3.5 w-3.5" />}
                  {b.type === "track" ? trackName ? "My track" : b.label : b.label}
                </button>
              ))}
            </div>
            {bg !== "none" && (
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-mist-300">Background level</span>
                  <span className="tabular-nums text-mist-500">{bgLevel}%</span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={bgLevel}
                  onChange={(v) => {
                    setBgLevel(v);
                    audio.setBackground(bg, v);
                  }}
                  accent="#6c8cc7"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
