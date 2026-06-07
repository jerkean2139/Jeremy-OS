"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TrendingUp, Info, CalendarRange, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TrendChart } from "@/components/charts/TrendChart";
import { useStore } from "@/lib/store";
import { buildSeries, correlations } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export default function AnalyticsPage() {
  return (
    <HydrationGate>
      <Analytics />
    </HydrationGate>
  );
}

const RANGES = [
  { label: "Week", days: 7 },
  { label: "Month", days: 30 },
  { label: "Quarter", days: 90 },
];

function Analytics() {
  const days = useStore((s) => s.days);
  const elevatorLogs = useStore((s) => s.elevatorLogs);
  const theaterLogs = useStore((s) => s.theaterLogs);
  const pulseLogs = useStore((s) => s.pulseLogs);
  const [rangeDays, setRangeDays] = useState(7);

  const series = useMemo(
    () => buildSeries(days, elevatorLogs, theaterLogs, pulseLogs, rangeDays),
    [days, elevatorLogs, theaterLogs, pulseLogs, rangeDays]
  );
  const cors = useMemo(() => correlations(series), [series]);

  const hasData = series.some(
    (p) => p.pressure != null || p.floors > 0 || p.acts > 0 || p.sleep != null || p.focusPct != null
  );

  return (
    <div>
      <PageHeader title="Patterns" subtitle="Awareness, made visible." back="/" />

      {/* Weekly review entry */}
      <Link
        href="/review"
        className="mb-5 flex items-center gap-3 rounded-2xl border border-ink-700/60 bg-gradient-to-br from-sky-500/10 to-sage-500/5 p-4 transition-colors hover:border-ink-600"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800/70">
          <CalendarRange className="h-5 w-5 text-sky-400" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-mist-100">Weekly Review</div>
          <div className="text-xs text-mist-500">A calm digest of your last 7 days</div>
        </div>
        <ChevronRight className="h-5 w-5 text-mist-600" />
      </Link>

      {/* Range selector */}
      <div className="mb-5 flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setRangeDays(r.days)}
            className={cn(
              "flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors",
              rangeDays === r.days
                ? "border-sage-500 bg-sage-500/15 text-sage-400"
                : "border-ink-600 bg-ink-800/50 text-mist-400"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <TrendingUp className="h-8 w-8 text-mist-500" />
            <p className="text-sm text-mist-400">
              Patterns appear as you check in. Log a few days to see the picture.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Insights */}
          {cors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>What the data is whispering</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {cors.map((c) => (
                  <div key={c.label} className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        Math.abs(c.value) >= 0.6
                          ? "bg-ember-400"
                          : Math.abs(c.value) >= 0.35
                            ? "bg-sky-400"
                            : "bg-mist-500"
                      )}
                    />
                    <p className="text-sm text-mist-300">{c.insight}</p>
                  </div>
                ))}
                <div className="mt-3 flex items-start gap-2 border-t border-ink-700/60 pt-3 text-xs text-mist-500">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Patterns are signals, not verdicts. They point at where to look next.
                </div>
              </CardContent>
            </Card>
          )}

          <ChartCard title="Pressure vs Elevator">
            <TrendChart
              data={series}
              series={[
                { key: "floors", name: "Floors", color: "#c97f4a", type: "bar", yAxis: "right" },
                { key: "pressure", name: "Pressure", color: "#7fb59b", type: "line" },
              ]}
            />
          </ChartCard>

          <ChartCard title="Pressure vs Theater">
            <TrendChart
              data={series}
              series={[
                { key: "acts", name: "Acts", color: "#5d8bc4", type: "bar", yAxis: "right" },
                { key: "pressure", name: "Pressure", color: "#7fb59b", type: "line" },
              ]}
            />
          </ChartCard>

          <ChartCard title="Sleep vs Pressure">
            <TrendChart
              data={series}
              series={[
                { key: "sleep", name: "Sleep (hrs)", color: "#7aa7d9", type: "line" },
                { key: "pressure", name: "Pressure", color: "#d99a6c", type: "line", yAxis: "right" },
              ]}
            />
          </ChartCard>

          <ChartCard title="Weight vs Elevator">
            <TrendChart
              data={series}
              series={[
                { key: "floors", name: "Floors", color: "#c97f4a", type: "bar", yAxis: "right" },
                { key: "weight", name: "Weight (lbs)", color: "#cdd2db", type: "line" },
              ]}
            />
          </ChartCard>

          <ChartCard title="Focus — Mountain vs Noise">
            <TrendChart
              data={series}
              series={[
                { key: "pulseMountain", name: "Mountain", color: "#5d9c80", type: "bar" },
                { key: "pulseNoise", name: "Noise", color: "#c97f4a", type: "bar" },
                { key: "focusPct", name: "Focus %", color: "#7aa7d9", type: "line", yAxis: "right" },
              ]}
            />
          </ChartCard>

          <ChartCard title="Productive Days vs Elevator">
            <TrendChart
              data={series}
              series={[
                { key: "floors", name: "Floors", color: "#c97f4a", type: "bar" },
                { key: "movedMountain", name: "Moved mountain", color: "#5d9c80", type: "line", yAxis: "right" },
              ]}
            />
          </ChartCard>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
