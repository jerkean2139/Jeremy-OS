// The Atomic Habits layer — pure functions over store state.
//
// Two ideas from James Clear, expressed without shame:
//   • Identity over goals: "Every action is a vote for the type of person you
//     wish to become." We tally those votes from the good things already
//     logged across the app.
//   • Never miss twice: one slip isn't failure; only missing twice starts a
//     new habit. We surface a calm "get back today" rather than a broken streak.

import type { DayEntry, ElevatorLog, PulseEntry, Habit } from "./types";
import { todayKey } from "./utils";

function shift(d: Date, days: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + days);
  return c;
}

// --- Habit completion + streaks ---

export function habitMarkedOn(h: Habit, key: string): boolean {
  return h.log.includes(key);
}

export function habitDoneToday(h: Habit, now = new Date()): boolean {
  return habitMarkedOn(h, todayKey(now));
}

/**
 * For "build" habits: consecutive days completed (a not-yet-done today doesn't
 * break it — you still have today). For "break" habits: consecutive clean days
 * with no slip, ending today.
 */
export function habitStreak(h: Habit, now = new Date()): number {
  let streak = 0;
  let cursor = new Date(now);

  if (h.kind === "build") {
    if (!habitMarkedOn(h, todayKey(cursor))) cursor = shift(cursor, -1);
    while (habitMarkedOn(h, todayKey(cursor))) {
      streak += 1;
      cursor = shift(cursor, -1);
      if (streak > 3650) break;
    }
  } else {
    // clean streak: count back while no slip is logged, bounded by when the
    // habit was created (a fresh habit can't be "3650 days clean").
    const created = new Date(h.createdAt);
    const createdKey = isNaN(created.getTime()) ? "0000-00-00" : todayKey(created);
    while (!habitMarkedOn(h, todayKey(cursor)) && todayKey(cursor) >= createdKey) {
      streak += 1;
      cursor = shift(cursor, -1);
      if (streak > 3650) break;
    }
  }
  return streak;
}

export type MissState = "clean" | "recover" | "missing";

/**
 * "Never miss twice" status for a habit.
 *   build:  "recover"  = missed yesterday, not yet done today (don't miss twice)
 *           "missing"  = missed yesterday AND the day before (already missed twice+)
 *   break:  "recover"  = slipped yesterday, clean so far today
 *           "missing"  = slipped yesterday AND today
 */
export function missState(h: Habit, now = new Date()): MissState {
  const today = todayKey(now);
  const yest = todayKey(shift(now, -1));
  const prev = todayKey(shift(now, -2));

  if (h.kind === "build") {
    const doneToday = habitMarkedOn(h, today);
    const doneYest = habitMarkedOn(h, yest);
    const donePrev = habitMarkedOn(h, prev);
    if (doneToday || doneYest) return "clean";
    if (!doneYest && !donePrev) return "missing";
    return "recover"; // missed yesterday only
  } else {
    const slipToday = habitMarkedOn(h, today);
    const slipYest = habitMarkedOn(h, yest);
    if (slipYest && slipToday) return "missing";
    if (slipYest && !slipToday) return "recover"; // slipped yesterday, clean today
    return "clean"; // no slips, or only a slip today (one isn't missing twice)
  }
}

export function activeHabits(habits: Habit[]): Habit[] {
  return habits.filter((h) => !h.archivedAt);
}

// --- Identity votes ---
// Every recorded good action is a vote for who you're becoming.

export interface VoteSources {
  days: Record<string, DayEntry>;
  elevatorLogs: ElevatorLog[];
  pulseLogs: PulseEntry[];
  habits: Habit[];
  scriptureReadDates: string[]; // dateKeys the Daily Word was read
}

export interface Vote {
  label: string;
}

// Votes cast on a single day. Only explicit, recorded actions count — no
// false positives from empty days.
export function votesForDay(src: VoteSources, key: string): Vote[] {
  const votes: Vote[] = [];
  const day = src.days[key];

  if (day?.morning) votes.push({ label: "Set the day's intention" });
  if (day?.routine) votes.push({ label: "Showed up for the morning ritual" });
  if (day?.reflection) votes.push({ label: "Closed the day with reflection" });
  if (day?.movedMountain === true) votes.push({ label: "Moved the mountain" });

  const mountainPulses = src.pulseLogs.filter(
    (p) => p.tag === "mountain" && todayKey(new Date(p.timestamp)) === key
  ).length;
  for (let i = 0; i < mountainPulses; i++) votes.push({ label: "Chose the Mountain over Noise" });

  if (src.scriptureReadDates.includes(key)) votes.push({ label: "Read the Daily Word" });

  for (const h of activeHabits(src.habits)) {
    if (h.kind === "build" && habitMarkedOn(h, key)) {
      votes.push({ label: h.identity ? `Cast a vote: ${h.identity}` : `Did "${h.name}"` });
    }
  }

  return votes;
}

export interface VoteTotals {
  today: number;
  week: number;
  total: number;
  todayVotes: Vote[];
}

// Per-day series for the Analytics page: votes cast, build-habit reps, and
// the share of build habits completed each day.
export interface HabitPoint {
  date: string;
  label: string;
  votes: number;
  reps: number;
  completionPct: number | null;
}

export function buildHabitSeries(
  src: VoteSources,
  rangeDays: number,
  now = new Date()
): HabitPoint[] {
  const buildTotal = activeHabits(src.habits).filter((h) => h.kind === "build").length;
  const out: HabitPoint[] = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = shift(now, -i);
    const key = todayKey(d);
    const reps = activeHabits(src.habits).filter(
      (h) => h.kind === "build" && habitMarkedOn(h, key)
    ).length;
    out.push({
      date: key,
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      votes: votesForDay(src, key).length,
      reps,
      completionPct: buildTotal > 0 ? Math.round((reps / buildTotal) * 100) : null,
    });
  }
  return out;
}

export function voteTotals(src: VoteSources, now = new Date()): VoteTotals {
  const todayK = todayKey(now);
  const todayVotes = votesForDay(src, todayK);

  let week = 0;
  for (let i = 0; i < 7; i++) week += votesForDay(src, todayKey(shift(now, -i))).length;

  // All-time: scan every day that has any record, plus habit/scripture/pulse days.
  const keys = new Set<string>([
    ...Object.keys(src.days),
    ...src.scriptureReadDates,
    ...src.pulseLogs.map((p) => todayKey(new Date(p.timestamp))),
    ...activeHabits(src.habits).flatMap((h) => h.log),
  ]);
  let total = 0;
  for (const k of keys) total += votesForDay(src, k).length;

  return { today: todayVotes.length, week, total, todayVotes };
}
