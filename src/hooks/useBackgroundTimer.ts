"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Persisted {
  acc: number; // accumulated seconds from finished (paused) segments
  startedAt: number | null; // epoch ms the current running segment began
}

// A timer that keeps correct time even when the tab is backgrounded or the
// phone is locked. Instead of counting interval ticks (which mobile browsers
// throttle/suspend), it derives elapsed time from wall-clock timestamps and
// re-syncs on focus/visibility. State is persisted, so it also survives a
// reload or the PWA being killed mid-session.
export function useBackgroundTimer(storageKey: string) {
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const accRef = useRef(0);
  const startRef = useRef<number | null>(null);

  const compute = useCallback(() => {
    const running = startRef.current != null ? (Date.now() - startRef.current) / 1000 : 0;
    return accRef.current + running;
  }, []);

  const persist = useCallback(() => {
    if (typeof window === "undefined") return;
    const data: Persisted = { acc: accRef.current, startedAt: startRef.current };
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      /* storage full / unavailable — timer still works in-memory */
    }
  }, [storageKey]);

  // Restore an in-progress timer, or start a fresh running one.
  useEffect(() => {
    let restored = false;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const d = JSON.parse(raw) as Persisted;
        accRef.current = d.acc || 0;
        startRef.current = d.startedAt ?? null;
        setPaused(d.startedAt == null);
        restored = true;
      }
    } catch {
      /* ignore */
    }
    if (!restored) {
      accRef.current = 0;
      startRef.current = Date.now();
      persist();
    }
    setSeconds(compute());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Display tick + re-sync the moment we return to the foreground.
  useEffect(() => {
    const sync = () => setSeconds(compute());
    sync();
    const id = setInterval(sync, 1000);
    const onVisible = () => document.visibilityState === "visible" && sync();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", sync);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", sync);
    };
  }, [compute]);

  const pause = useCallback(() => {
    accRef.current = compute();
    startRef.current = null;
    setPaused(true);
    setSeconds(accRef.current);
    persist();
  }, [compute, persist]);

  const resume = useCallback(() => {
    startRef.current = Date.now();
    setPaused(false);
    persist();
  }, [persist]);

  const toggle = useCallback(() => {
    if (startRef.current == null) resume();
    else pause();
  }, [pause, resume]);

  const clear = useCallback(() => {
    accRef.current = 0;
    startRef.current = null;
    setSeconds(0);
    setPaused(true);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
    }
  }, [storageKey]);

  return { seconds: Math.floor(seconds), paused, toggle, pause, resume, clear };
}
