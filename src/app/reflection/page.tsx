"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Moon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { VoiceField } from "@/components/VoiceField";
import { SupplementsCard } from "@/components/SupplementsCard";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store";

export default function ReflectionPage() {
  return (
    <HydrationGate>
      <Suspense>
        <Reflection />
      </Suspense>
    </HydrationGate>
  );
}

function Reflection() {
  const router = useRouter();
  const params = useSearchParams();
  const date = params.get("date") || undefined;
  const dest = date ? `/history/${date}` : "/";
  const existing = useStore((s) => s.getDay(date).reflection);
  const saveReflection = useStore((s) => s.saveReflection);

  const [win, setWin] = useState(existing?.win ?? "");
  const [mostPressure, setMostPressure] = useState(existing?.mostPressure ?? "");
  const [movedMountain, setMovedMountain] = useState<boolean | null>(
    existing?.movedMountain ?? null
  );
  const [learned, setLearned] = useState(existing?.learned ?? "");
  const [saved, setSaved] = useState(false);

  const save = () => {
    saveReflection({
      win,
      mostPressure,
      movedMountain,
      learned,
      voiceTranscript: `Win: ${win}\nPressure: ${mostPressure}\nLearned: ${learned}`,
      completedAt: new Date().toISOString(),
    }, date);
    setSaved(true);
    setTimeout(() => router.push(dest), 700);
  };

  return (
    <div>
      <PageHeader
        title="Evening Reflection"
        subtitle="Close the day with honesty, not a scorecard."
        back={dest}
      />

      <div className="space-y-5">
        {/* Nightly routine: supplements & meds */}
        <SupplementsCard date={date} />

        <Card>
          <CardContent className="space-y-5 pt-5">
            <VoiceField
              label="What was today's win?"
              placeholder="Even a small one counts…"
              value={win}
              onChange={setWin}
            />

            <VoiceField
              label="What created the most pressure?"
              placeholder="Name it so it loses its grip…"
              value={mostPressure}
              onChange={setMostPressure}
            />

            <div>
              <p className="mb-2.5 text-sm font-medium text-mist-200">
                Did I move the mountain?
              </p>
              <div className="flex gap-2">
                {[
                  { label: "Yes", val: true },
                  { label: "Partly", val: null },
                  { label: "Not today", val: false },
                ].map((o) => (
                  <button
                    key={o.label}
                    onClick={() => setMovedMountain(o.val)}
                    className={`h-12 flex-1 rounded-xl border text-sm font-medium transition-colors ${
                      movedMountain === o.val
                        ? "border-sage-500 bg-sage-500/15 text-sage-400"
                        : "border-ink-600 bg-ink-800/50 text-mist-400"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <VoiceField
              label="What did I learn?"
              placeholder="One insight to carry forward…"
              value={learned}
              onChange={setLearned}
            />
          </CardContent>
        </Card>

        <Button size="lg" className="w-full" onClick={save} disabled={saved}>
          {saved ? (
            <>
              <Check className="h-5 w-5" /> Saved
            </>
          ) : (
            <>
              <Moon className="h-5 w-5" /> Close the day
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
