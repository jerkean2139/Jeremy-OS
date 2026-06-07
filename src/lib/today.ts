// The single most useful next move right now — a calm, deterministic cascade
// used by the dashboard's glanceable "today" line. Never nags about a missed
// ritual after midday (never miss twice); it just points at the next vote.

import type { DayEntry, Habit, ScriptureProgress } from "./types";
import { todayKey } from "./utils";
import { activeHabits, habitMarkedOn } from "./habits";

export interface NextMove {
  label: string;
  href: string;
}

export function nextMoveToday(input: {
  days: Record<string, DayEntry>;
  habits: Habit[];
  scripture: ScriptureProgress;
  now?: Date;
}): NextMove {
  const now = input.now ?? new Date();
  const key = todayKey(now);
  const day = input.days[key];
  const hour = now.getHours();

  // Morning anchor — only surfaced while it's still morning.
  if (!day?.routine && hour < 12) {
    return { label: "Start your Morning Ritual", href: "/routine" };
  }
  if (!day?.routine && !day?.morning) {
    return { label: "Set today's intention", href: "/morning" };
  }

  if (input.scripture?.lastReadDate !== key) {
    return { label: "Read today's Daily Word", href: "/scripture" };
  }

  const remaining = activeHabits(input.habits ?? []).filter(
    (h) => h.kind === "build" && !habitMarkedOn(h, key)
  );
  if (remaining.length > 0) {
    return { label: `Do "${remaining[0].name}" — the 2-minute version`, href: "/habits" };
  }

  if (!day?.reflection && hour >= 17) {
    return { label: "Close the day with reflection", href: "/reflection" };
  }

  return { label: "Run a Pulse — Mountain or Noise?", href: "/pulse" };
}
