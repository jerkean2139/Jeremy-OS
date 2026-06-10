// Steps + mileage accrual from logged walks. Steps come from the walk step and
// lunchtime make-ups (DayEntry.steps); miles are derived from steps. Pure
// functions over the days map so totals are reusable across card + page.

import { type DayEntry } from "./types";
import { todayKey } from "./utils";

// Average stride: ~2,100 steps per mile is a reasonable all-round figure.
export const STEPS_PER_MILE = 2100;

export function milesFromSteps(steps: number): number {
  return steps / STEPS_PER_MILE;
}

export interface MovementDay {
  date: string;
  steps: number;
  miles: number;
  walkMinutes: number;
}

export function movementForDay(date: string, day?: DayEntry): MovementDay {
  const steps = day?.steps ?? 0;
  const walkSec = day?.routine?.walkSec ?? 0;
  return {
    date,
    steps,
    miles: Math.round(milesFromSteps(steps) * 100) / 100,
    walkMinutes: Math.round(walkSec / 60),
  };
}

export interface MovementTotals {
  steps: number;
  miles: number;
  walkMinutes: number;
  activeDays: number; // days with any steps or walk time
}

function emptyTotals(): MovementTotals {
  return { steps: 0, miles: 0, walkMinutes: 0, activeDays: 0 };
}

// Sum movement across the days map. `sinceKey` (YYYY-MM-DD) bounds the window
// inclusively; omit for all-time.
export function movementTotals(
  days: Record<string, DayEntry>,
  sinceKey?: string
): MovementTotals {
  const t = emptyTotals();
  for (const [key, day] of Object.entries(days)) {
    if (sinceKey && key < sinceKey) continue;
    const m = movementForDay(key, day);
    if (m.steps === 0 && m.walkMinutes === 0) continue;
    t.steps += m.steps;
    t.miles += m.miles;
    t.walkMinutes += m.walkMinutes;
    t.activeDays += 1;
  }
  t.miles = Math.round(t.miles * 100) / 100;
  return t;
}

function shiftKey(daysAgo: number, now = new Date()): string {
  return todayKey(new Date(now.getTime() - daysAgo * 86400000));
}

export interface MovementSummary {
  today: MovementTotals;
  week: MovementTotals;
  month: MovementTotals;
  allTime: MovementTotals;
}

export function movementSummary(
  days: Record<string, DayEntry>,
  now = new Date()
): MovementSummary {
  return {
    today: movementTotals(days, todayKey(now)),
    week: movementTotals(days, shiftKey(6, now)),
    month: movementTotals(days, shiftKey(29, now)),
    allTime: movementTotals(days),
  };
}

// Most recent active days, newest first, for a history list.
export function recentMovement(
  days: Record<string, DayEntry>,
  limit = 30
): MovementDay[] {
  return Object.entries(days)
    .map(([key, day]) => movementForDay(key, day))
    .filter((m) => m.steps > 0 || m.walkMinutes > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, limit);
}

export function fmtMiles(miles: number): string {
  return miles >= 10 ? miles.toFixed(0) : miles.toFixed(1);
}
