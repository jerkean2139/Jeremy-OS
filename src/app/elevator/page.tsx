"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Clock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { PressureMeter } from "@/components/PressureMeter";
import { useStore } from "@/lib/store";
import { ELEVATOR_TRIGGERS, type ElevatorTrigger } from "@/lib/types";
import { floorsOn } from "@/lib/analytics";
import { todayKey } from "@/lib/utils";

export default function ElevatorPage() {
  return (
    <HydrationGate>
      <Elevator />
    </HydrationGate>
  );
}

function Elevator() {
  const router = useRouter();
  const addLog = useStore((s) => s.addElevatorLog);
  const day = useStore((s) => s.getDay());
  const logs = useStore((s) => s.elevatorLogs);

  const [floors, setFloors] = useState(1);
  const [pressureLevel, setPressureLevel] = useState(day.pressureLevel);
  const [triggers, setTriggers] = useState<ElevatorTrigger[]>([]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  const todayFloors = floorsOn(logs, todayKey());

  const toggle = (t: ElevatorTrigger) =>
    setTriggers((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const save = () => {
    addLog({ floors, pressureLevel, triggers, note: note.trim() || undefined });
    setSaved(true);
    setTimeout(() => router.push("/"), 700);
  };

  return (
    <div>
      <PageHeader
        title="The Elevator"
        subtitle="A moment of awareness, not a verdict. Log it and move on."
        back="/"
      />

      <Card className="mb-5">
        <CardContent className="flex items-center justify-between pt-5">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-mist-300" />
            <div>
              <div className="text-sm text-mist-300">Floors today</div>
              <div className="text-xs text-mist-500">No judgment, only patterns</div>
            </div>
          </div>
          <span className="text-3xl font-semibold tabular-nums text-mist-50">{todayFloors}</span>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardContent className="pt-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-mist-300">How many floors this time?</span>
              <span className="text-2xl font-semibold tabular-nums text-mist-50">{floors}</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setFloors(n)}
                  className={`h-12 flex-1 rounded-xl border text-lg font-medium transition-colors ${
                    floors === n
                      ? "border-sage-500 bg-sage-500/15 text-sage-400"
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
            <p className="mb-3 text-sm text-mist-300">
              What happened in the last 15 minutes?
            </p>
            <div className="flex flex-wrap gap-2">
              {ELEVATOR_TRIGGERS.map((t) => (
                <Chip key={t} selected={triggers.includes(t)} onClick={() => toggle(t)}>
                  {t}
                </Chip>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything else worth noting? (optional)"
              rows={2}
              className="mt-4 w-full resize-none rounded-xl border border-ink-700 bg-ink-900/60 px-4 py-3 text-mist-50 placeholder:text-mist-500 focus:border-sage-500/50 focus:outline-none"
            />
          </CardContent>
        </Card>

        <Button size="lg" className="w-full" onClick={save} disabled={saved}>
          {saved ? (
            <>
              <Check className="h-5 w-5" /> Logged
            </>
          ) : (
            <>
              <Clock className="h-5 w-5" /> Log it
            </>
          )}
        </Button>
        <p className="text-center text-xs text-mist-500">
          Awareness is the work. The pattern will teach you.
        </p>
      </div>
    </div>
  );
}
