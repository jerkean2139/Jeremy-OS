"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Lightbulb, Sparkles, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { buildSeries, correlations, calcElevatorFreeStreak } from "@/lib/analytics";
import { generateInsight, buildInsightContext, type InsightTone } from "@/lib/insights";
import { askCoach } from "@/lib/ai-client";
import { todayKey, cn } from "@/lib/utils";

const TONE: Record<InsightTone, { ring: string; icon: string; chip: string; label: string }> = {
  lift: { ring: "border-sage-500/40", icon: "text-sage-400", chip: "text-sage-400", label: "Worth honoring" },
  calm: { ring: "border-sky-500/30", icon: "text-sky-400", chip: "text-sky-400", label: "A quiet signal" },
  watch: { ring: "border-ember-500/30", icon: "text-ember-400", chip: "text-ember-400", label: "Worth noticing" },
};

// Proactive insight surfaced on the dashboard, unprompted. The deterministic
// engine always produces it; when an AI key is configured the coach refines the
// wording once per day (cached in localStorage so it stays calm and cheap).
export function InsightCard() {
  const days = useStore((s) => s.days);
  const elevatorLogs = useStore((s) => s.elevatorLogs);
  const theaterLogs = useStore((s) => s.theaterLogs);
  const pulseLogs = useStore((s) => s.pulseLogs);

  const insight = useMemo(() => {
    const series = buildSeries(days, elevatorLogs, theaterLogs, pulseLogs, 14);
    const cors = correlations(series);
    const streak = calcElevatorFreeStreak(elevatorLogs);
    const i = generateInsight(series, cors, streak);
    return i ? { ...i, context: buildInsightContext(series, cors, streak) } : null;
  }, [days, elevatorLogs, theaterLogs, pulseLogs]);

  const [refined, setRefined] = useState<string | null>(null);

  useEffect(() => {
    if (!insight) return;
    const cacheKey = `jeremy-insight-${todayKey()}`;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (cached?.headline === insight.headline && cached.text) {
        setRefined(cached.text);
        return;
      }
    } catch {
      /* ignore */
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await askCoach(
          {
            mode: "insight",
            text: `${insight.headline}. ${insight.body} ${insight.action}`,
            context: insight.context,
          },
          "insight"
        );
        const text = (data?.reply as string)?.trim();
        if (!cancelled && text) {
          setRefined(text);
          localStorage.setItem(cacheKey, JSON.stringify({ headline: insight.headline, text }));
        }
      } catch {
        /* stay with the local wording */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [insight]);

  if (!insight) return null;
  const tone = TONE[insight.tone];

  return (
    <div className={cn("rounded-2xl border bg-ink-850/80 p-5 shadow-lg shadow-black/20", tone.ring)}>
      <div className="mb-2 flex items-center gap-2">
        <Lightbulb className={cn("h-4 w-4", tone.icon)} />
        <span className={cn("text-[11px] font-medium uppercase tracking-[0.16em]", tone.chip)}>
          {tone.label}
        </span>
      </div>
      <h3 className="text-base font-semibold text-mist-50">{insight.headline}</h3>
      {refined ? (
        <p className="mt-1.5 text-sm leading-relaxed text-mist-300">{refined}</p>
      ) : (
        <>
          <p className="mt-1.5 text-sm leading-relaxed text-mist-300">{insight.body}</p>
          <p className="mt-2 flex items-start gap-1.5 text-sm text-mist-200">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mist-400" />
            {insight.action}
          </p>
        </>
      )}
      <Link
        href="/coach"
        className="mt-3 inline-flex items-center gap-1 text-xs text-mist-500 hover:text-mist-300"
      >
        Talk it through <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
