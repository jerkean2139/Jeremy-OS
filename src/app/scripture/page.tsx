"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store";
import { clampDay, PLAN_DAYS, readingForDay } from "@/lib/bible";
import type { ScriptureResponse, ChapterText } from "@/app/api/scripture/route";
import { todayKey, cn } from "@/lib/utils";

export default function ScripturePage() {
  return (
    <HydrationGate>
      <Scripture />
    </HydrationGate>
  );
}

function Scripture() {
  const scripture = useStore((s) => s.scripture);
  const markRead = useStore((s) => s.markScriptureRead);

  const currentDay = clampDay(scripture?.currentDay ?? 1);
  const [viewDay, setViewDay] = useState(currentDay);
  const [data, setData] = useState<ScriptureResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const readToday = scripture?.lastReadDate === todayKey();
  const completed = scripture?.readLog.length ?? 0;
  const onCurrent = viewDay === currentDay;

  const load = useCallback(async (day: number) => {
    setLoading(true);
    setData(null);
    try {
      const res = await fetch(`/api/scripture?day=${day}`);
      setData((await res.json()) as ScriptureResponse);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(viewDay);
  }, [viewDay, load]);

  // The reference labels are pure + instant, so we can show them before the
  // text arrives.
  const labels = readingForDay(viewDay);

  const complete = () => {
    markRead();
    setViewDay(clampDay(currentDay + 1));
  };

  const pct = Math.round((completed / PLAN_DAYS) * 100);

  return (
    <div>
      <PageHeader title="Daily Word" subtitle="Reading the whole Bible in a year" back="/" />

      {/* Progress */}
      <Card className="mb-5">
        <CardContent className="pt-5">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
                Day {viewDay} of {PLAN_DAYS}
                {!onCurrent && <span className="ml-1 text-mist-600">· revisiting</span>}
              </div>
              <div className="mt-1 text-2xl font-semibold text-mist-50">
                {completed} {completed === 1 ? "reading" : "readings"} complete
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewDay((d) => clampDay(d - 1))}
                disabled={viewDay <= 1}
                className="rounded-full p-1.5 text-mist-400 hover:bg-ink-800 hover:text-mist-100 disabled:opacity-30"
                aria-label="Previous day"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewDay((d) => clampDay(d + 1))}
                disabled={viewDay >= PLAN_DAYS}
                className="rounded-full p-1.5 text-mist-400 hover:bg-ink-800 hover:text-mist-100 disabled:opacity-30"
                aria-label="Next day"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-sage-500/80 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* What it means — surfaced first, as the orienting frame. */}
      <Card className="mb-5 border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-transparent">
        <CardContent className="pt-5">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-sky-300">
            <Sparkles className="h-3.5 w-3.5" /> What it means
          </div>
          {loading ? (
            <div className="flex items-center gap-2 py-2 text-sm text-mist-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading it for you…
            </div>
          ) : (
            <p className="whitespace-pre-line text-sm leading-relaxed text-mist-200">
              {data?.summary ||
                `Today you're reading ${[labels.ot.label, labels.nt.label]
                  .filter(Boolean)
                  .join(" and ")}. Read it slowly — let one line stay with you.`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Passages */}
      <Passage
        heading="Old Testament"
        label={labels.ot.label}
        chapters={data?.ot.chapters}
        loading={loading}
      />
      <Passage
        heading="New Testament"
        label={labels.nt.label}
        chapters={data?.nt.chapters}
        loading={loading}
      />

      {/* Action */}
      <div className="mt-6">
        {onCurrent ? (
          readToday ? (
            <div className="rounded-2xl border border-sage-500/30 bg-sage-500/10 p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-sage-300">
                <Check className="h-4 w-4" /> Today&apos;s reading is done
              </div>
              <button
                onClick={() => setViewDay(clampDay(currentDay))}
                className="mt-1 text-xs text-mist-500 hover:text-mist-300"
              >
                Read ahead →
              </button>
            </div>
          ) : (
            <Button size="lg" className="w-full" onClick={complete}>
              <Check className="h-5 w-5" /> Mark as read
            </Button>
          )
        ) : (
          <Button
            variant="soft"
            size="lg"
            className="w-full"
            onClick={() => setViewDay(currentDay)}
          >
            Back to today&apos;s reading (Day {currentDay})
          </Button>
        )}
      </div>
    </div>
  );
}

function Passage({
  heading,
  label,
  chapters,
  loading,
}: {
  heading: string;
  label: string;
  chapters?: ChapterText[];
  loading: boolean;
}) {
  if (!label) return null;
  return (
    <Card className="mb-4">
      <CardContent className="pt-5">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-sage-400" />
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
              {heading}
            </div>
            <div className="text-sm font-semibold text-mist-100">{label}</div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse-soft rounded bg-ink-800/60" />
            <div className="h-3 w-11/12 animate-pulse-soft rounded bg-ink-800/50" />
            <div className="h-3 w-10/12 animate-pulse-soft rounded bg-ink-800/40" />
          </div>
        ) : (
          <div className="space-y-4">
            {chapters?.map((c) => (
              <div key={c.ref}>
                <div className="mb-1 text-xs font-medium text-mist-400">{c.ref}</div>
                {c.error || !c.verses.length ? (
                  <p className="text-sm text-mist-500">
                    Couldn&apos;t load this passage right now. Try again in a moment.
                  </p>
                ) : (
                  <p className="text-[15px] leading-7 text-mist-200">
                    {c.verses.map((v) => (
                      <span key={v.verse}>
                        <sup className="mr-0.5 text-[10px] text-mist-500">{v.verse}</sup>
                        <span className={cn(v.verse !== 1 && "ml-0.5")}>{v.text} </span>
                      </span>
                    ))}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
