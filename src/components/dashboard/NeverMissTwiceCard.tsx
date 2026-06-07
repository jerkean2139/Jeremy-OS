"use client";

import { RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { activeHabits, missState } from "@/lib/habits";
import { floorsOn, actsOn } from "@/lib/analytics";
import { todayKey } from "@/lib/utils";

// "Never miss twice" — calm recovery, never a broken-streak shaming. Only
// appears when there's something to gently get back on top of today.
export function NeverMissTwiceCard() {
  const habits = useStore((s) => s.habits);
  const days = useStore((s) => s.days);
  const elevatorLogs = useStore((s) => s.elevatorLogs);
  const theaterLogs = useStore((s) => s.theaterLogs);

  const now = new Date();
  const today = todayKey(now);
  const yest = todayKey(new Date(now.getTime() - 86400000));

  const messages: string[] = [];

  // User-defined habits in a recoverable state.
  for (const h of activeHabits(habits ?? [])) {
    if (missState(h, now) === "recover") {
      messages.push(
        h.kind === "build"
          ? `${h.name}: missed yesterday. Do the two-minute version today.`
          : `${h.name}: yesterday slipped. Today's a clean slate.`
      );
    }
  }

  // The morning ritual: missed yesterday, not yet done today.
  if (!days[yest]?.routine && !days[today]?.routine) {
    messages.push("Morning Ritual: missed yesterday. Even a short version counts today.");
  }

  // The two key habits — gentle, only when yesterday had activity and today is clean.
  if (floorsOn(elevatorLogs, yest) > 0 && floorsOn(elevatorLogs, today) === 0) {
    messages.push("Elevator: yesterday happened, no shame. Today's clean so far — keep it.");
  }
  if (actsOn(theaterLogs, yest) > 0 && actsOn(theaterLogs, today) === 0) {
    messages.push("Theater: yesterday happened. Never miss twice — today's a fresh page.");
  }

  if (messages.length === 0) return null;

  return (
    <div className="rounded-2xl border border-ember-500/25 bg-ember-500/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-ember-300">
        <RotateCcw className="h-3.5 w-3.5" /> Never miss twice
      </div>
      <div className="space-y-1.5">
        {messages.slice(0, 4).map((m, i) => (
          <p key={i} className="text-sm leading-relaxed text-mist-300">
            {m}
          </p>
        ))}
      </div>
    </div>
  );
}
