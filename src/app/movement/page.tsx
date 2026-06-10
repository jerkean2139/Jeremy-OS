"use client";

import { useMemo } from "react";
import { Footprints, Route } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { Card, CardContent } from "@/components/ui/Card";
import { useStore } from "@/lib/store";
import {
  movementSummary,
  recentMovement,
  fmtMiles,
  STEPS_PER_MILE,
  type MovementTotals,
} from "@/lib/movement";

export default function MovementPage() {
  return (
    <HydrationGate>
      <Movement />
    </HydrationGate>
  );
}

function Movement() {
  const days = useStore((s) => s.days);
  const summary = useMemo(() => movementSummary(days), [days]);
  const history = useMemo(() => recentMovement(days), [days]);

  const all = summary.allTime;

  return (
    <div>
      <PageHeader title="Movement" subtitle="Steps & miles, accruing" back="/" />

      {/* All-time hero */}
      <Card className="mb-5">
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 gap-4">
            <Hero
              icon={<Route className="h-5 w-5 text-sage-400" />}
              value={fmtMiles(all.miles)}
              unit="mi"
              label="Total distance"
            />
            <Hero
              icon={<Footprints className="h-5 w-5 text-sky-400" />}
              value={all.steps.toLocaleString()}
              label="Total steps"
            />
          </div>
          <div className="mt-3 text-center text-[11px] text-mist-600">
            {all.activeDays} active day{all.activeDays === 1 ? "" : "s"} ·{" "}
            {Math.round(all.walkMinutes / 60)}h walking
          </div>
        </CardContent>
      </Card>

      {/* Windows */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <Window label="Today" t={summary.today} />
        <Window label="7 days" t={summary.week} />
        <Window label="30 days" t={summary.month} />
      </div>

      {/* History */}
      {history.length > 0 ? (
        <Card>
          <CardContent className="space-y-1 pt-5">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
              Recent days
            </div>
            {history.map((m) => (
              <div key={m.date} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-mist-300">{fmtDay(m.date)}</span>
                <span className="flex items-center gap-3 tabular-nums">
                  <span className="text-mist-200">{m.steps.toLocaleString()} steps</span>
                  <span className="w-12 text-right text-sage-300">{fmtMiles(m.miles)} mi</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Footprints className="h-7 w-7 text-sage-400" />
            <div className="text-mist-200">No movement logged yet.</div>
            <p className="max-w-xs text-sm text-mist-500">
              Finish a walk (or add one at lunch) and log your steps — they accrue here.
            </p>
          </CardContent>
        </Card>
      )}

      <p className="mt-5 px-1 text-xs text-mist-600">
        Miles are estimated from steps (~{STEPS_PER_MILE.toLocaleString()} steps/mile). Log steps
        from Oura or Apple Health at the end of a walk to keep it accurate.
      </p>
    </div>
  );
}

function Hero({
  icon,
  value,
  unit,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  unit?: string;
  label: string;
}) {
  return (
    <div className="text-center">
      <div className="mb-1 flex justify-center">{icon}</div>
      <div className="text-3xl font-semibold tabular-nums text-mist-50">
        {value}
        {unit && <span className="ml-1 text-base font-normal text-mist-400">{unit}</span>}
      </div>
      <div className="mt-0.5 text-[11px] text-mist-500">{label}</div>
    </div>
  );
}

function Window({ label, t }: { label: string; t: MovementTotals }) {
  return (
    <Card>
      <CardContent className="py-4 text-center">
        <div className="text-lg font-semibold tabular-nums text-sage-300">{fmtMiles(t.miles)} mi</div>
        <div className="text-xs tabular-nums text-mist-400">{t.steps.toLocaleString()} steps</div>
        <div className="mt-1 text-[11px] text-mist-600">{label}</div>
      </CardContent>
    </Card>
  );
}

function fmtDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
