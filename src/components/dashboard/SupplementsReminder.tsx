"use client";

import Link from "next/link";
import { Pill, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { todayKey } from "@/lib/utils";

// An evening nudge on the dashboard to take supplements/meds — only shows after
// ~4pm, when items are defined and some remain untaken. Tap through to the
// nightly routine in the Evening Reflection.
export function SupplementsReminder() {
  const supplements = useStore((s) => s.supplements);
  const taken = useStore((s) => s.getDay().supplementsTaken) ?? [];

  const items = supplements ?? [];
  const remaining = items.filter((i) => !taken.includes(i.id));
  const isEvening = new Date().getHours() >= 16;

  if (items.length === 0 || remaining.length === 0 || !isEvening) return null;

  return (
    <Link
      href="/reflection"
      className="flex items-center gap-3 rounded-2xl border border-ember-500/25 bg-ember-500/5 p-4 transition-colors hover:border-ember-500/40"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800/70">
        <Pill className="h-5 w-5 text-ember-300" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-mist-100">Supplements &amp; meds</div>
        <div className="text-xs text-mist-500">
          {remaining.length} to take · at dinner or after
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-mist-500" />
    </Link>
  );
}
