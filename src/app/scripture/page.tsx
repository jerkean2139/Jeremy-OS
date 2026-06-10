"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Bookmark, MessageSquareText, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AiStatusLine } from "@/components/AiStatusLine";
import { HydrationGate } from "@/components/HydrationGate";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScriptureReader } from "@/components/ScriptureReader";
import { ScriptureExplainer } from "@/components/ScriptureExplainer";
import { useStore } from "@/lib/store";
import { clampDay, PLAN_DAYS } from "@/lib/bible";
import { todayKey } from "@/lib/utils";
import type { ScriptureBookmark } from "@/lib/types";

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
  const removeBookmark = useStore((s) => s.removeScriptureBookmark);

  const currentDay = clampDay(scripture?.currentDay ?? 1);
  const [viewDay, setViewDay] = useState(currentDay);
  const [discussing, setDiscussing] = useState<ScriptureBookmark | null>(null);

  const bookmarks = scripture?.bookmarks ?? [];

  const readToday = scripture?.lastReadDate === todayKey();
  const completed = scripture?.readLog.length ?? 0;
  const onCurrent = viewDay === currentDay;

  const complete = () => {
    markRead();
    setViewDay(clampDay(currentDay + 1));
  };

  const pct = Math.round((completed / PLAN_DAYS) * 100);

  return (
    <div>
      <PageHeader title="Daily Word" subtitle="Reading the whole Bible in a year" back="/" />

      {/* Only speaks up if the AI reflection can't run */}
      <AiStatusLine className="mb-4" hideWhenOk />

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

      {/* The reading */}
      <ScriptureReader day={viewDay} />

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

      {/* Bookmarked passages */}
      {bookmarks.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
            <Bookmark className="h-3.5 w-3.5 text-sage-400" /> Bookmarks
          </div>
          <div className="space-y-3">
            {bookmarks.map((b) => (
              <div key={b.id}>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-mist-100">
                          {b.ref}
                          {b.verses.length ? ` · v${b.verses.join(", ")}` : ""}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-mist-500">
                          {b.text}
                        </p>
                      </div>
                      <button
                        onClick={() => removeBookmark(b.id)}
                        className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-mist-600 hover:bg-ink-800 hover:text-ember-400"
                        aria-label="Remove bookmark"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => setDiscussing(discussing?.id === b.id ? null : b)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-sky-500/15 px-3 py-2 text-xs font-medium text-sky-200 hover:bg-sky-500/25"
                    >
                      <MessageSquareText className="h-3.5 w-3.5" />
                      {discussing?.id === b.id ? "Close" : "Break it down"}
                    </button>
                  </CardContent>
                </Card>
                {discussing?.id === b.id && (
                  <div className="mt-3">
                    <ScriptureExplainer
                      passage={{ ref: b.ref, verses: b.verses, text: b.text }}
                      onClose={() => setDiscussing(null)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
