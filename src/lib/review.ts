// Weekly Review — a calm, auto-generated digest of the last 7 days. Pure
// functions over store state, building on the analytics series and correlations.
// Philosophy: name a win, surface one pattern, point at one move. Never a scorecard.

import {
  buildSeries,
  correlations,
  calcElevatorFreeStreak,
  type DailyPoint,
} from "./analytics";
import { type JeremyState, type PressureSource } from "./types";

export interface WeeklyReview {
  rangeLabel: string;
  daysTracked: number;
  elevatorFreeDays: number; // out of 7
  streak: number;
  floorsTotal: number;
  actsTotal: number;
  mountainMovedDays: number;
  avgPressure: number | null;
  avgSleep: number | null;
  avgReadiness: number | null;
  avgHrv: number | null;
  focusPct: number | null;
  topPattern: { label: string; value: number; insight: string } | null;
  topSource: PressureSource | null;
  bestWin: string | null;
  highlights: string[];
  nextMove: string;
}

function avg(nums: (number | null)[]): number | null {
  const vals = nums.filter((n): n is number => typeof n === "number");
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

function fmt(key: string): string {
  return new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dayTracked(p: DailyPoint): boolean {
  return (
    p.pressure != null ||
    p.floors > 0 ||
    p.acts > 0 ||
    p.sleep != null ||
    p.focusPct != null ||
    p.readiness != null ||
    p.hrv != null
  );
}

export function buildWeeklyReview(
  state: Pick<JeremyState, "days" | "elevatorLogs" | "theaterLogs" | "pulseLogs">,
  now = new Date()
): WeeklyReview | null {
  const series = buildSeries(state.days, state.elevatorLogs, state.theaterLogs, state.pulseLogs, 7, now);
  const daysTracked = series.filter(dayTracked).length;
  if (daysTracked === 0) return null;

  const daysWithFloors = series.filter((p) => p.floors > 0).length;
  const elevatorFreeDays = 7 - daysWithFloors;
  const floorsTotal = series.reduce((s, p) => s + p.floors, 0);
  const actsTotal = series.reduce((s, p) => s + p.acts, 0);
  const mountainMovedDays = series.filter((p) => p.movedMountain === 1).length;
  const avgPressure = avg(series.map((p) => p.pressure));
  const avgSleep = avg(series.map((p) => p.sleep));
  const avgReadiness = avg(series.map((p) => p.readiness));
  const avgHrv = avg(series.map((p) => p.hrv));

  const sumMountain = series.reduce((s, p) => s + p.pulseMountain, 0);
  const sumNoise = series.reduce((s, p) => s + p.pulseNoise, 0);
  const focusPct = sumMountain + sumNoise > 0 ? Math.round((sumMountain / (sumMountain + sumNoise)) * 100) : null;

  // Strongest pattern within the week.
  const ranked = correlations(series).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const top = ranked.find((c) => Math.abs(c.value) >= 0.4) ?? null;
  const topPattern = top ? { label: top.label, value: top.value, insight: top.insight } : null;

  // Most common pressure source + most recent win, from the week's day entries.
  const weekKeys = series.map((p) => p.date);
  const sourceCount: Partial<Record<PressureSource, number>> = {};
  let bestWin: string | null = null;
  for (const key of weekKeys) {
    const day = state.days[key];
    if (!day) continue;
    for (const s of day.pressureSources ?? []) sourceCount[s] = (sourceCount[s] ?? 0) + 1;
    const win = day.reflection?.win?.trim() || day.morning?.win?.trim();
    if (win) bestWin = win; // weekKeys are chronological, so this lands on the latest
  }
  const topSource =
    (Object.entries(sourceCount).sort((a, b) => b[1] - a[1])[0]?.[0] as PressureSource | undefined) ?? null;

  const streak = calcElevatorFreeStreak(state.elevatorLogs, now);

  // --- Highlights (calm, factual) ---
  const highlights: string[] = [];
  highlights.push(`${elevatorFreeDays} of 7 days Elevator-free.`);
  if (mountainMovedDays > 0) highlights.push(`You moved the mountain ${mountainMovedDays} ${mountainMovedDays === 1 ? "day" : "days"}.`);
  if (avgPressure != null) highlights.push(`Average pressure sat around ${avgPressure}/10.`);
  if (avgSleep != null) highlights.push(`Average sleep was ${avgSleep}h.`);
  if (avgReadiness != null) highlights.push(`Readiness averaged ${avgReadiness}/100.`);
  if (avgHrv != null) highlights.push(`HRV averaged ${avgHrv}ms.`);
  if (focusPct != null) highlights.push(`${focusPct}% of your Pulses landed on the Mountain.`);
  if (topSource) highlights.push(`Most of the pressure traced back to: ${topSource}.`);
  if (topPattern) highlights.push(topPattern.insight);

  // --- One move for next week ---
  let nextMove = "Pick one mountain and move it a little every day.";
  if (topPattern?.label === "Sleep vs Pressure" && topPattern.value < 0) {
    nextMove = "Protect sleep first — it's quietly setting your pressure for the whole week.";
  } else if (topPattern?.label === "Pressure vs Elevator" && topPattern.value > 0) {
    nextMove = "When pressure climbs next week, run one Pulse before the Elevator.";
  } else if (avgReadiness != null && avgReadiness < 70) {
    nextMove = "Readiness is running low — bias toward recovery before pushing hard.";
  } else if (focusPct != null && focusPct < 50) {
    nextMove = "Open each morning with one Mountain block before the noise arrives.";
  } else if (mountainMovedDays >= 4) {
    nextMove = "Keep the momentum — same one-mountain discipline that's working.";
  } else if (avgPressure != null && avgPressure >= 7) {
    nextMove = "Name the biggest source of pressure and aim one small move at it.";
  }

  return {
    rangeLabel: `${fmt(weekKeys[0])} – ${fmt(weekKeys[6])}`,
    daysTracked,
    elevatorFreeDays,
    streak,
    floorsTotal,
    actsTotal,
    mountainMovedDays,
    avgPressure,
    avgSleep,
    avgReadiness,
    avgHrv,
    focusPct,
    topPattern,
    topSource,
    bestWin,
    highlights,
    nextMove,
  };
}

// Compact context handed to the AI when writing the narrative reflection.
export function reviewContext(r: WeeklyReview): string {
  return [
    `Week ${r.rangeLabel}`,
    `Elevator-free days: ${r.elevatorFreeDays}/7 (streak ${r.streak})`,
    `Floors total: ${r.floorsTotal}, Acts total: ${r.actsTotal}`,
    `Mountain moved: ${r.mountainMovedDays} days`,
    `Avg pressure: ${r.avgPressure ?? "—"}, Avg sleep: ${r.avgSleep ?? "—"}h, Focus: ${r.focusPct ?? "—"}%`,
    r.avgReadiness != null || r.avgHrv != null
      ? `Recovery — readiness: ${r.avgReadiness ?? "—"}/100, HRV: ${r.avgHrv ?? "—"}ms`
      : "",
    r.topSource ? `Main pressure source: ${r.topSource}` : "",
    r.topPattern ? `Pattern: ${r.topPattern.insight}` : "",
    r.bestWin ? `A win named this week: ${r.bestWin}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
