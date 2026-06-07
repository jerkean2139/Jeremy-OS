"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, Sunrise, Moon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { Card, CardContent } from "@/components/ui/Card";
import { useStore } from "@/lib/store";
import { floorsOn, actsOn, pulsesOn, summarizePulses, startOfDayKey } from "@/lib/analytics";
import { cn, pressureColor } from "@/lib/utils";

export default function HistoryPage() {
  return (
    <HydrationGate>
      <HistoryList />
    </HydrationGate>
  );
}

function prettyDate(key: string): { weekday: string; rest: string; isToday: boolean } {
  const d = new Date(`${key}T00:00:00`);
  const today = new Date();
  const isToday = key === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: "long" }),
    rest: d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }),
    isToday,
  };
}

function HistoryList() {
  const days = useStore((s) => s.days);
  const elevatorLogs = useStore((s) => s.elevatorLogs);
  const theaterLogs = useStore((s) => s.theaterLogs);
  const pulseLogs = useStore((s) => s.pulseLogs);

  // Every date that carries any data — day entries plus any logged activity.
  const dateKeys = useMemo(() => {
    const set = new Set<string>(Object.keys(days));
    for (const l of elevatorLogs) set.add(startOfDayKey(l.timestamp));
    for (const l of theaterLogs) set.add(startOfDayKey(l.timestamp));
    for (const l of pulseLogs) set.add(startOfDayKey(l.timestamp));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [days, elevatorLogs, theaterLogs, pulseLogs]);

  return (
    <div>
      <PageHeader title="History" subtitle="Look back. Edit anything. No judgment." back="/" />

      {dateKeys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <CalendarDays className="h-8 w-8 text-mist-500" />
            <p className="text-sm text-mist-400">
              Your days will gather here as you check in.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {dateKeys.map((key) => {
            const day = days[key];
            const floors = floorsOn(elevatorLogs, key);
            const acts = actsOn(theaterLogs, key);
            const focus = summarizePulses(pulsesOn(pulseLogs, key));
            const { weekday, rest, isToday } = prettyDate(key);
            return (
              <Link key={key} href={`/history/${key}`}>
                <Card className="transition-colors hover:border-ink-600">
                  <CardContent className="flex items-center gap-3 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-mist-50">{weekday}</span>
                        {isToday && (
                          <span className="rounded-full bg-sage-500/15 px-2 py-0.5 text-[10px] font-medium text-sage-400">
                            Today
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-mist-500">{rest}</div>
                      {day?.mountain && (
                        <div className="mt-1.5 truncate text-sm text-mist-300">
                          ⛰ {day.mountain}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mist-500">
                        {day?.pressureLevel != null && (
                          <span className={pressureColor(day.pressureLevel)}>
                            Pressure {day.pressureLevel}
                          </span>
                        )}
                        <span className={floors === 0 ? "text-mist-500" : "text-ember-400"}>
                          {floors} floors
                        </span>
                        <span className={acts === 0 ? "text-mist-500" : "text-ember-400"}>
                          {acts} acts
                        </span>
                        {focus.total > 0 && (
                          <span>{Math.round(focus.focusRatio * 100)}% focus</span>
                        )}
                        {day?.morning && <Sunrise className="h-3.5 w-3.5 text-ember-400/70" />}
                        {day?.reflection && <Moon className="h-3.5 w-3.5 text-sky-400/70" />}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-mist-600" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
