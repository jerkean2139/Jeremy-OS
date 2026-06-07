"use client";

import { useMemo, useState } from "react";
import { Vote, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useStore } from "@/lib/store";
import { voteTotals, type VoteSources } from "@/lib/habits";

// Identity-based habits, made visible: every good action already logged is a
// vote for the kind of person Jeremy is becoming.
export function IdentityVotesCard() {
  const days = useStore((s) => s.days);
  const elevatorLogs = useStore((s) => s.elevatorLogs);
  const pulseLogs = useStore((s) => s.pulseLogs);
  const habits = useStore((s) => s.habits);
  const scripture = useStore((s) => s.scripture);
  const [open, setOpen] = useState(false);

  const totals = useMemo(() => {
    const src: VoteSources = {
      days,
      elevatorLogs,
      pulseLogs,
      habits: habits ?? [],
      scriptureReadDates: (scripture?.readLog ?? []).map((r) => r.date),
    };
    return voteTotals(src);
  }, [days, elevatorLogs, pulseLogs, habits, scripture]);

  // Aggregate today's votes by label, with counts.
  const grouped = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of totals.todayVotes) m.set(v.label, (m.get(v.label) ?? 0) + 1);
    return [...m.entries()];
  }, [totals.todayVotes]);

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-sky-500/10 to-sage-500/5 p-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-sky-300">
            <Vote className="h-3.5 w-3.5" /> Votes cast today
          </span>
          {grouped.length > 0 && (
            <button
              onClick={() => setOpen((o) => !o)}
              className="rounded-full p-1 text-mist-400 hover:bg-ink-700 hover:text-mist-100"
              aria-label="Show today's votes"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>

        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-4xl font-semibold tabular-nums text-mist-50">{totals.today}</span>
          <span className="text-xs text-mist-400">
            {totals.week} this week · {totals.total} all-time
          </span>
        </div>

        <p className="mt-2 text-xs italic leading-relaxed text-mist-400">
          Every action is a vote for the type of person you wish to become.
        </p>

        {open && grouped.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-ink-700/50 pt-3">
            {grouped.map(([label, count]) => (
              <div key={label} className="flex items-center gap-2 text-sm text-mist-200">
                <span className="h-1.5 w-1.5 rounded-full bg-sage-400" />
                {label}
                {count > 1 && <span className="text-mist-500">×{count}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
