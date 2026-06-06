// Derived analytics + pattern detection. Pure functions over store state so
// they're easy to test and reuse across the dashboard, analytics page, and
// the AI coach context.

import {
  type DayEntry,
  type ElevatorLog,
  type TheaterLog,
  type PulseEntry,
  type PulseTag,
} from "./types";
import { todayKey } from "./utils";

export function pulsesOn(logs: PulseEntry[], dateKey: string): PulseEntry[] {
  return logs.filter((l) => startOfDayKey(l.timestamp) === dateKey);
}

export interface PulseSummary {
  total: number;
  byTag: Record<PulseTag, number>;
  focusRatio: number; // mountain / total, 0..1
}

export function summarizePulses(entries: PulseEntry[]): PulseSummary {
  const byTag: Record<PulseTag, number> = { mountain: 0, noise: 0, admin: 0 };
  for (const e of entries) byTag[e.tag] += 1;
  const total = entries.length;
  return { total, byTag, focusRatio: total ? byTag.mountain / total : 0 };
}

export function startOfDayKey(ts: string): string {
  return todayKey(new Date(ts));
}

/**
 * "Streak" = consecutive days (ending today) with zero Elevator floors.
 * This is intentionally awareness-oriented, not shame-oriented: a streak is
 * a quiet signal of calm, not a scoreboard.
 */
export function calcElevatorFreeStreak(logs: ElevatorLog[], now = new Date()): number {
  const daysWithFloors = new Set(
    logs.filter((l) => l.floors > 0).map((l) => startOfDayKey(l.timestamp))
  );
  let streak = 0;
  const cursor = new Date(now);
  // count back day by day until we hit a day with floors
  // (today counts only if it has no floors yet)
  while (!daysWithFloors.has(todayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
    if (streak > 3650) break; // safety
  }
  return streak;
}

export function floorsOn(logs: ElevatorLog[], dateKey: string): number {
  return logs
    .filter((l) => startOfDayKey(l.timestamp) === dateKey)
    .reduce((sum, l) => sum + l.floors, 0);
}

export function actsOn(logs: TheaterLog[], dateKey: string): number {
  return logs
    .filter((l) => startOfDayKey(l.timestamp) === dateKey)
    .reduce((sum, l) => sum + l.acts, 0);
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  label: string; // short label e.g. "Mon"
  pressure: number | null;
  floors: number;
  acts: number;
  sleep: number | null;
  weight: number | null;
  movedMountain: number | null; // 1 / 0 / null
  pulseMountain: number;
  pulseNoise: number;
  focusPct: number | null; // % of pulses on the Mountain that day
}

export function buildSeries(
  days: Record<string, DayEntry>,
  elevatorLogs: ElevatorLog[],
  theaterLogs: TheaterLog[],
  pulseLogs: PulseEntry[],
  rangeDays: number,
  now = new Date()
): DailyPoint[] {
  const out: DailyPoint[] = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = todayKey(d);
    const day = days[key];
    const pulses = summarizePulses(pulsesOn(pulseLogs, key));
    out.push({
      date: key,
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      pressure: day?.pressureLevel ?? null,
      floors: floorsOn(elevatorLogs, key),
      acts: actsOn(theaterLogs, key),
      sleep: day?.sleepHours ?? null,
      weight: day?.weight ?? null,
      movedMountain:
        day?.movedMountain === true ? 1 : day?.movedMountain === false ? 0 : null,
      pulseMountain: pulses.byTag.mountain,
      pulseNoise: pulses.byTag.noise,
      focusPct: pulses.total ? Math.round(pulses.focusRatio * 100) : null,
    });
  }
  return out;
}

export interface Correlation {
  label: string;
  value: number; // -1..1
  insight: string;
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

function pairs(series: DailyPoint[], a: keyof DailyPoint, b: keyof DailyPoint) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const p of series) {
    const av = p[a];
    const bv = p[b];
    if (typeof av === "number" && typeof bv === "number") {
      xs.push(av);
      ys.push(bv);
    }
  }
  return { xs, ys };
}

function describe(label: string, r: number): string {
  const strength =
    Math.abs(r) >= 0.6 ? "a strong" : Math.abs(r) >= 0.35 ? "a noticeable" : "a faint";
  const dir = r > 0 ? "rises with" : "eases with";
  return `${label}: ${strength} pattern — the first ${dir} the second.`;
}

export function correlations(series: DailyPoint[]): Correlation[] {
  const defs: { label: string; a: keyof DailyPoint; b: keyof DailyPoint }[] = [
    { label: "Pressure vs Elevator", a: "pressure", b: "floors" },
    { label: "Pressure vs Theater", a: "pressure", b: "acts" },
    { label: "Sleep vs Pressure", a: "sleep", b: "pressure" },
    { label: "Weight vs Elevator", a: "weight", b: "floors" },
    { label: "Productive days vs Elevator", a: "movedMountain", b: "floors" },
    { label: "Focus vs Pressure", a: "focusPct", b: "pressure" },
    { label: "Focus vs Elevator", a: "focusPct", b: "floors" },
  ];
  const out: Correlation[] = [];
  for (const def of defs) {
    const { xs, ys } = pairs(series, def.a, def.b);
    const r = pearson(xs, ys);
    if (r === null) continue;
    out.push({ label: def.label, value: Math.round(r * 100) / 100, insight: describe(def.label, r) });
  }
  return out;
}
