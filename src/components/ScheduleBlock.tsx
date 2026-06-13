"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, Check, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// Naive local datetime ("YYYY-MM-DDTHH:MM:SS") for today at HH:MM — paired with
// the server's GOOGLE_CALENDAR_TZ so Google places it in the right zone.
function localDateTime(hhmm: string, addMinutes = 0): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m + addMinutes, 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(
    d.getMinutes()
  )}:00`;
}

function nextHalfHour(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() > 30 ? 60 : 30, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const DURATIONS = [15, 30, 45, 60, 90];

// A composer to drop a focused time block onto your Google Calendar. Only shows
// the form when write access is configured; otherwise a calm setup hint.
export function ScheduleBlock({ initialTitle = "" }: { initialTitle?: string }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [time, setTime] = useState(nextHalfHour());
  const [duration, setDuration] = useState(30);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ link?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/calendar/create", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setConfigured(!!d.configured))
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    if (initialTitle) setTitle(initialTitle);
  }, [initialTitle]);

  if (configured === false) {
    return (
      <Card>
        <CardContent className="space-y-1 pt-5">
          <div className="flex items-center gap-2 text-sm font-medium text-mist-100">
            <CalendarPlus className="h-4 w-4 text-sky-300" /> Schedule a block
          </div>
          <p className="text-xs leading-relaxed text-mist-500">
            Connect Google Calendar write access to drop focused time blocks straight onto your
            calendar. Add the Google env vars on the server (see README), then this turns on.
          </p>
        </CardContent>
      </Card>
    );
  }
  if (configured === null) return null;

  const schedule = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/calendar/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: title.trim(),
          start: localDateTime(time),
          end: localDateTime(time, duration),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setDone({ link: data.htmlLink });
        setTitle("");
      } else {
        setError(data.error === "auth_failed" ? "Google rejected the request — check the connection." : "Couldn't create the event.");
      }
    } catch {
      setError("Couldn't reach the calendar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-center gap-2 text-sm font-medium text-mist-100">
          <CalendarPlus className="h-4 w-4 text-sky-300" /> Schedule a block
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What are you blocking time for?"
          className="w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5 text-sm text-mist-100 placeholder:text-mist-600 outline-none focus:border-ink-600"
        />
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5 text-sm text-mist-100 outline-none focus:border-ink-600"
          />
          <div className="flex flex-1 gap-1">
            {DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={cn(
                  "flex-1 rounded-lg border py-2 text-xs tabular-nums transition-colors",
                  duration === d
                    ? "border-sky-500/50 bg-sky-500/10 text-sky-200"
                    : "border-ink-700 text-mist-400 hover:border-ink-600"
                )}
              >
                {d}m
              </button>
            ))}
          </div>
        </div>
        <Button size="md" className="w-full" onClick={schedule} disabled={!title.trim() || busy}>
          {busy ? "Adding…" : <><CalendarPlus className="h-4 w-4" /> Add to calendar</>}
        </Button>
        {done && (
          <p className="flex items-center gap-1.5 text-xs text-sage-300">
            <Check className="h-3.5 w-3.5" /> Added.{" "}
            {done.link && (
              <a href={done.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-sky-300 hover:text-sky-200">
                Open <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </p>
        )}
        {error && (
          <p className="flex items-start gap-1.5 text-xs text-ember-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
