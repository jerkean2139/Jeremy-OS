// A small, dependency-free iCalendar (RFC 5545) parser — enough for a personal
// Google Calendar secret-address (.ics) feed: timed + all-day events, and basic
// recurrence (DAILY/WEEKLY with INTERVAL/BYDAY/COUNT/UNTIL, plus EXDATE).
// Complex monthly/yearly rules fall back to their first instance. Times are
// treated as wall-clock (TZID offsets ignored) which is fine for a single user.

export interface IcalEvent {
  uid: string;
  summary: string;
  start: Date;
  end?: Date;
  allDay: boolean;
  location?: string;
  description?: string;
  attendees: number; // ATTENDEE count (0 = solo block)
  recurring: boolean;
}

interface RawEvent {
  props: Map<string, { value: string; params: Record<string, string> }>;
  exdates: Date[];
  attendees: number;
}

// Unfold continued lines (a leading space/tab continues the previous line).
function unfold(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");
}

function parseLine(line: string): { name: string; params: Record<string, string>; value: string } | null {
  const colon = line.indexOf(":");
  if (colon === -1) return null;
  const left = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [name, ...paramParts] = left.split(";");
  const params: Record<string, string> = {};
  for (const p of paramParts) {
    const eq = p.indexOf("=");
    if (eq !== -1) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
  }
  return { name: name.toUpperCase(), params, value };
}

// "YYYYMMDD" or "YYYYMMDDTHHMMSS[Z]" → Date. all-day when date-only.
function parseDate(value: string, params: Record<string, string>): { date: Date; allDay: boolean } {
  const v = value.trim();
  const dateOnly = params.VALUE === "DATE" || /^\d{8}$/.test(v);
  if (dateOnly) {
    const y = +v.slice(0, 4);
    const mo = +v.slice(4, 6) - 1;
    const d = +v.slice(6, 8);
    return { date: new Date(y, mo, d), allDay: true };
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!m) return { date: new Date(v), allDay: false };
  const [, y, mo, d, h, mi, s, z] = m;
  if (z) {
    return { date: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)), allDay: false };
  }
  return { date: new Date(+y, +mo - 1, +d, +h, +mi, +s), allDay: false };
}

function unescape(v: string): string {
  return v.replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
}

const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

interface Rrule {
  freq: string;
  interval: number;
  byday: number[]; // 0=Sun..6=Sat
  count?: number;
  until?: Date;
}

function parseRrule(value: string): Rrule {
  const parts = Object.fromEntries(
    value.split(";").map((p) => {
      const [k, v] = p.split("=");
      return [k.toUpperCase(), v];
    })
  );
  const byday = (parts.BYDAY ? parts.BYDAY.split(",") : [])
    .map((d) => DAY_CODES.indexOf(d.replace(/^[+-]?\d+/, "").trim()))
    .filter((i) => i >= 0);
  return {
    freq: parts.FREQ,
    interval: parts.INTERVAL ? Math.max(1, +parts.INTERVAL) : 1,
    byday,
    count: parts.COUNT ? +parts.COUNT : undefined,
    until: parts.UNTIL ? parseDate(parts.UNTIL, {}).date : undefined,
  };
}

const DAY_MS = 86400000;

// Expand a recurring event's start times that fall within [from, to].
function expandStarts(start: Date, rule: Rrule, from: Date, to: Date): Date[] {
  const out: Date[] = [];
  const cap = 750;
  const hh = start.getHours();
  const mm = start.getMinutes();
  const atTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm);

  const within = (d: Date) => d >= from && d <= to;
  const stop = (d: Date, n: number) =>
    d > to || (rule.until && d > rule.until) || (rule.count != null && n >= rule.count);

  if (rule.freq === "DAILY") {
    let cursor = new Date(start);
    let n = 0;
    for (let i = 0; i < cap && !stop(cursor, n); i++) {
      if (within(cursor)) out.push(new Date(cursor));
      n++;
      cursor = new Date(cursor.getTime() + rule.interval * DAY_MS);
    }
    return out;
  }

  if (rule.freq === "WEEKLY") {
    const days = rule.byday.length ? rule.byday : [start.getDay()];
    // Start of the event's week (Sunday).
    let weekStart = new Date(start);
    weekStart.setDate(start.getDate() - start.getDay());
    let n = 0;
    for (let w = 0; w < cap; w++) {
      const weekBegin = new Date(weekStart.getTime() + w * rule.interval * 7 * DAY_MS);
      if (weekBegin > to) break;
      for (const dow of days.sort((a, b) => a - b)) {
        const occ = atTime(new Date(weekBegin.getFullYear(), weekBegin.getMonth(), weekBegin.getDate() + dow));
        if (occ < start) continue;
        if (rule.until && occ > rule.until) return out;
        if (rule.count != null && n >= rule.count) return out;
        n++;
        if (within(occ)) out.push(occ);
      }
    }
    return out;
  }

  // Unsupported frequency — just the base instance if it's in range.
  if (within(start)) out.push(start);
  return out;
}

export function parseIcal(text: string, from: Date, to: Date): IcalEvent[] {
  const lines = unfold(text);
  const events: IcalEvent[] = [];
  let cur: RawEvent | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = { props: new Map(), exdates: [], attendees: 0 };
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur) events.push(...materialize(cur, from, to));
      cur = null;
      continue;
    }
    if (!cur) continue;
    const parsed = parseLine(line);
    if (!parsed) continue;
    if (parsed.name === "EXDATE") {
      cur.exdates.push(parseDate(parsed.value, parsed.params).date);
    } else if (parsed.name === "ATTENDEE") {
      cur.attendees++;
    } else {
      cur.props.set(parsed.name, { value: parsed.value, params: parsed.params });
    }
  }

  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function materialize(raw: RawEvent, from: Date, to: Date): IcalEvent[] {
  const dtstart = raw.props.get("DTSTART");
  if (!dtstart) return [];
  const { date: start, allDay } = parseDate(dtstart.value, dtstart.params);
  const dtend = raw.props.get("DTEND");
  const end = dtend ? parseDate(dtend.value, dtend.params).date : undefined;
  const durationMs = end ? end.getTime() - start.getTime() : 0;

  const summary = unescape(raw.props.get("SUMMARY")?.value ?? "(no title)");
  const location = raw.props.get("LOCATION")?.value
    ? unescape(raw.props.get("LOCATION")!.value)
    : undefined;
  const description = raw.props.get("DESCRIPTION")?.value
    ? unescape(raw.props.get("DESCRIPTION")!.value)
    : undefined;
  const uid = raw.props.get("UID")?.value ?? `${summary}-${start.getTime()}`;
  // A meeting if it lists attendees (or has an organizer + at least the count).
  const attendees = raw.attendees || (raw.props.has("ORGANIZER") ? 1 : 0);
  const status = raw.props.get("STATUS")?.value;
  if (status === "CANCELLED") return [];

  const rruleRaw = raw.props.get("RRULE");
  const exSet = new Set(raw.exdates.map((d) => d.getTime()));

  const make = (s: Date, recurring: boolean): IcalEvent => ({
    uid: recurring ? `${uid}:${s.getTime()}` : uid,
    summary,
    start: s,
    end: durationMs ? new Date(s.getTime() + durationMs) : end,
    allDay,
    location,
    description,
    attendees,
    recurring,
  });

  if (rruleRaw) {
    const starts = expandStarts(start, parseRrule(rruleRaw.value), from, to);
    return starts.filter((s) => !exSet.has(s.getTime())).map((s) => make(s, true));
  }

  if (start >= from && start <= to && !exSet.has(start.getTime())) {
    return [make(start, false)];
  }
  return [];
}
