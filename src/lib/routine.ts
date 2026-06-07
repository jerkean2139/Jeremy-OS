// The Morning Ritual — a calm, timed 6am → 7am flow:
// check-in → stretch (5 min) → walk (30–45 min) → complete.
// Pure data + helpers; the page wires the timers and voice.

import { type DayEntry } from "./types";
import { todayKey } from "./utils";

export interface StretchMove {
  name: string;
  cue: string;
  sec: number;
}

// A gentle 5-minute sequence (sums to 300s).
export const STRETCH_SEQUENCE: StretchMove[] = [
  { name: "Neck & shoulders", cue: "Slow rolls. Let the shoulders drop away from the ears.", sec: 60 },
  { name: "Forward fold", cue: "Hinge at the hips. Let the spine hang heavy.", sec: 60 },
  { name: "Hip opener", cue: "Low lunge — switch sides at the halfway mark.", sec: 75 },
  { name: "Spinal twist", cue: "Easy rotation, one breath each direction.", sec: 60 },
  { name: "Reach & breathe", cue: "Tall reach overhead. Three deep breaths.", sec: 45 },
];

export const STRETCH_TOTAL_SEC = STRETCH_SEQUENCE.reduce((s, m) => s + m.sec, 0);

export const WALK_MIN_SEC = 30 * 60;
export const WALK_MAX_SEC = 45 * 60;

// Spoken nudges during the walk, rotated every ~10 minutes.
export const WALK_PROMPTS = [
  "Settle into the pace. What's the one mountain today?",
  "Halfway. Notice the pressure — name where it's coming from.",
  "Good. Let the noise fall away. What's the first move when you sit down?",
  "Almost there. Picture the day going well. Then go make it real.",
];

export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/**
 * Ritual streak = consecutive days (ending today) with a completed ritual.
 * Calm by design: if today isn't done yet, the streak counts from yesterday
 * back rather than resetting to zero — "today pending," not "you failed."
 */
export function calcRoutineStreak(days: Record<string, DayEntry>, now = new Date()): number {
  const cursor = new Date(now);
  if (!days[todayKey(cursor)]?.routine) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days[todayKey(cursor)]?.routine) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
    if (streak > 3650) break;
  }
  return streak;
}
