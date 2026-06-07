"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Bell, BellOff, Mountain, Check } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { VoiceField } from "@/components/VoiceField";
import { useStore } from "@/lib/store";
import { PULSE_TAGS, type PulseTag } from "@/lib/types";
import { pulsesOn, summarizePulses } from "@/lib/analytics";
import { todayKey, cn } from "@/lib/utils";

const INTERVALS = [15, 25, 30, 60]; // minutes
const TIMER_KEY = "jeremy-os-pulse-timer";

const TAG_STYLE: Record<PulseTag, { dot: string; chip: string }> = {
  mountain: { dot: "bg-sage-400", chip: "border-sage-500 bg-sage-500/15 text-sage-400" },
  admin: { dot: "bg-sky-400", chip: "border-sky-500 bg-sky-500/15 text-sky-400" },
  noise: { dot: "bg-ember-400", chip: "border-ember-500 bg-ember-500/15 text-ember-400" },
};

export default function PulsePage() {
  return (
    <HydrationGate>
      <Pulse />
    </HydrationGate>
  );
}

interface TimerState {
  endsAt: number | null; // epoch ms when the current interval ends
  remaining: number; // ms left when paused
  running: boolean;
  interval: number; // minutes
}

function loadTimer(): TimerState {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      if (raw) return JSON.parse(raw) as TimerState;
    } catch {
      /* ignore */
    }
  }
  return { endsAt: null, remaining: 15 * 60_000, running: false, interval: 15 };
}

