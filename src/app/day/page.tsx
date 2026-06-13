"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, RefreshCw, MapPin, Users, AlertTriangle, Link2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { VoiceChat } from "@/components/VoiceChat";
import { DayDebrief } from "@/components/DayDebrief";
import { DayPlanner } from "@/components/DayPlanner";
import { ScheduleBlock } from "@/components/ScheduleBlock";
import { useStore } from "@/lib/store";
import {
  fmtRange,
  overloadRead,
  agendaText,
  debriefText,
  ratingKey,
  type CalEvent,
} from "@/lib/calendar";
import type { CalendarResponse } from "@/app/api/calendar/route";
import { todayKey } from "@/lib/utils";
import { cn } from "@/lib/utils";

function yesterdayKey(): string {
  const d = new Date(Date.now() - 86400000);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function DayPage() {
  return (
    <HydrationGate>
      <Day />
    </HydrationGate>
  );
}

function Day() {
  const icsUrl = useStore((s) => s.calendarIcsUrl);
  const setIcsUrl = useStore((s) => s.setCalendarIcsUrl);
  const day = useStore((s) => s.getDay());
  const memory = useStore((s) => s.coachMemory);
  const eventRatings = useStore((s) => s.eventRatings);

  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icsUrl: icsUrl || undefined }),
      });
      setData((await res.json()) as CalendarResponse);
    } catch {
      setData({ configured: !!icsUrl, ok: false, error: "offline", days: [], fetchedAt: "" });
    } finally {
      setLoading(false);
    }
  }, [icsUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  const events = useMemo(
    () => data?.days.find((d) => d.date === todayKey())?.events ?? [],
    [data]
  );
  const yesterday = useMemo(
    () => data?.days.find((d) => d.date === yesterdayKey())?.events ?? [],
    [data]
  );
  const overload = useMemo(() => overloadRead(events), [events]);

  const context = useMemo(() => {
    const mountain = day.morning?.mountain?.trim() || day.mountain?.trim();
    const ratingMap = new Map((eventRatings ?? []).map((r) => [r.key, r.feeling]));
    const scoreFor = (e: CalEvent) => ratingMap.get(ratingKey(yesterdayKey(), e.uid));
    const parts = [
      "Today's calendar:",
      agendaText(events),
      mountain ? `\nToday's mountain: ${mountain}.` : "",
      day.pressureLevel ? `Pressure: ${day.pressureLevel}/10.` : "",
      `\nMeeting load: ${overload.meetingCount} meetings, ~${overload.meetingMinutes} min${
        overload.overloaded ? " (heavy day)" : ""
      }.`,
      yesterday.length ? `\nYesterday's events (ask how they went):\n${debriefText(yesterday, scoreFor)}` : "",
    ];
    return parts.filter(Boolean).join("\n");
  }, [events, yesterday, day, overload, eventRatings]);

  return (
    <div>
      <PageHeader title="Today" subtitle="Your day, in focus" back="/" />

      {!data?.configured ? (
        <Connect onSave={setIcsUrl} />
      ) : !data.ok ? (
        <Card>
          <CardContent className="space-y-3 pt-5">
            <p className="text-sm text-mist-400">
              Couldn&apos;t load your calendar{data.error ? ` (${data.error})` : ""}. Check the
              secret address is correct and still valid.
            </p>
            <Button variant="soft" className="w-full" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" /> Try again
            </Button>
            <button
              onClick={() => setIcsUrl("")}
              className="block w-full text-center text-xs text-mist-500 hover:text-mist-300"
            >
              Change calendar link
            </button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Yesterday's debrief — rate how each event landed */}
          <DayDebrief date={yesterdayKey()} events={yesterday} />

          <div className="mb-4 flex items-center justify-between">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
              {events.length} event{events.length === 1 ? "" : "s"} today
            </div>
            <button
              onClick={() => void load()}
              disabled={loading}
              className="rounded-full p-1.5 text-mist-500 hover:bg-ink-800 hover:text-mist-200 disabled:opacity-50"
              aria-label="Refresh calendar"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </button>
          </div>

          {overload.overloaded && (
            <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-ember-500/25 bg-ember-500/5 p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-ember-400" />
              <p className="text-sm leading-relaxed text-mist-200">
                Heavy day — {overload.meetingCount} meetings (~{Math.round(overload.meetingMinutes / 60 * 10) / 10}h)
                {overload.backToBack > 0 ? `, ${overload.backToBack} back-to-back` : ""}. Protect a little
                margin where you can.
              </p>
            </div>
          )}

          {events.length === 0 ? (
            <Card className="mb-5">
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <CalendarDays className="h-7 w-7 text-sage-400" />
                <div className="text-mist-200">Nothing on the calendar today.</div>
                <p className="text-sm text-mist-500">Open space — point it at the mountain.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="mb-5 space-y-2">
              {events.map((e) => (
                <EventRow key={e.uid} e={e} />
              ))}
            </div>
          )}

          {/* Plan tasks into today's fixed calendar blocks */}
          <DayPlanner date={todayKey()} events={events} />

          {/* Drop a focused time block onto Google Calendar */}
          <div className="mb-5">
            <ScheduleBlock />
          </div>

          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
            Talk through the day
          </div>
          <VoiceChat
            context={context}
            memory={memory}
            opener={
              yesterday.length
                ? "Morning. Before we plan today — how did yesterday actually go? Walk me through how the meetings and tasks landed, then we'll look at today against your mountain."
                : "Let's look at your day. Walk me through what's on the calendar and what matters most — I'll help you compare it to your mountain and the noise."
            }
          />
        </>
      )}
    </div>
  );
}

function EventRow({ e }: { e: CalEvent }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-3">
        <div className="w-16 shrink-0 pt-0.5 text-xs font-medium tabular-nums text-mist-400">
          {e.allDay ? "All day" : fmtRange(e).split("–")[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-mist-100">{e.summary}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-mist-500">
            {!e.allDay && <span>{fmtRange(e)}</span>}
            {e.isMeeting && (
              <span className="flex items-center gap-1 text-sky-300/90">
                <Users className="h-3 w-3" /> meeting
              </span>
            )}
            {e.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {e.location}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Connect({ onSave }: { onSave: (url: string) => void }) {
  const [url, setUrl] = useState("");
  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-center gap-2 text-sm font-medium text-mist-100">
          <CalendarDays className="h-4 w-4 text-sky-400" /> Connect your calendar
        </div>
        <p className="text-xs leading-relaxed text-mist-500">
          In Google Calendar: <span className="text-mist-300">Settings → your calendar →
          Integrate calendar → Secret address in iCal format</span>. Copy that link and paste it
          here. It&apos;s read-only and stays on your device.
        </p>
        <div className="flex items-center gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://calendar.google.com/…/basic.ics"
            className="min-w-0 flex-1 rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5 text-sm text-mist-100 placeholder:text-mist-600 outline-none focus:border-ink-600"
          />
          <button
            onClick={() => url.trim() && onSave(url)}
            disabled={!url.trim()}
            className="shrink-0 rounded-xl bg-sky-500/20 p-2.5 text-sky-300 hover:bg-sky-500/30 disabled:opacity-40"
            aria-label="Connect"
          >
            <Link2 className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[11px] text-mist-600">
          Tip: you can also set <code>CALENDAR_ICS_URL</code> on the server to connect it for good.
        </p>
      </CardContent>
    </Card>
  );
}
