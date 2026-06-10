import { NextRequest, NextResponse } from "next/server";
import { parseIcal } from "@/lib/ical";
import { toCalEvent, dayWindow, type CalEvent } from "@/lib/calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reads a Google Calendar (or any) secret .ics feed and returns events for a
// window. The feed URL comes from the CALENDAR_ICS_URL env var or a per-request
// override (so it can be set in-app without a redeploy). Read-only.
//
// POST { icsUrl?, days?: { iso: string }[] } → { configured, ok, byDay }
// Default window: yesterday + today + tomorrow.

export interface CalendarResponse {
  configured: boolean;
  ok: boolean;
  error?: string;
  days: { date: string; events: CalEvent[] }[];
  fetchedAt: string;
}

export async function POST(req: NextRequest) {
  let body: { icsUrl?: string; dates?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine */
  }

  const url = (body.icsUrl || process.env.CALENDAR_ICS_URL || "").trim();
  const base: CalendarResponse = { configured: !!url, ok: false, days: [], fetchedAt: new Date().toISOString() };

  if (!url) return NextResponse.json(base);
  // Only allow webcal/https iCal URLs.
  const normalized = url.replace(/^webcal:\/\//i, "https://");
  if (!/^https:\/\//i.test(normalized)) {
    return NextResponse.json({ ...base, error: "invalid_url" });
  }

  // The dates to bucket (default: yesterday, today, tomorrow).
  const now = new Date();
  const dates = (body.dates?.length ? body.dates.map((d) => new Date(d)) : [
    new Date(now.getTime() - 86400000),
    now,
    new Date(now.getTime() + 86400000),
  ]).filter((d) => !isNaN(d.getTime()));

  // Overall fetch/parse window spans all requested days.
  const from = dayWindow(dates.reduce((a, b) => (a < b ? a : b))).from;
  const to = dayWindow(dates.reduce((a, b) => (a > b ? a : b))).to;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch(normalized, { cache: "no-store", signal: ctrl.signal }).finally(() =>
      clearTimeout(timer)
    );
    if (!res.ok) return NextResponse.json({ ...base, error: `feed_${res.status}` });
    const text = await res.text();
    const events = parseIcal(text, from, to).map(toCalEvent);

    const days = dates.map((d) => {
      const { from: f, to: t } = dayWindow(d);
      const dayEvents = events.filter((e) => {
        const s = new Date(e.start).getTime();
        return s >= f.getTime() && s <= t.getTime();
      });
      return { date: dayKey(d), events: dayEvents };
    });

    return NextResponse.json({ ...base, ok: true, days });
  } catch (err) {
    console.error("[calendar] fetch failed", err);
    return NextResponse.json({ ...base, error: "fetch_failed" });
  }
}

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
