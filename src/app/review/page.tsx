"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Sparkles, Flag, Trophy } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatTile } from "@/components/StatTile";
import { useStore } from "@/lib/store";
import { buildWeeklyReview, reviewContext } from "@/lib/review";
import { askCoach } from "@/lib/ai-client";
import { todayKey, pressureColor } from "@/lib/utils";

export default function ReviewPage() {
  return (
    <HydrationGate>
      <Review />
    </HydrationGate>
  );
}

function Review() {
  const days = useStore((s) => s.days);
  const elevatorLogs = useStore((s) => s.elevatorLogs);
  const theaterLogs = useStore((s) => s.theaterLogs);
  const pulseLogs = useStore((s) => s.pulseLogs);
  const habits = useStore((s) => s.habits);
  const scripture = useStore((s) => s.scripture);

  const review = useMemo(
    () => buildWeeklyReview({ days, elevatorLogs, theaterLogs, pulseLogs, habits, scripture }),
    [days, elevatorLogs, theaterLogs, pulseLogs, habits, scripture]
  );

  const [narrative, setNarrative] = useState<string | null>(null);
  const [reflecting, setReflecting] = useState(false);

  // Week cache key so a generated reflection persists for the week.
  const weekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return todayKey(d);
  }, []);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(`jeremy-review-${weekStart}`);
      if (cached) setNarrative(cached);
    } catch {
      /* ignore */
    }
  }, [weekStart]);

  const reflect = async () => {
    if (!review || reflecting) return;
    setReflecting(true);
    try {
      const data = await askCoach({ mode: "review", text: reviewContext(review) }, "review");
      const text = String(data?.reply ?? "").trim();
      if (text) {
        setNarrative(text);
        localStorage.setItem(`jeremy-review-${weekStart}`, text);
      }
    } catch {
      /* keep the structured view */
    } finally {
      setReflecting(false);
    }
  };

  if (!review) {
    return (
      <div>
        <PageHeader title="Weekly Review" subtitle="A calm look back at the last 7 days." back="/" />
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <CalendarRange className="h-8 w-8 text-mist-500" />
            <p className="text-sm text-mist-400">
              Your week takes shape as you check in. Come back after a few days.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Weekly Review" subtitle={review.rangeLabel} back="/" />

      <div className="space-y-5">
        {/* Narrative / reflection */}
        <Card>
          <CardContent className="pt-5">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-sage-400">
              This week, in focus
            </p>
            {narrative ? (
              <p className="leading-relaxed text-mist-100">{narrative}</p>
            ) : (
              <p className="leading-relaxed text-mist-300">
                {review.daysTracked} {review.daysTracked === 1 ? "day" : "days"} tracked.
                {review.bestWin ? ` A win you named: ${review.bestWin}.` : ""} Tap below for a
                reflection on the week.
              </p>
            )}
            <Button variant="soft" size="md" className="mt-4 w-full" onClick={reflect} disabled={reflecting}>
              <Sparkles className="h-4 w-4" />
              {reflecting ? "Reflecting…" : narrative ? "Reflect again" : "Reflect on my week"}
            </Button>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="Elevator-free"
            value={review.elevatorFreeDays}
            unit="/ 7 days"
            accent="text-sage-400"
          />
          <StatTile
            label="Mountain moved"
            value={review.mountainMovedDays}
            unit={review.mountainMovedDays === 1 ? "day" : "days"}
            accent="text-sage-400"
          />
          <StatTile
            label="Avg pressure"
            value={review.avgPressure ?? "—"}
            unit={review.avgPressure != null ? "/ 10" : undefined}
            accent={review.avgPressure != null ? pressureColor(review.avgPressure) : undefined}
          />
          <StatTile
            label="Focus"
            value={review.focusPct ?? "—"}
            unit={review.focusPct != null ? "%" : undefined}
            hint="Pulses on the Mountain"
          />
          <StatTile
            label="Votes"
            value={review.votesWeek}
            hint="for who you're becoming"
            accent="text-sky-400"
          />
          {review.avgReadiness != null && (
            <StatTile
              label="Readiness"
              value={review.avgReadiness}
              unit="/ 100"
              accent="text-sage-400"
              hint="Oura avg"
            />
          )}
          {review.avgHrv != null && (
            <StatTile label="HRV" value={review.avgHrv} unit="ms" hint="Oura avg" />
          )}
          {review.avgSteps != null && (
            <StatTile label="Steps" value={Math.round(review.avgSteps).toLocaleString()} hint="daily avg" />
          )}
          {review.ritualDays > 0 && (
            <StatTile label="Morning ritual" value={review.ritualDays} unit="/ 7 days" accent="text-sage-400" />
          )}
        </div>

        {/* Highlights */}
        <Card>
          <CardHeader>
            <CardTitle>The week, in lines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {review.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sage-500/70" />
                <p className="text-sm text-mist-300">{h}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Habits this week */}
        {(review.buildHabits.length > 0 || review.breakHabits.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Habits this week</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {review.buildHabits.map((h) => (
                <HabitWeekRow
                  key={`b-${h.name}`}
                  name={h.name}
                  filled={h.done}
                  note={`${h.done}/7 · ${h.streak}d streak`}
                  color="bg-sage-500/80"
                />
              ))}
              {review.breakHabits.map((h) => (
                <HabitWeekRow
                  key={`k-${h.name}`}
                  name={h.name}
                  filled={h.cleanDays}
                  note={`${h.cleanDays}/7 clean · ${h.streak}d`}
                  color="bg-sky-500/70"
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Best win */}
        {review.bestWin && (
          <Card>
            <CardContent className="flex items-start gap-3 pt-5">
              <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-ember-400" />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
                  A win worth keeping
                </p>
                <p className="mt-1 text-mist-100">{review.bestWin}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next move */}
        <div className="rounded-2xl border border-sage-500/30 bg-sage-500/10 p-5">
          <div className="mb-1.5 flex items-center gap-2 text-sage-400">
            <Flag className="h-4 w-4" />
            <span className="text-[11px] font-medium uppercase tracking-[0.16em]">
              One move for next week
            </span>
          </div>
          <p className="text-mist-100">{review.nextMove}</p>
        </div>
      </div>
    </div>
  );
}

function HabitWeekRow({
  name,
  filled,
  note,
  color,
}: {
  name: string;
  filled: number;
  note: string;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm text-mist-200">{name}</span>
        <span className="text-xs text-mist-500">{note}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < filled ? color : "bg-ink-700"}`}
          />
        ))}
      </div>
    </div>
  );
}
