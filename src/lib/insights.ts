// Proactive insight engine. Pure functions over the analytics series so the app
// can surface a single calm observation — unprompted — on the dashboard.
//
// Philosophy: awareness, never alarm. One signal at a time, paired with one
// small next move. This always works offline; the AI coach can optionally
// refine the wording, but the meaning comes from here.

import { type DailyPoint, type Correlation } from "./analytics";

export type InsightTone = "calm" | "lift" | "watch";

export interface Insight {
  headline: string;
  body: string;
  action: string;
  tone: InsightTone;
}

function avg(nums: (number | null)[]): number | null {
  const vals = nums.filter((n): n is number => typeof n === "number");
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// Tailored wording for the strongest detected correlation.
function fromCorrelation(c: Correlation): Insight | null {
  const r = c.value;
  const strong = Math.abs(r) >= 0.45;
  if (!strong) return null;
  const tone: InsightTone = "watch";
  switch (c.label) {
    case "Pressure vs Elevator":
      return r > 0
        ? {
            headline: "Pressure pulls you toward the Elevator",
            body: "On the days pressure climbs, the Elevator tends to follow. It's a pattern, not a verdict.",
            action: "Next time pressure spikes, run one Pulse before you decide.",
            tone,
          }
        : null;
    case "Pressure vs Theater":
      return r > 0
        ? {
            headline: "Pressure and the Theater move together",
            body: "When the weight rises, the Theater shows up close behind. Naming it loosens its grip.",
            action: "When you feel the pull, name the pressure out loud first.",
            tone,
          }
        : null;
    case "Sleep vs Pressure":
      return r < 0
        ? {
            headline: "Sleep is quietly lowering your pressure",
            body: "More sleep, less pressure the next day — the data is whispering it clearly.",
            action: "Protect tonight's sleep. It's the cheapest move you have.",
            tone: "calm",
          }
        : null;
    case "Focus vs Pressure":
      return r < 0
        ? {
            headline: "Focus is calming the pressure",
            body: "The days you stay on the Mountain are the days pressure eases.",
            action: "Pick one Mountain task for the next hour. Let the rest be noise.",
            tone: "calm",
          }
        : null;
    case "Focus vs Elevator":
      return r < 0
        ? {
            headline: "Staying on the Mountain steadies you",
            body: "More focus, fewer Floors. Momentum is its own medicine.",
            action: "Start a Pulse and aim for one Mountain block today.",
            tone: "calm",
          }
        : null;
    case "Weight vs Elevator":
      return Math.abs(r) >= 0.45
        ? {
            headline: "Weight and the Elevator track together",
            body: "There's a steady link between the two right now — worth watching, not worrying.",
            action: "Notice the connection; let it inform one small choice today.",
            tone,
          }
        : null;
    default:
      return null;
  }
}

/**
 * Pick the single most useful thing to say right now.
 * Priority: a real streak to honor → a strong pattern → a pressure watch →
 * a focus nudge → a quiet default.
 */
export function generateInsight(
  series: DailyPoint[],
  cors: Correlation[],
  streak: number
): Insight | null {
  const hasData = series.some(
    (p) => p.pressure != null || p.floors > 0 || p.acts > 0 || p.sleep != null || p.focusPct != null
  );
  if (!hasData) return null;

  const last3 = series.slice(-3);
  const recentPressure = avg(last3.map((p) => p.pressure));
  const recentFocus = avg(last3.map((p) => p.focusPct));

  // 1. Honor a streak worth noticing.
  if (streak >= 3) {
    return {
      headline: `${streak} days, Elevator-free`,
      body: "That's not luck — that's you, choosing the climb. Quietly remarkable.",
      action: "Notice what's been working, and give it one more day.",
      tone: "lift",
    };
  }

  // 2. Surface the strongest meaningful pattern.
  const ranked = [...cors].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  for (const c of ranked) {
    const insight = fromCorrelation(c);
    if (insight) return insight;
  }

  // 3. Pressure has been running high.
  if (recentPressure != null && recentPressure >= 7) {
    return {
      headline: "Pressure has been running high",
      body: "The last few days have carried real weight. That's information, not failure.",
      action: "Name one source of the pressure, then pick the smallest move against it.",
      tone: "watch",
    };
  }

  // 4. Focus has slipped (or hasn't been measured lately).
  if (recentFocus != null && recentFocus < 40) {
    return {
      headline: "The Noise has been loud lately",
      body: "Less than half your recent Pulses landed on the Mountain.",
      action: "Run one Pulse now and aim it straight at the Mountain.",
      tone: "watch",
    };
  }

  // 5. Quiet, steady default.
  if (recentPressure != null && recentPressure <= 4) {
    return {
      headline: "You're in a steady stretch",
      body: "Pressure's been low and manageable. Good ground to build on.",
      action: "Use the calm — move the Mountain one real step today.",
      tone: "calm",
    };
  }

  return null;
}

// A compact data summary handed to the AI when refining the insight wording.
export function buildInsightContext(
  series: DailyPoint[],
  cors: Correlation[],
  streak: number
): string {
  const recent = series
    .slice(-7)
    .map(
      (p) =>
        `${p.date}: pressure ${p.pressure ?? "—"}, floors ${p.floors}, acts ${p.acts}, sleep ${p.sleep ?? "—"}, focus ${p.focusPct ?? "—"}%`
    )
    .join("\n");
  const pat = cors.map((c) => `${c.label}: r=${c.value}`).join("; ");
  return `Elevator-free streak: ${streak} days.\nLast 7 days:\n${recent}\nCorrelations: ${pat || "not enough data yet"}`;
}
