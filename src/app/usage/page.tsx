"use client";

import { useMemo } from "react";
import { Gauge } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { Card, CardContent } from "@/components/ui/Card";
import { useStore } from "@/lib/store";
import { usageSummary, fmtUsd } from "@/lib/usage";

export default function UsagePage() {
  return (
    <HydrationGate>
      <Usage />
    </HydrationGate>
  );
}

const FEATURE_LABEL: Record<string, string> = {
  coach: "Coach chat",
  scripture: "Scripture",
  summary: "Morning summary",
  insight: "Daily insight",
  review: "Weekly review",
  memory: "Coach memory",
  tts: "Voice (speech)",
  transcribe: "Voice (transcribe)",
};

function Usage() {
  const aiUsage = useStore((s) => s.aiUsage);
  const sum = useMemo(() => usageSummary(aiUsage ?? []), [aiUsage]);

  const tokens = (aiUsage ?? []).reduce(
    (acc, e) => {
      acc.input += e.inputTokens ?? 0;
      acc.output += e.outputTokens ?? 0;
      return acc;
    },
    { input: 0, output: 0 }
  );

  return (
    <div>
      <PageHeader title="AI Spend" subtitle="Estimated, calculated from usage" back="/" />

      {/* Headline totals */}
      <Card className="mb-5">
        <CardContent className="pt-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Total label="Today" value={fmtUsd(sum.today)} />
            <Total label="This month" value={fmtUsd(sum.month)} accent />
            <Total label="All time" value={fmtUsd(sum.total)} />
          </div>
        </CardContent>
      </Card>

      {sum.count === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Gauge className="h-7 w-7 text-sky-400" />
            <div className="text-mist-200">No AI spend yet.</div>
            <p className="max-w-xs text-sm text-mist-500">
              As you use the coach, summaries, scripture, and voice, your estimated cost shows
              up here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* By feature */}
          <Card className="mb-5">
            <CardContent className="space-y-2.5 pt-5">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
                By feature
              </div>
              {sum.byFeature.map((f) => (
                <div key={f.feature} className="flex items-center justify-between text-sm">
                  <span className="text-mist-200">{FEATURE_LABEL[f.feature] ?? f.feature}</span>
                  <span className="tabular-nums text-mist-400">{fmtUsd(f.cost)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Volume */}
          <Card>
            <CardContent className="space-y-2.5 pt-5">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
                Volume
              </div>
              <Row label="Calls metered" value={sum.count.toLocaleString()} />
              <Row label="Input tokens" value={tokens.input.toLocaleString()} />
              <Row label="Output tokens" value={tokens.output.toLocaleString()} />
            </CardContent>
          </Card>
        </>
      )}

      <p className="mt-5 px-1 text-xs leading-relaxed text-mist-600">
        Estimated from token, character, and audio usage using current OpenAI rates — close to,
        but not a substitute for, your official OpenAI bill. Offline/fallback replies cost nothing
        and aren&apos;t counted.
      </p>
    </div>
  );
}

function Total({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div
        className={`text-xl font-semibold tabular-nums ${accent ? "text-sky-300" : "text-mist-50"}`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-mist-500">{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-mist-300">{label}</span>
      <span className="tabular-nums text-mist-400">{value}</span>
    </div>
  );
}
