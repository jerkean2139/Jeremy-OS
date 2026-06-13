"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Activity, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { PULSE_TAGS, type PulseTag } from "@/lib/types";
import { cn } from "@/lib/utils";

// An in-app pulse nudge: while the app is open during your pulse window, it
// surfaces a quick "what are you on?" prompt every cadence so the 15-minute
// check can't slip your mind. Works with no push setup. One tap logs it.
function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export function PulseNudge() {
  const pathname = usePathname();
  const pulse = useStore((s) => s.reminders.pulse);
  const pulseLogs = useStore((s) => s.pulseLogs);
  const addPulseLog = useStore((s) => s.addPulseLog);

  const [visible, setVisible] = useState(false);
  const [activity, setActivity] = useState("");
  // Suppress re-prompting until this epoch-ms (snooze / just-handled).
  const mutedUntilRef = useRef(0);

  const lastPulseMs = (() => {
    let last = 0;
    for (const p of pulseLogs) {
      if (isToday(p.timestamp)) last = Math.max(last, new Date(p.timestamp).getTime());
    }
    return last;
  })();

  const check = useCallback(() => {
    if (pulse.inApp === false) return setVisible(false);
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const inWindow = mins >= toMin(pulse.startTime) && mins <= toMin(pulse.endTime);
    if (!inWindow) return setVisible(false);
    if (Date.now() < mutedUntilRef.current) return;
    const cadenceMs = Math.max(5, pulse.cadenceMin) * 60_000;
    const due = (lastPulseMs ? Date.now() - lastPulseMs : cadenceMs) >= cadenceMs;
    if (due) setVisible(true);
  }, [pulse.inApp, pulse.startTime, pulse.endTime, pulse.cadenceMin, lastPulseMs]);

  useEffect(() => {
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [check]);

  // Hide on the pulse page itself, the lock screen, and the morning ritual.
  if (!visible || ["/unlock", "/pulse", "/routine"].some((p) => pathname.startsWith(p))) return null;

  const log = (tag: PulseTag) => {
    addPulseLog({ activity: activity.trim() || "(quick check)", tag });
    setActivity("");
    mutedUntilRef.current = Date.now() + Math.max(5, pulse.cadenceMin) * 60_000;
    setVisible(false);
  };

  const snooze = () => {
    mutedUntilRef.current = Date.now() + 5 * 60_000;
    setVisible(false);
  };

  return (
    <div
      className="fixed inset-x-0 z-30 mx-auto max-w-lg px-3"
      style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="rounded-2xl border border-sage-500/30 bg-ink-850/95 p-3 shadow-lg backdrop-blur-md">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-mist-100">
            <Activity className="h-4 w-4 text-sage-400" /> Pulse — what are you on?
          </div>
          <button onClick={snooze} className="text-mist-500 hover:text-mist-200" aria-label="Snooze 5 min">
            <X className="h-4 w-4" />
          </button>
        </div>
        <input
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          placeholder="Right now I'm… (optional)"
          className="mb-2 w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-600 outline-none focus:border-ink-600"
        />
        <div className="flex gap-2">
          {PULSE_TAGS.map((t) => (
            <button
              key={t.value}
              onClick={() => log(t.value)}
              className={cn(
                "flex-1 rounded-xl border py-2 text-sm font-medium transition-colors",
                t.value === "mountain"
                  ? "border-sage-500/40 text-sage-300 hover:bg-sage-500/10"
                  : t.value === "noise"
                  ? "border-ember-500/40 text-ember-300 hover:bg-ember-500/10"
                  : "border-ink-600 text-mist-300 hover:bg-ink-800"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
