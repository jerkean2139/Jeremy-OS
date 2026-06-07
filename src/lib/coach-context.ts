// Assembles the full picture handed to the AI coach so it can coach on
// systems and identity — not just willpower. Pure function over store slices.

import type {
  DayEntry,
  ElevatorLog,
  TheaterLog,
  PulseEntry,
  IdentityStatement,
  Habit,
  ScorecardItem,
  ScriptureProgress,
} from "./types";
import { buildSeries, correlations, calcElevatorFreeStreak } from "./analytics";
import {
  activeHabits,
  habitStreak,
  habitDoneToday,
  habitRecipe,
  voteTotals,
  type VoteSources,
} from "./habits";
import { clampDay, readingLabel } from "./bible";

export interface CoachContextInput {
  days: Record<string, DayEntry>;
  elevatorLogs: ElevatorLog[];
  theaterLogs: TheaterLog[];
  pulseLogs: PulseEntry[];
  identity: IdentityStatement;
  habits: Habit[];
  scorecard: ScorecardItem[];
  scripture: ScriptureProgress;
}

export function buildCoachContext(input: CoachContextInput): string {
  const { days, elevatorLogs, theaterLogs, pulseLogs, identity, habits, scorecard, scripture } =
    input;

  const series = buildSeries(days, elevatorLogs, theaterLogs, pulseLogs, 14);
  const cors = correlations(series);
  const streak = calcElevatorFreeStreak(elevatorLogs);

  const recent = series
    .slice(-7)
    .map(
      (p) =>
        `${p.date}: pressure ${p.pressure ?? "—"}, floors ${p.floors}, acts ${p.acts}, sleep ${
          p.sleep ?? "—"
        }, focus ${p.focusPct ?? "—"}%`
    )
    .join("\n");
  const pat = cors.map((c) => `${c.label}: r=${c.value}`).join("; ");

  const sections: string[] = [];

  // Identity
  const idLines = (identity?.lines ?? []).filter(Boolean);
  if (idLines.length) {
    sections.push(`WHO HE'S BECOMING:\n${idLines.map((l) => `- ${l}`).join("\n")}`);
  }

  // Votes
  const voteSrc: VoteSources = {
    days,
    elevatorLogs,
    pulseLogs,
    habits: habits ?? [],
    scriptureReadDates: (scripture?.readLog ?? []).map((r) => r.date),
  };
  const votes = voteTotals(voteSrc);
  sections.push(
    `IDENTITY VOTES (every good action is a vote): ${votes.today} today, ${votes.week} this week, ${votes.total} all-time.`
  );

  // Habits
  const active = activeHabits(habits ?? []);
  if (active.length) {
    const lines: string[] = [];
    const building = active.filter((h) => h.kind === "build");
    const breaking = active.filter((h) => h.kind === "break");
    if (building.length) {
      lines.push("Building:");
      for (const h of building) {
        const recipe = habitRecipe(h);
        lines.push(
          `  - ${h.name} — ${habitStreak(h)} day(s) strong, ${
            habitDoneToday(h) ? "done today" : "not yet today"
          }${h.identity ? ` [vote: ${h.identity}]` : ""}${recipe ? ` [recipe: ${recipe}]` : ""}${
            h.accountablePartner ? ` [accountable to: ${h.accountablePartner}]` : ""
          }${h.stakes ? ` [stakes: ${h.stakes}]` : ""}`
        );
      }
    }
    if (breaking.length) {
      lines.push("Breaking:");
      for (const h of breaking) lines.push(`  - ${h.name} — ${habitStreak(h)} day(s) clean`);
    }
    sections.push(`HABITS (designed with the 4 Laws; never miss twice):\n${lines.join("\n")}`);
  }

  // Scorecard
  const sc = scorecard ?? [];
  if (sc.length) {
    const good = sc.filter((i) => i.mark === "good").length;
    const neutral = sc.filter((i) => i.mark === "neutral").length;
    const bad = sc.filter((i) => i.mark === "bad").length;
    const hurts = sc.filter((i) => i.mark === "bad").map((i) => i.text);
    sections.push(
      `HABIT SCORECARD (his own awareness): ${good} help (+), ${neutral} neutral (=), ${bad} hurt (−).${
        hurts.length ? ` Marked as hurting: ${hurts.join(", ")}.` : ""
      }`
    );
  }

  // Daily Word
  if (scripture) {
    const day = clampDay(scripture.currentDay ?? 1);
    const readCount = scripture.readLog?.length ?? 0;
    sections.push(
      `DAILY WORD: on day ${day}/365 (${readingLabel(day)}); ${readCount} readings done so far.`
    );
  }

  sections.push(
    `Elevator-free streak: ${streak} days.\nLast 7 days:\n${recent}\nCorrelations: ${
      pat || "not enough data yet"
    }`
  );

  return sections.join("\n\n");
}
