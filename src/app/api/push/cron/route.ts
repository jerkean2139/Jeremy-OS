import { NextRequest, NextResponse } from "next/server";
import { isDbConfigured, readState, claimSend } from "@/lib/db";
import { isPushConfigured, sendToAll } from "@/lib/push-server";
import { type ReminderPrefs } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/push/cron?secret=... — reminder sweep. Hit this on a schedule
// (every ~5 min) from an external scheduler (GitHub Actions / Railway cron /
// cron-job.org). It reads the user's reminder prefs and sends any that are due,
// de-duplicated per day/slot via push_sent.
//
// Times are interpreted in REMINDER_TZ (IANA name, e.g. "America/New_York").
// Defaults to UTC if unset.

const WINDOW_MIN = 6; // tolerance so a ~5-min scheduler never misses a slot

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isDbConfigured() || !isPushConfigured()) {
    return NextResponse.json({ ok: false, configured: false });
  }

  const { data } = await readState();
  const reminders = (data?.reminders as ReminderPrefs | undefined) ?? undefined;
  if (!reminders || !reminders.pushEnabled) {
    return NextResponse.json({ ok: true, sent: [], note: "push disabled" });
  }

  const tz = process.env.REMINDER_TZ || "UTC";
  const { hhmm, minutes, dateKey } = nowInZone(tz);
  const sent: string[] = [];

  // Morning + reflection: single daily fire.
  for (const [name, r] of [
    ["morning", reminders.morning],
    ["reflection", reminders.reflection],
  ] as const) {
    if (r?.enabled && isDue(minutes, r.time)) {
      if (await claimSend(name, dateKey)) {
        await sendToAll(payloadFor(name));
        sent.push(name);
      }
    }
  }

  // Pulse: repeating within an active window, aligned to the cadence.
  const pulse = reminders.pulse;
  if (pulse?.enabled && withinWindow(minutes, pulse.startTime, pulse.endTime)) {
    const start = toMinutes(pulse.startTime);
    const since = minutes - start;
    if (since >= 0 && pulse.cadenceMin > 0 && since % pulse.cadenceMin < WINDOW_MIN) {
      const key = `pulse-${hhmm}`;
      if (await claimSend(key, dateKey)) {
        await sendToAll({
          title: "Pulse check",
          body: "What are you doing right now — Mountain or Noise?",
          url: "/pulse",
          tag: "jeremy-os-pulse",
        });
        sent.push(key);
      }
    }
  }

  return NextResponse.json({ ok: true, sent, at: hhmm, tz });
}

function payloadFor(name: "morning" | "reflection") {
  return name === "morning"
    ? {
        title: "Morning ritual",
        body: "6am. Check in, stretch, walk — at the computer by 7.",
        url: "/routine",
        tag: "jeremy-os-morning",
      }
    : {
        title: "Evening reflection",
        body: "Did you move the mountain today?",
        url: "/reflection",
        tag: "jeremy-os-reflection",
      };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function isDue(nowMin: number, target: string): boolean {
  const t = toMinutes(target);
  const diff = nowMin - t;
  return diff >= 0 && diff < WINDOW_MIN;
}

function withinWindow(nowMin: number, start: string, end: string): boolean {
  return nowMin >= toMinutes(start) && nowMin <= toMinutes(end);
}

function nowInZone(tz: string): { hhmm: string; minutes: number; dateKey: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hh = get("hour");
  const mm = get("minute");
  const dateKey = `${get("year")}-${get("month")}-${get("day")}`;
  return { hhmm: `${hh}:${mm}`, minutes: Number(hh) * 60 + Number(mm), dateKey };
}
