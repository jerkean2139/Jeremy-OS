"use client";

import { useMemo, useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useStore } from "@/lib/store";
import { ratingKey, feelingColor, type CalEvent } from "@/lib/calendar";
import { cn } from "@/lib/utils";

// Yesterday's debrief: rate how each event landed, 1 (drained) to 10
// (energized). Calm awareness, no scorecard guilt. Collapses rated events so
// the focus is on what's left to reflect on.
export function DayDebrief({ date, events }: { date: string; events: CalEvent[] }) {
  const ratings = useStore((s) => s.eventRatings);
  const rateEvent = useStore((s) => s.rateEvent);

  const byKey = useMemo(() => {
    const m = new Map<string, number>();
    (ratings ?? []).forEach((r) => m.set(r.key, r.feeling));
    return m;
  }, [ratings]);

  if (events.length === 0) return null;

  const ratedCount = events.filter((e) => byKey.has(ratingKey(date, e.uid))).length;

  return (
    <Card className="mb-5 border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-transparent">
      <CardContent className="space-y-3 pt-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-sky-300">
            <Sparkles className="h-3.5 w-3.5" /> Yesterday&apos;s debrief
          </div>
          <p className="mt-1 text-xs text-mist-500">
            How did each land? 1 = drained · 10 = energized. {ratedCount}/{events.length} done.
          </p>
        </div>

        {events.map((e) => (
          <DebriefRow
            key={e.uid}
            event={e}
            value={byKey.get(ratingKey(date, e.uid))}
            onRate={(feeling) =>
              rateEvent({
                key: ratingKey(date, e.uid),
                uid: e.uid,
                date,
                summary: e.summary,
                isMeeting: e.isMeeting,
                feeling,
              })
            }
          />
        ))}
      </CardContent>
    </Card>
  );
}

function DebriefRow({
  event,
  value,
  onRate,
}: {
  event: CalEvent;
  value?: number;
  onRate: (n: number) => void;
}) {
  const [open, setOpen] = useState(value == null);

  return (
    <div className="rounded-xl border border-ink-700/60 bg-ink-900/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm text-mist-100">{event.summary}</div>
          {event.isMeeting && <div className="text-[11px] text-sky-300/80">meeting</div>}
        </div>
        {value != null && !open ? (
          <button
            onClick={() => setOpen(true)}
            className={cn("flex items-center gap-1 text-sm font-semibold tabular-nums", feelingColor(value))}
            aria-label="Change rating"
          >
            <Check className="h-3.5 w-3.5" /> {value}/10
          </button>
        ) : null}
      </div>

      {open && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => {
                onRate(n);
                setOpen(false);
              }}
              className={cn(
                "h-8 w-8 rounded-lg border text-sm font-medium tabular-nums transition-colors",
                value === n
                  ? "border-sky-400/60 bg-sky-500/20 text-sky-200"
                  : "border-ink-700 text-mist-400 hover:border-ink-500 hover:text-mist-200"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
