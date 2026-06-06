"use client";

import { Mountain } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { Card, CardContent } from "@/components/ui/Card";
import { Slider } from "@/components/ui/Slider";
import { Progress } from "@/components/ui/Progress";
import { useStore } from "@/lib/store";
import { type ManumationState } from "@/lib/types";

export default function ManumationPage() {
  return (
    <HydrationGate>
      <Manumation />
    </HydrationGate>
  );
}

const METRICS: { key: keyof ManumationState; label: string }[] = [
  { key: "funnelCompletion", label: "Funnel Completion" },
  { key: "contentLoaded", label: "Content Loaded" },
  { key: "outboundStatus", label: "Outbound Status" },
  { key: "summitPlanning", label: "Summit Planning" },
  { key: "teamReadiness", label: "Team Readiness" },
];

function Manumation() {
  const m = useStore((s) => s.manumation);
  const setManumation = useStore((s) => s.setManumation);

  const values = METRICS.map(({ key }) => m[key] as number);
  const readiness = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const distance = 100 - readiness;

  const readinessAccent =
    readiness >= 75 ? "#5d9c80" : readiness >= 40 ? "#d99a6c" : "#c97f4a";

  return (
    <div>
      <PageHeader
        title="Manumation"
        subtitle="The summit. One distance that matters."
        back="/"
      />

      {/* Distance to launch hero */}
      <Card className="mb-5 overflow-hidden">
        <div className="bg-gradient-to-br from-sky-500/10 to-sage-500/5 p-6 text-center">
          <div className="flex items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-sky-400">
            <Mountain className="h-4 w-4" /> Distance to Launch
          </div>
          <div className="mt-3 text-6xl font-semibold tabular-nums text-mist-50">
            {distance}
            <span className="text-2xl text-mist-500">%</span>
          </div>
          <p className="mt-2 text-sm text-mist-400">
            Launch readiness: {readiness}%
          </p>
          {m.launchDate && (
            <p className="mt-1 text-xs text-mist-500">Target: {m.launchDate}</p>
          )}
          <div className="mt-4">
            <Progress value={readiness} accent={readinessAccent} />
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {METRICS.map(({ key, label }) => {
          const value = m[key] as number;
          return (
            <Card key={key}>
              <CardContent className="pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-mist-200">{label}</span>
                  <span className="text-xl font-semibold tabular-nums text-mist-50">
                    {value}%
                  </span>
                </div>
                <Slider
                  value={value}
                  min={0}
                  max={100}
                  step={5}
                  onChange={(v) => setManumation({ [key]: v } as Partial<ManumationState>)}
                  accent="#5d8bc4"
                />
              </CardContent>
            </Card>
          );
        })}

        <Card>
          <CardContent className="pt-5">
            <label className="mb-2 block text-sm text-mist-200">Target launch date</label>
            <input
              type="date"
              value={m.launchDate ?? ""}
              onChange={(e) => setManumation({ launchDate: e.target.value || undefined })}
              className="w-full rounded-xl border border-ink-700 bg-ink-900/60 px-4 py-3 text-mist-50 focus:border-sky-500/50 focus:outline-none"
            />
          </CardContent>
        </Card>
      </div>

      <p className="mt-5 text-center text-xs text-mist-500">
        Reduce noise. Increase clarity. Move the mountain.
      </p>
    </div>
  );
}
