// Energy patterns from the 1/10 event debriefs: which recurring meetings/tasks
// reliably energize you vs drain you. Pure functions over EventRating[].

import { type EventRating } from "./types";

export interface EnergyGroup {
  label: string; // a readable, normalized event name
  avg: number; // mean feeling 1–10
  count: number;
  isMeeting: boolean;
}

// Normalize an event title so recurring instances group together: drop times,
// dates, parenthetical notes, and trailing numbers; collapse whitespace.
export function normalizeLabel(summary: string): string {
  return summary
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // (notes)
    .replace(/\b\d{1,2}[:.]\d{2}\s*(am|pm)?\b/gi, " ") // times
    .replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, " ") // dates
    .replace(/[#|–-].*$/, " ") // trailing "- detail"
    .replace(/\bw\/\s.*$/i, " ") // "w/ someone"
    .replace(/\s+/g, " ")
    .trim();
}

export interface EnergyPatterns {
  energizers: EnergyGroup[]; // highest average, recurring
  drainers: EnergyGroup[]; // lowest average, recurring
  overallAvg: number | null;
  rated: number;
}

// Group ratings by normalized label; surface recurring ones (count >= minCount)
// split into what lifts you and what drains you.
export function energyPatterns(ratings: EventRating[] = [], minCount = 2): EnergyPatterns {
  if (ratings.length === 0) {
    return { energizers: [], drainers: [], overallAvg: null, rated: 0 };
  }

  const groups = new Map<string, { sum: number; count: number; meeting: number; label: string }>();
  for (const r of ratings) {
    const key = normalizeLabel(r.summary) || r.summary.toLowerCase();
    const g = groups.get(key) ?? { sum: 0, count: 0, meeting: 0, label: titleCase(key) };
    g.sum += r.feeling;
    g.count += 1;
    if (r.isMeeting) g.meeting += 1;
    groups.set(key, g);
  }

  const all: EnergyGroup[] = [...groups.values()]
    .filter((g) => g.count >= minCount)
    .map((g) => ({
      label: g.label,
      avg: Math.round((g.sum / g.count) * 10) / 10,
      count: g.count,
      isMeeting: g.meeting > g.count / 2,
    }));

  const energizers = all.filter((g) => g.avg >= 6.5).sort((a, b) => b.avg - a.avg).slice(0, 6);
  const drainers = all.filter((g) => g.avg <= 4.5).sort((a, b) => a.avg - b.avg).slice(0, 6);

  const overallAvg =
    Math.round((ratings.reduce((a, r) => a + r.feeling, 0) / ratings.length) * 10) / 10;

  return { energizers, drainers, overallAvg, rated: ratings.length };
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
