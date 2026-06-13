"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BinauralEngine, type BackgroundType } from "@/lib/audio/binaural";
import type { BinauralPreset } from "@/lib/audio/presets";

// React wrapper around the binaural engine. Created lazily on the first play
// tap so the AudioContext is born inside a user gesture.
export function useBinaural() {
  const ref = useRef<BinauralEngine | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const engine = useCallback(() => {
    if (!ref.current) {
      const e = new BinauralEngine();
      e.onError = (m) => setError(m);
      ref.current = e;
    }
    return ref.current;
  }, []);

  const play = useCallback(async () => {
    setError(null);
    await engine().play();
    setPlaying(true);
  }, [engine]);

  const pause = useCallback(() => {
    engine().pause();
    setPlaying(false);
  }, [engine]);

  const applyPreset = useCallback(
    (p: BinauralPreset) => engine().setBeat(p.carrier, p.beat),
    [engine]
  );
  const setVolume = useCallback((v: number) => engine().setVolume(v), [engine]);
  const setBackground = useCallback(
    (type: BackgroundType, level: number) => engine().setBackground(type, level),
    [engine]
  );
  const setTrack = useCallback((src: File | string) => engine().setTrack(src), [engine]);
  const stop = useCallback(() => {
    if (ref.current?.playing) {
      ref.current.pause();
      setPlaying(false);
    }
  }, []);

  useEffect(() => () => ref.current?.destroy(), []);

  return { playing, error, play, pause, stop, applyPreset, setVolume, setBackground, setTrack };
}
