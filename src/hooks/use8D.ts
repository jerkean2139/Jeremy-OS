"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EightDEngine } from "@/lib/audio/eightD";
import type { EightDPreset } from "@/lib/audio/presets";

// React wrapper around the 8D engine. The engine (and its AudioContext) is
// created lazily on the first user gesture — loading a file or tapping play.
export function use8D() {
  const ref = useRef<EightDEngine | null>(null);
  const [playing, setPlaying] = useState(false);
  const [hasSource, setHasSource] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeedState] = useState(8);

  const engine = useCallback(() => {
    if (!ref.current) {
      const e = new EightDEngine();
      e.onError = (m) => {
        setError(m);
        setPlaying(false);
      };
      e.onEnded = () => setPlaying(false);
      ref.current = e;
    }
    return ref.current;
  }, []);

  const load = useCallback(
    (src: File | string) => {
      setError(null);
      engine().setSource(src);
      setHasSource(true);
    },
    [engine]
  );

  const play = useCallback(async () => {
    setError(null);
    await engine().play();
    setPlaying(engine().playing);
  }, [engine]);

  const pause = useCallback(() => {
    engine().pause();
    setPlaying(false);
  }, [engine]);

  const applyPreset = useCallback(
    (p: EightDPreset) => {
      const e = engine();
      e.setSpeed(p.orbit);
      e.setSpread(p.spread);
      e.setReverb(p.reverb);
      setSpeedState(p.orbit);
    },
    [engine]
  );

  const setSpeed = useCallback(
    (v: number) => {
      engine().setSpeed(v);
      setSpeedState(v);
    },
    [engine]
  );
  const setSpread = useCallback((v: number) => engine().setSpread(v), [engine]);
  const setReverb = useCallback((v: number) => engine().setReverb(v), [engine]);
  const getAngle = useCallback(() => ref.current?.getAngle() ?? 0, []);
  const stop = useCallback(() => {
    if (ref.current?.playing) {
      ref.current.pause();
      setPlaying(false);
    }
  }, []);

  useEffect(() => () => ref.current?.destroy(), []);

  return { playing, hasSource, error, speed, load, play, pause, stop, applyPreset, setSpeed, setSpread, setReverb, getAngle };
}
