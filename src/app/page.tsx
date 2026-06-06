"use client";

import Link from "next/link";
import { Building2, Theater as TheaterIcon, Flame, Sunrise, Moon } from "lucide-react";
import { HydrationGate } from "@/components/HydrationGate";
import { MissionControl } from "@/components/dashboard/MissionControl";
import { MountainCard } from "@/components/dashboard/MountainCard";
import { PressureCard } from "@/components/dashboard/PressureCard";
import { VitalsCard } from "@/components/dashboard/VitalsCard";
import { StatTile } from "@/components/StatTile";
import { useStore } from "@/lib/store";
import { MISSION_STATEMENT } from "@/lib/codewords";
import { calcElevatorFreeStreak, floorsOn, actsOn } from "@/lib/analytics";
import { greeting, todayKey, pressureColor } from "@/lib/utils";

export default function DashboardPage() {
  return (
    <HydrationGate>
      <Dashboard />
    </HydrationGate>
  );
}

function Dashboard() {
  const day = useStore((s) => s.getDay());
  const elevatorLogs = useStore((s) => s.elevatorLogs);
  const theaterLogs = useStore((s) => s.theaterLogs);

  const key = todayKey();
  const floors = floorsOn(elevatorLogs, key);
  const acts = actsOn(theaterLogs, key);
  const streak = calcElevatorFreeStreak(elevatorLogs);

  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <p className="text-sm text-mist-400">{dateStr}</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-mist-50">
          {greeting()}, Jeremy
        </h1>
        <p className="mt-1.5 text-sm italic text-sage-400">{MISSION_STATEMENT}</p>
      </div>

      {/* Section 1 */}
      <MissionControl />

      {/* Section 2 */}
      <MountainCard />

      {/* Section 3 */}
      <PressureCard />

      {/* Vitals */}
      <VitalsCard />

      {/* Snapshot stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile
          label="Floors"
          value={floors}
          hint="Elevator today"
          accent={floors === 0 ? "text-sage-400" : "text-ember-400"}
        />
        <StatTile
          label="Acts"
          value={acts}
          hint="Theater today"
          accent={acts === 0 ? "text-sage-400" : "text-ember-400"}
        />
        <StatTile
          label="Streak"
          value={streak}
          unit={streak === 1 ? "day" : "days"}
          hint="Elevator-free"
          accent="text-sage-400"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/elevator"
          className="flex flex-col items-start gap-2 rounded-2xl border border-ink-700/60 bg-ink-850/70 p-4 transition-colors hover:border-ink-600 hover:bg-ink-800"
        >
          <Building2 className="h-5 w-5 text-mist-300" />
          <span className="text-sm font-medium text-mist-100">I Took The Elevator</span>
          <span className="text-xs text-mist-500">Log a floor, no judgment</span>
        </Link>
        <Link
          href="/theater"
          className="flex flex-col items-start gap-2 rounded-2xl border border-ink-700/60 bg-ink-850/70 p-4 transition-colors hover:border-ink-600 hover:bg-ink-800"
        >
          <TheaterIcon className="h-5 w-5 text-mist-300" />
          <span className="text-sm font-medium text-mist-100">I Entered The Theater</span>
          <span className="text-xs text-mist-500">Private. No streak-shaming</span>
        </Link>
      </div>

      {/* Check-in shortcuts */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/morning"
          className="flex items-center gap-3 rounded-2xl border border-ink-700/60 bg-ink-850/70 p-4 transition-colors hover:bg-ink-800"
        >
          <Sunrise className="h-5 w-5 text-ember-400" />
          <div>
            <div className="text-sm font-medium text-mist-100">Morning</div>
            <div className="text-xs text-mist-500">
              {day.morning ? "Revisit" : "Begin the day"}
            </div>
          </div>
        </Link>
        <Link
          href="/reflection"
          className="flex items-center gap-3 rounded-2xl border border-ink-700/60 bg-ink-850/70 p-4 transition-colors hover:bg-ink-800"
        >
          <Moon className="h-5 w-5 text-sky-400" />
          <div>
            <div className="text-sm font-medium text-mist-100">Reflection</div>
            <div className="text-xs text-mist-500">
              {day.reflection ? "Revisit" : "Close the day"}
            </div>
          </div>
        </Link>
      </div>

      {/* Pressure summary line */}
      <div className="flex items-center justify-center gap-2 pt-1 text-sm text-mist-500">
        <Flame className={`h-4 w-4 ${pressureColor(day.pressureLevel)}`} />
        Current pressure is{" "}
        <span className={pressureColor(day.pressureLevel)}>{day.pressureLevel}/10</span>
      </div>
    </div>
  );
}