function Pulse() {
  const addPulseLog = useStore((s) => s.addPulseLog);
  const pulseLogs = useStore((s) => s.pulseLogs);

  const [timer, setTimer] = useState<TimerState>(loadTimer);
  const [now, setNow] = useState(() => Date.now());
  const [capturing, setCapturing] = useState(false);
  const [activity, setActivity] = useState("");
  const [tag, setTag] = useState<PulseTag>("mountain");
  const [notify, setNotify] = useState(false);
  const firedRef = useRef(false);

  // Persist timer across navigation / reload.
  useEffect(() => {
    localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
  }, [timer]);

  // Notification permission state.
  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setNotify(Notification.permission === "granted");
    }
  }, []);

  const fire = useCallback(() => {
    // Gentle nudge: notification + vibration. The capture sheet opens in-app.
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Pulse check", {
          body: "What are you doing right now — Mountain or Noise?",
          icon: "/icons/icon-192.png",
          tag: "jeremy-os-pulse",
        });
      }
    } catch {
      /* ignore */
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.([180, 80, 180]);
    }
    setCapturing(true);
  }, []);

  // 1s tick while running.
  useEffect(() => {
    if (!timer.running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timer.running]);

  // Detect the interval elapsing.
  useEffect(() => {
    if (timer.running && timer.endsAt && now >= timer.endsAt && !firedRef.current) {
      firedRef.current = true;
      setTimer((t) => ({ ...t, running: false, remaining: t.interval * 60_000, endsAt: null }));
      fire();
    }
  }, [now, timer.running, timer.endsAt, fire]);

  const remainingMs = timer.running && timer.endsAt ? Math.max(0, timer.endsAt - now) : timer.remaining;
  const totalMs = timer.interval * 60_000;
  const mm = Math.floor(remainingMs / 60_000);
  const ss = Math.floor((remainingMs % 60_000) / 1000);
  const progress = 1 - remainingMs / totalMs;

  const start = async () => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      try {
        const p = await Notification.requestPermission();
        setNotify(p === "granted");
      } catch {
        /* ignore */
      }
    }
    firedRef.current = false;
    setNow(Date.now());
    setTimer((t) => ({ ...t, running: true, endsAt: Date.now() + t.remaining }));
  };

  const pause = () =>
    setTimer((t) => ({
      ...t,
      running: false,
      remaining: t.endsAt ? Math.max(0, t.endsAt - Date.now()) : t.remaining,
      endsAt: null,
    }));

  const reset = () => {
    firedRef.current = false;
    setTimer((t) => ({ ...t, running: false, endsAt: null, remaining: t.interval * 60_000 }));
  };

  const setInterval_ = (mins: number) => {
    firedRef.current = false;
    setTimer({ interval: mins, remaining: mins * 60_000, running: false, endsAt: null });
  };

  const saveCapture = (autoRestart: boolean) => {
    if (activity.trim()) {
      addPulseLog({ activity: activity.trim(), tag });
    }
    setActivity("");
    setTag("mountain");
    setCapturing(false);
    firedRef.current = false;
    if (autoRestart) {
      setNow(Date.now());
      setTimer((t) => ({ ...t, running: true, endsAt: Date.now() + t.interval * 60_000 }));
    } else {
      setTimer((t) => ({ ...t, running: false, endsAt: null, remaining: t.interval * 60_000 }));
    }
  };

  const requestNotify = async () => {
    if (typeof Notification === "undefined") return;
    try {
      const p = await Notification.requestPermission();
      setNotify(p === "granted");
    } catch {
      /* ignore */
    }
  };

  const today = pulsesOn(pulseLogs, todayKey());
  const summary = summarizePulses(today);

  return (
    <div>
      <PageHeader
        title="Pulse"
        subtitle="Every 15 minutes, one honest question: Mountain or Noise?"
        back="/"
      />

      {/* Timer */}
      <Card className="mb-5 overflow-hidden">
        <div className="bg-gradient-to-br from-sage-500/10 to-sky-500/5 p-6">
          {/* Ring */}
          <div className="relative mx-auto h-52 w-52">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#1d222b" strokeWidth="6" />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#5d9c80"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 45}
                strokeDashoffset={2 * Math.PI * 45 * (1 - progress)}
                className="transition-[stroke-dashoffset] duration-1000 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-semibold tabular-nums text-mist-50">
                {mm}:{String(ss).padStart(2, "0")}
              </span>
              <span className="mt-1 text-xs uppercase tracking-[0.18em] text-mist-500">
                {timer.running ? "Focusing" : "Ready"}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button variant="soft" size="md" onClick={reset} className="h-12 w-12 rounded-2xl p-0">
              <RotateCcw className="h-5 w-5" />
            </Button>
            {timer.running ? (
              <Button size="lg" onClick={pause} className="px-8">
                <Pause className="h-5 w-5" /> Pause
              </Button>
            ) : (
              <Button size="lg" onClick={start} className="px-8">
                <Play className="h-5 w-5" /> Start
              </Button>
            )}
            <Button
              variant="soft"
              size="md"
              onClick={requestNotify}
              className="h-12 w-12 rounded-2xl p-0"
              aria-label="Reminders"
            >
              {notify ? <Bell className="h-5 w-5 text-sage-400" /> : <BellOff className="h-5 w-5" />}
            </Button>
          </div>

          {/* Interval picker */}
          <div className="mt-5 flex justify-center gap-2">
            {INTERVALS.map((m) => (
              <button
                key={m}
                onClick={() => setInterval_(m)}
                disabled={timer.running}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm transition-colors disabled:opacity-40",
                  timer.interval === m
                    ? "border-sage-500 bg-sage-500/15 text-sage-400"
                    : "border-ink-600 bg-ink-800/50 text-mist-400"
                )}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
      </Card>

      {!notify && (
        <p className="mb-5 text-center text-xs text-mist-500">
          Reminders fire while Jeremy OS is open. Tap the bell to enable them.
        </p>
      )}

      {/* Today's summary */}
      {summary.total > 0 && (
        <div className="mb-5 grid grid-cols-4 gap-3">
          <div className="rounded-2xl border border-ink-700/60 bg-ink-850/70 p-3 text-center">
            <div className="text-xl font-semibold tabular-nums text-sage-400">
              {Math.round(summary.focusRatio * 100)}%
            </div>
            <div className="text-[10px] uppercase tracking-wider text-mist-500">On Mountain</div>
          </div>
          <div className="rounded-2xl border border-ink-700/60 bg-ink-850/70 p-3 text-center">
            <div className="text-xl font-semibold tabular-nums text-sage-400">{summary.byTag.mountain}</div>
            <div className="text-[10px] uppercase tracking-wider text-mist-500">Mountain</div>
          </div>
          <div className="rounded-2xl border border-ink-700/60 bg-ink-850/70 p-3 text-center">
            <div className="text-xl font-semibold tabular-nums text-sky-400">{summary.byTag.admin}</div>
            <div className="text-[10px] uppercase tracking-wider text-mist-500">Admin</div>
          </div>
          <div className="rounded-2xl border border-ink-700/60 bg-ink-850/70 p-3 text-center">
            <div className="text-xl font-semibold tabular-nums text-ember-400">{summary.byTag.noise}</div>
            <div className="text-[10px] uppercase tracking-wider text-mist-500">Noise</div>
          </div>
        </div>
      )}

      {/* Manual log + timeline */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-mist-400">
          Today&apos;s pulses
        </h2>
        {!capturing && (
          <button
            onClick={() => setCapturing(true)}
            className="text-sm text-mist-400 hover:text-mist-100"
          >
            + Log now
          </button>
        )}
      </div>

      {today.length === 0 && !capturing && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-mist-500">
            Start the timer. When it rings, capture what you were doing.
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {today.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-xl border border-ink-700/60 bg-ink-850/60 px-4 py-3"
          >
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", TAG_STYLE[p.tag].dot)} />
            <span className="flex-1 text-sm text-mist-100">{p.activity}</span>
            <span className="text-xs tabular-nums text-mist-500">
              {new Date(p.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
          </div>
        ))}
      </div>

      {/* Capture sheet */}
      {capturing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-fade-in rounded-t-3xl border-t border-ink-700 bg-ink-900 p-5 pb-8">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-600" />
            <div className="mb-4 flex items-center gap-2 text-sage-400">
              <Mountain className="h-4 w-4" />
              <span className="text-sm font-medium">Pulse check</span>
            </div>

            <VoiceField
              label="What are you doing right now?"
              placeholder="Be honest — one line…"
              value={activity}
              onChange={setActivity}
              rows={2}
            />

            <div className="mt-4 grid grid-cols-3 gap-2">
              {PULSE_TAGS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTag(t.value)}
                  className={cn(
                    "h-12 rounded-xl border text-sm font-medium transition-colors",
                    tag === t.value
                      ? TAG_STYLE[t.value].chip
                      : "border-ink-600 bg-ink-800/50 text-mist-400"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-5 flex gap-3">
              <Button variant="outline" size="lg" className="flex-1" onClick={() => saveCapture(false)}>
                Save &amp; stop
              </Button>
              <Button size="lg" className="flex-1" onClick={() => saveCapture(true)}>
                <Check className="h-5 w-5" /> Save &amp; continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
