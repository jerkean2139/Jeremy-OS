"use client";

import { useState } from "react";
import { Footprints, Sparkles, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useStore } from "@/lib/store";
import { ROUTINE_PARTS, openMakeups } from "@/lib/routine";
import { type RoutinePart } from "@/lib/types";

const ICON: Record<RoutinePart, typeof Footprints> = {
  walk: Footprints,
  stretch: Sparkles,
};

// Shown on Today when a movement part was set aside this morning. Lets you add
// it back to the day — a walk at lunch, a stretch in the afternoon. Calm, no
// guilt: the ritual still counted; this just lets you finish it on your terms.
export function RitualMakeupCard() {
  const day = useStore((s) => s.getDay());
  const logMakeup = useStore((s) => s.logRoutineMakeup);
  const open = openMakeups(day.routine);

  // Per-part draft inputs: minutes (and steps for the walk).
  const [mins, setMins] = useState<Record<string, string>>({});
  const [steps, setSteps] = useState<Record<string, string>>({});

  if (open.length === 0) return null;

  const log = (part: RoutinePart) => {
    const meta = ROUTINE_PARTS.find((p) => p.key === part);
    const m = mins[part]?.trim();
    const min = m ? Number(m) : meta?.defaultMin ?? 0;
    if (!Number.isFinite(min) || min <= 0) return;
    const s = steps[part]?.trim();
    const stepCount = part === "walk" && s ? Number(s) : undefined;
    logMakeup(part, {
      sec: Math.round(min * 60),
      ...(Number.isFinite(stepCount as number) ? { steps: stepCount } : {}),
    });
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div>
          <div className="text-sm font-medium text-mist-100">Add it back to the day</div>
          <p className="mt-0.5 text-xs text-mist-500">
            You set this aside this morning — log it whenever you get it in. Lunch counts.
          </p>
        </div>

        {open.map((part) => {
          const meta = ROUTINE_PARTS.find((p) => p.key === part)!;
          const Icon = ICON[part];
          return (
            <div
              key={part}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-700/60 bg-ink-900/40 p-3"
            >
              <div className="flex items-center gap-2 text-sm text-mist-200">
                <Icon className="h-4 w-4 text-sage-400" />
                {meta.label}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-mist-500">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={mins[part] ?? ""}
                    onChange={(e) => setMins((s) => ({ ...s, [part]: e.target.value }))}
                    placeholder={String(meta.defaultMin)}
                    className="w-14 rounded-lg border border-ink-700 bg-ink-900 px-2 py-1.5 text-right text-sm text-mist-100 outline-none focus:border-ink-600"
                  />
                  min
                </label>
                {part === "walk" && (
                  <input
                    type="number"
                    inputMode="numeric"
                    value={steps[part] ?? ""}
                    onChange={(e) => setSteps((s) => ({ ...s, [part]: e.target.value }))}
                    placeholder="steps"
                    className="w-20 rounded-lg border border-ink-700 bg-ink-900 px-2 py-1.5 text-right text-sm text-mist-100 outline-none focus:border-ink-600"
                  />
                )}
                <button
                  onClick={() => log(part)}
                  className="inline-flex items-center gap-1 rounded-lg bg-sage-500/20 px-3 py-1.5 text-sm font-medium text-sage-200 hover:bg-sage-500/30"
                >
                  <Check className="h-4 w-4" /> {meta.done}
                </button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
