"use client";

import { useEffect, useState } from "react";
import { BookOpen, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { readingForDay } from "@/lib/bible";
import type { ScriptureResponse, ChapterText } from "@/app/api/scripture/route";
import { cn } from "@/lib/utils";

// Fetches and renders one plan-day's reading: the AI "what it means"
// reflection on top, then the OT + NT passages with verse numbers. Shared by
// the /scripture page and the Morning Ritual reading step.
export function ScriptureReader({ day }: { day: number }) {
  const [data, setData] = useState<ScriptureResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setData(null);
    fetch(`/api/scripture?day=${day}`)
      .then((r) => r.json())
      .then((d: ScriptureResponse) => {
        if (alive) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [day]);

  // Reference labels are pure + instant, shown before the text arrives.
  const labels = readingForDay(day);

  return (
    <div>
      {/* What it means — the orienting frame. */}
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
