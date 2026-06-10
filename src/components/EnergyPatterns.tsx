"use client";

import { useMemo } from "react";
import { Battery, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useStore } from "@/lib/store";
import { energyPatterns, type EnergyGroup } from "@/lib/energy";
import { feelingColor } from "@/lib/calendar";
import { cn } from "@/lib/utils";

// What reliably energizes vs drains you, from the next-day event ratings.
// Hidden until there's enough signal (a couple of repeated events).
export function EnergyPatterns() {
  const ratings = useStore((s) => s.eventRatings);
  const patterns = useMemo(() => energyPatterns(ratings ?? []), [ratings]);

  if (patterns.energizers.length === 0 && patterns.drainers.length === 0) return null;

  return (
    <Card className="mb-5">
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-mist-100">
            <Battery className="h-4 w-4 text-sage-400" /> Energy patterns
          </div>
          {patterns.overallAvg != null && (
            <span className={cn("text-xs font-medium tabular-nums", feelingColor(patterns.overallAvg))}>
              avg {patterns.overallAvg}/10
            </span>
          )}
        </div>

        {patterns.energizers.length > 0 && (
          <Group
            title="What lifts you"
            icon={<TrendingUp className="h-3 w-3" />}
            tone="text-sage-300"
            groups={patterns.energizers}
          />
        )}
        {patterns.drainers.length > 0 && (
          <Group
            title="What drains you"
            icon={<TrendingDown className="h-3 w-3" />}
            tone="text-ember-300"
            groups={patterns.drainers}
          />
        )}
      </CardContent>
    </Card>
  );
}

function Group({
  title,
  icon,
  tone,
  groups,
}: {
  title: string;
  icon: React.ReactNode;
  tone: string;
  groups: EnergyGroup[];
}) {
  return (
    <div className="space-y-1.5">
      <div className={cn("flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em]", tone)}>
        {icon} {title}
      </div>
      {groups.map((g) => (
        <div key={g.label} className="flex items-center justify-between gap-3 text-sm">
          <span className="min-w-0 truncate text-mist-200">{g.label}</span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-[11px] text-mist-600">×{g.count}</span>
            <span className={cn("font-semibold tabular-nums", feelingColor(g.avg))}>{g.avg}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
