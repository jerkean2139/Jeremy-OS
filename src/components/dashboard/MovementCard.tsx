"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Route, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { movementSummary, fmtMiles } from "@/lib/movement";

// A dashboard peek at accrued distance, linking to the full Movement page.
// Hidden until there's some movement logged.
export function MovementCard() {
  const days = useStore((s) => s.days);
  const summary = useMemo(() => movementSummary(days), [days]);

  if (summary.allTime.steps === 0 && summary.allTime.walkMinutes === 0) return null;

  return (
    <Link
      href="/movement"
      className="flex items-center gap-3 rounded-2xl border border-ink-700/60 bg-gradient-to-br from-sage-500/10 to-sky-500/5 p-4 transition-colors hover:border-ink-600"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800/70">
        <Route className="h-5 w-5 text-sage-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-mist-100">Movement</div>
        <div className="text-xs text-mist-500">
          {fmtMiles(summary.allTime.miles)} mi total · {fmtMiles(summary.week.miles)} mi this week
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-mist-500" />
    </Link>
  );
}
