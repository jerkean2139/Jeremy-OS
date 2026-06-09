"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Gauge, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useStore } from "@/lib/store";
import { usageSummary, fmtUsd } from "@/lib/usage";

// A compact estimated-spend meter on the dashboard. Taps through to the full
// breakdown. Hidden until there's something to show.
export function CostMeterCard() {
  const aiUsage = useStore((s) => s.aiUsage);
  const sum = useMemo(() => usageSummary(aiUsage ?? []), [aiUsage]);

  if (sum.count === 0) return null;

  return (
    <Link
      href="/usage"
      className="flex items-center gap-3 rounded-2xl border border-ink-700/60 bg-ink-850/70 p-4 transition-colors hover:border-ink-600 hover:bg-ink-800"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800/70">
        <Gauge className="h-5 w-5 text-sky-400" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-mist-100">AI spend · est.</div>
        <div className="text-xs text-mist-500">
          {fmtUsd(sum.today)} today · {fmtUsd(sum.month)} this month
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-mist-500" />
    </Link>
  );
}
