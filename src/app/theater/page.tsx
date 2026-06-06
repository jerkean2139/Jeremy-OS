"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Theater as TheaterIcon, Check, Lock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PressureMeter } from "@/components/PressureMeter";
import { useStore } from "@/lib/store";

export default function TheaterPage() {
  return (
    <HydrationGate>
      <Theater />
    </HydrationGate>
  );
}

function Theater() {
  const router = useRouter();
  const addLog = useStore((s) => s.addTheaterLog);
  const day = useStore((s) => s.getDay());

  const [acts, setActs] = useState(1);
  const [pressureLevel, setPressureLevel] = useState(day.pressureLevel);
  const [trigger, setTrigger] = useState("");
  const [saved, setSaved] = useState(false);

  const save = () => {
    addLog({ acts, pressureLevel, trigger: trigger.trim() });
    setSaved(true);
    setTimeout(() => router.push("/"), 700);
  };

  return (
    <div>
      <PageHeader
        title="The Theater"
        subtitle="Private and quiet. We log to understand, never to punish."
        back="/"
      />

      <Card className="mb-5 border-ink-700/60">
        <CardContent className="flex items-center gap-3 pt-5">
          <Lock className="h-5 w-5 text-sky-400" />
          <p className="text-sm text-mist-400">
            Stored privately on this device. No streaks. No shame. Only awareness.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardContent className="pt-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-mist-300">How many acts?</span>
              <span className="text-2xl font-semibold tabular-nums text-mist-50">{acts}</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setActs(n)}
                  className={`h-12 flex-1 rounded-xl border text-lg font-medium transition-colors ${
                    acts === n
                      ? "border-sky-500 bg-sky-500/15 text-sky-400"
                      : "border-ink-600 bg-ink-800/50 text-mist-400"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <PressureMeter
              label="Pressure right now"
              value={pressureLevel}
              onChange={setPressureLevel}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <label className="mb-2 block text-sm text-mist-300">
              What was the trigger?
            </label>
            <input
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              placeholder="Stress, boredom, loneliness, habit…"
              className="w-full rounded-xl border border-ink-700 bg-ink-900/60 px-4 py-3 text-mist-50 placeholder:text-mist-500 focus:border-sky-500/50 focus:outline-none"
            />
          </CardContent>
        </Card>

        <Button size="lg" className="w-full" onClick={save} disabled={saved}>
          {saved ? (
            <>
              <Check className="h-5 w-5" /> Logged privately
            </>
          ) : (
            <>
              <TheaterIcon className="h-5 w-5" /> Log it
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
