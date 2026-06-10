"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { fmtRange, type CalEvent } from "@/lib/calendar";
import type { CalendarResponse } from "@/app/api/calendar/route";
import { todayKey } from "@/lib/utils";

// A peek at today's calendar on the dashboard, linking into the Day page.
// Hidden entirely until a calendar is connected.
export function DayCard() {
  const icsUrl = useStore((s) => s.calendarIcsUrl);
  const [events, setEvents] = useState<CalEvent[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ icsUrl: icsUrl || undefined, dates: [new Date().toISOString()] }),
    })
      .then((r) => r.json())
      .then((d: CalendarResponse) => {
        if (!alive) return;
        if (d.configured && d.ok) {
          setEvents(d.days.find((x) => x.date === todayKey())?.events ?? []);
        } else {
          setEvents(null); // not configured / error → hide
        }
      })
      .catch(() => alive && setEvents(null));
    return () => {
      alive = false;
    };
  }, [icsUrl]);

  if (events === null) return null;

  const next = events.find((e) => !e.allDay && new Date(e.start) >= new Date());
  const sub =
    events.length === 0
      ? "Open day — point it at the mountain"
      : next
        ? `Next: ${fmtRange(next).split("–")[0]} · ${next.summary}`
        : `${events.length} event${events.length === 1 ? "" : "s"} today`;

  return (
    <Link
      href="/day"
      className="flex items-center gap-3 rounded-2xl border border-ink-700/60 bg-gradient-to-br from-sky-500/10 to-sage-500/5 p-4 transition-colors hover:border-ink-600"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800/70">
        <CalendarDays className="h-5 w-5 text-sky-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-mist-100">Today&apos;s calendar</div>
        <div className="truncate text-xs text-mist-500">{sub}</div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-mist-500" />
    </Link>
  );
}
