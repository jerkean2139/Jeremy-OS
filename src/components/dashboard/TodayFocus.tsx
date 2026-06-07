"use client";

import Link from "next/link";
import { Compass, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { voteTotals, type VoteSources } from "@/lib/habits";
import { nextMoveToday } from "@/lib/today";

// One glanceable line: votes cast today + the single next move. The whole card
// is a tap-through to that move.
export function TodayFocus() {
  const days = useStore((s) => s.days);
  const elevatorLogs = useStore((s) => s.elevatorLogs);
  const pulseLogs = useStore((s) => s.pulseLogs);
  const habits = useStore((s) => s.habits);
  const scripture = useStore((s) => s.scripture);

  const move = nextMoveToday({ days, habits: habits ?? [], scripture });

  const src: VoteSources = {
    days,
    elevatorLogs,
    pulseLogs,
    habits: habits ?? [],
    scriptureReadDates: (scripture?.readLog ?? []).map((r) => r.date),
  };
  const votes = voteTotals(src).today;

  return (
    <Link
      href={move.href}
      className="flex items-center gap-3 rounded-2xl border border-sage-500/30 bg-gradient-to-br from-sage-500/15 to-sky-500/5 p-4 transition-colors hover:border-sage-500/50"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900/50">
        <Compass className="h-5 w-5 text-sage-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-sage-400">
          Your focus now
          <span className="rounded-full bg-sky-500/15 px-1.5 text-[10px] text-sky-300">
            {votes} vote{votes === 1 ? "" : "s"} today
          </span>
        </div>
        <div className="mt-0.5 truncate text-sm font-medium text-mist-50">{move.label}</div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-mist-500" />
    </Link>
  );
}
