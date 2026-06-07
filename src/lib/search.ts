// Journal search — full-text lookup across every written entry (morning
// check-ins, reflections, pulse notes, habit-log notes, and each day's
// mountain). Pure functions over store state so it stays fast and on-device.

import { type JeremyState } from "./types";
import { startOfDayKey } from "./analytics";

export type JournalSource = "Morning" | "Reflection" | "Pulse" | "Elevator" | "Theater" | "Mountain";

export interface JournalHit {
  id: string;
  date: string; // YYYY-MM-DD
  ts: string; // ISO, for sorting
  source: JournalSource;
  field: string;
  text: string;
  href: string;
}

function add(
  out: JournalHit[],
  date: string,
  ts: string,
  source: JournalSource,
  field: string,
  text: string | undefined,
  href: string
) {
  const t = (text ?? "").trim();
  if (!t) return;
  out.push({ id: `${source}-${date}-${field}-${out.length}`, date, ts, source, field, text: t, href });
}

export function collectEntries(state: Pick<JeremyState, "days" | "elevatorLogs" | "theaterLogs" | "pulseLogs">): JournalHit[] {
  const out: JournalHit[] = [];

  for (const [date, day] of Object.entries(state.days)) {
    const noon = `${date}T12:00:00`;
    add(out, date, noon, "Mountain", "The mountain", day.mountain, `/history/${date}`);

    if (day.morning) {
      const ts = day.morning.completedAt || `${date}T08:00:00`;
      const href = `/morning?date=${date}`;
      add(out, date, ts, "Morning", "What's true", day.morning.whatIsTrue, href);
      add(out, date, ts, "Morning", "Mountain", day.morning.mountain, href);
      add(out, date, ts, "Morning", "Pressure", day.morning.pressure, href);
      add(out, date, ts, "Morning", "Win", day.morning.win, href);
      add(out, date, ts, "Morning", "Summary", day.morning.aiSummary, href);
    }

    if (day.reflection) {
      const ts = day.reflection.completedAt || `${date}T21:00:00`;
      const href = `/reflection?date=${date}`;
      add(out, date, ts, "Reflection", "Win", day.reflection.win, href);
      add(out, date, ts, "Reflection", "Most pressure", day.reflection.mostPressure, href);
      add(out, date, ts, "Reflection", "Learned", day.reflection.learned, href);
    }
  }

  for (const l of state.elevatorLogs) {
    const date = startOfDayKey(l.timestamp);
    add(out, date, l.timestamp, "Elevator", "Note", l.note, `/history/${date}`);
  }
  for (const l of state.theaterLogs) {
    const date = startOfDayKey(l.timestamp);
    add(out, date, l.timestamp, "Theater", "Trigger", l.trigger, `/history/${date}`);
  }
  for (const l of state.pulseLogs) {
    const date = startOfDayKey(l.timestamp);
    add(out, date, l.timestamp, "Pulse", "Activity", l.activity, `/history/${date}`);
  }

  return out;
}

export function searchJournal(
  state: Pick<JeremyState, "days" | "elevatorLogs" | "theaterLogs" | "pulseLogs">,
  query: string
): JournalHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const entries = collectEntries(state);
  return entries
    .filter((e) => {
      const hay = e.text.toLowerCase();
      return terms.every((t) => hay.includes(t));
    })
    .sort((a, b) => b.ts.localeCompare(a.ts));
}

// Build a short snippet centered on the first matched term, for previews.
export function snippet(text: string, query: string, radius = 60): string {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const lower = text.toLowerCase();
  let idx = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i >= 0 && (idx === -1 || i < idx)) idx = i;
  }
  if (idx === -1 || text.length <= radius * 2) return text;
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + radius);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}
