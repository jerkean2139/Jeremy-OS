"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Trash2, Sunrise, Moon, Building2, Theater as TheaterIcon, Timer } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { Chip } from "@/components/ui/Chip";
import { useStore } from "@/lib/store";
import { PRESSURE_SOURCES, type PressureSource } from "@/lib/types";
import { startOfDayKey } from "@/lib/analytics";
import { cn, pressureColor } from "@/lib/utils";

export default function HistoryDetailPage() {
  return (
    <HydrationGate>
      <HistoryDetail />
    </HydrationGate>
  );
}

function HistoryDetail() {
  const router = useRouter();
  const params = useParams();
  const date = String(params.date);

  const day = useStore((s) => s.getDay(date));
  const updateDay = useStore((s) => s.updateDay);
  const elevatorLogs = useStore((s) => s.elevatorLogs);
  const theaterLogs = useStore((s) => s.theaterLogs);
  const pulseLogs = useStore((s) => s.pulseLogs);
  const deleteElevatorLog = useStore((s) => s.deleteElevatorLog);
  const deleteTheaterLog = useStore((s) => s.deleteTheaterLog);
  const deletePulseLog = useStore((s) => s.deletePulseLog);

  const [mountain, setMountain] = useState(day.mountain ?? "");
  const [pressureLevel, setPressureLevel] = useState(day.pressureLevel ?? 5);
  const [sources, setSources] = useState<PressureSource[]>(day.pressureSources ?? []);
  const [sleepHours, setSleepHours] = useState<string>(day.sleepHours?.toString() ?? "");
  const [weight, setWeight] = useState<string>(day.weight?.toString() ?? "");
  const [movedMountain, setMovedMountain] = useState<boolean | null>(day.movedMountain ?? null);
  const [saved, setSaved] = useState(false);

  const dayElevator = useMemo(
    () => elevatorLogs.filter((l) => startOfDayKey(l.timestamp) === date),
    [elevatorLogs, date]
  );
  const dayTheater = useMemo(
    () => theaterLogs.filter((l) => startOfDayKey(l.timestamp) === date),
    [theaterLogs, date]
  );
  const dayPulse = useMemo(
    () => pulseLogs.filter((l) => startOfDayKey(l.timestamp) === date),
    [pulseLogs, date]
  );

  const label = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const toggleSource = (s: PressureSource) =>
    setSources((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const save = () => {
    updateDay(
      {
        mountain,
        pressureLevel,
        pressureSources: sources,
        sleepHours: sleepHours ? Number(sleepHours) : undefined,
        weight: weight ? Number(weight) : undefined,
        movedMountain,
      },
      date
    );
    setSaved(true);
    setTimeout(() => router.push("/history"), 700);
  };

  const time = (ts: string) =>
    new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <div>
      <PageHeader title="Edit day" subtitle={label} back="/history" />

      <div className="space-y-5">
        <Card>
          <CardContent className="space-y-6 pt-5">
            {/* Mountain */}
            <div>
              <label className="mb-2 block text-sm font-medium text-mist-200">The mountain</label>
              <input
                value={mountain}
                onChange={(e) => setMountain(e.target.value)}
                placeholder="The one thing for this day…"
                className="w-full rounded-xl border border-ink-700 bg-ink-900/60 px-4 py-3 text-mist-50 placeholder:text-mist-500 focus:border-sage-500/50 focus:outline-none"
              />
            </div>

            {/* Pressure */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-mist-200">Pressure</label>
                <span className={cn("text-sm font-semibold tabular-nums", pressureColor(pressureLevel))}>
                  {pressureLevel}/10
                </span>
              </div>
              <Slider value={pressureLevel} min={1} max={10} onChange={setPressureLevel} />
              <div className="mt-3 flex flex-wrap gap-2">
                {PRESSURE_SOURCES.map((s) => (
                  <Chip key={s} selected={sources.includes(s)} onClick={() => toggleSource(s)}>
                    {s}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Vitals */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-mist-200">Sleep (hrs)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  placeholder="—"
                  className="w-full rounded-xl border border-ink-700 bg-ink-900/60 px-4 py-3 text-mist-50 placeholder:text-mist-500 focus:border-sage-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-mist-200">Weight (lbs)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="—"
                  className="w-full rounded-xl border border-ink-700 bg-ink-900/60 px-4 py-3 text-mist-50 placeholder:text-mist-500 focus:border-sage-500/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Moved mountain */}
            <div>
              <p className="mb-2.5 text-sm font-medium text-mist-200">Did the mountain move?</p>
              <div className="flex gap-2">
                {[
                  { label: "Yes", val: true as boolean | null },
                  { label: "Partly", val: null },
                  { label: "Not today", val: false },
                ].map((o) => (
                  <button
                    key={o.label}
                    onClick={() => setMovedMountain(o.val)}
                    className={cn(
                      "h-12 flex-1 rounded-xl border text-sm font-medium transition-colors",
                      movedMountain === o.val
                        ? "border-sage-500 bg-sage-500/15 text-sage-400"
                        : "border-ink-600 bg-ink-800/50 text-mist-400"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Check-ins */}
        <Card>
          <CardHeader>
            <CardTitle>Check-ins</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href={`/morning?date=${date}`}
              className="flex items-center gap-3 rounded-xl border border-ink-700/60 bg-ink-850/70 p-3 hover:border-ink-600"
            >
              <Sunrise className="h-5 w-5 text-ember-400" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-mist-100">Morning</div>
                <div className="truncate text-xs text-mist-500">
                  {day.morning ? day.morning.mountain || "Edit check-in" : "Add a morning check-in"}
                </div>
              </div>
            </Link>
            <Link
              href={`/reflection?date=${date}`}
              className="flex items-center gap-3 rounded-xl border border-ink-700/60 bg-ink-850/70 p-3 hover:border-ink-600"
            >
              <Moon className="h-5 w-5 text-sky-400" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-mist-100">Reflection</div>
                <div className="truncate text-xs text-mist-500">
                  {day.reflection ? day.reflection.win || "Edit reflection" : "Add an evening reflection"}
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Logged activity for the day */}
        {(dayElevator.length > 0 || dayTheater.length > 0 || dayPulse.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Logged this day</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dayElevator.map((l) => (
                <LogRow key={l.id} icon={<Building2 className="h-4 w-4 text-ember-400/80" />} onDelete={() => deleteElevatorLog(l.id)}>
                  <span className="text-mist-200">Elevator · {l.floors} floors</span>
                  <span className="text-mist-500"> · {time(l.timestamp)}</span>
                </LogRow>
              ))}
              {dayTheater.map((l) => (
                <LogRow key={l.id} icon={<TheaterIcon className="h-4 w-4 text-ember-400/80" />} onDelete={() => deleteTheaterLog(l.id)}>
                  <span className="text-mist-200">Theater · {l.acts} acts</span>
                  <span className="text-mist-500"> · {time(l.timestamp)}</span>
                </LogRow>
              ))}
              {dayPulse.map((l) => (
                <LogRow key={l.id} icon={<Timer className="h-4 w-4 text-sage-400/80" />} onDelete={() => deletePulseLog(l.id)}>
                  <span className="capitalize text-mist-200">{l.tag}</span>
                  {l.activity && <span className="text-mist-400"> · {l.activity}</span>}
                  <span className="text-mist-500"> · {time(l.timestamp)}</span>
                </LogRow>
              ))}
            </CardContent>
          </Card>
        )}

        <Button size="lg" className="w-full" onClick={save} disabled={saved}>
          {saved ? (
            <>
              <Check className="h-5 w-5" /> Saved
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </div>
  );
}

function LogRow({
  icon,
  children,
  onDelete,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-ink-700/60 bg-ink-900/40 px-3 py-2.5 text-sm">
      {icon}
      <div className="min-w-0 flex-1 truncate">{children}</div>
      <button
        onClick={onDelete}
        className="rounded-full p-1.5 text-mist-600 hover:text-ember-400"
        aria-label="Delete entry"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
