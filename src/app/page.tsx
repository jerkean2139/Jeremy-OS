"use client";

import Link from "next/link";
import { Building2, Theater as TheaterIcon, Flame, Sunrise, Moon, Timer, Bell, History, Database, Search, CalendarRange, Check, Repeat } from "lucide-react";
import { HydrationGate } from "@/components/HydrationGate";
import { MissionControl } from "@/components/dashboard/MissionControl";
import { TodayPath } from "@/components/dashboard/TodayPath";
import { IdentityVotesCard } from "@/components/dashboard/IdentityVotesCard";
import { NeverMissTwiceCard } from "@/components/dashboard/NeverMissTwiceCard";
import { MountainCard } from "@/components/dashboard/MountainCard";
import { PressureCard } from "@/components/dashboard/PressureCard";
import { VitalsCard } from "@/components/dashboard/VitalsCard";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { SlackBriefing } from "@/components/SlackBriefing";
import { CoworkBriefs } from "@/components/CoworkBriefs";
import { ScriptureCard } from "@/components/dashboard/ScriptureCard";
import { RitualMakeupCard } from "@/components/dashboard/RitualMakeupCard";
import { CostMeterCard } from "@/components/dashboard/CostMeterCard";
import { DayCard } from "@/components/dashboard/DayCard";
import { MovementCard } from "@/components/dashboard/MovementCard";
import { QuickAddFab } from "@/components/QuickAddFab";
import { StatTile } from "@/components/StatTile";
import { useStore } from "@/lib/store";
import { MISSION_STATEMENT, PERSONAL_CREED } from "@/lib/codewords";
import { calcElevatorFreeStreak, floorsOn, actsOn } from "@/lib/analytics";
import { activeHabits, habitDoneToday } from "@/lib/habits";
import { calcRoutineStreak } from "@/lib/routine";
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
  const days = useStore((s) => s.days);
  const habits = useStore((s) => s.habits);

  const buildHabits = activeHabits(habits ?? []).filter((h) => h.kind === "build");
  const buildCount = buildHabits.length;
  const buildDone = buildHabits.filter((h) => habitDoneToday(h)).length;

  const key = todayKey();
  const floors = floorsOn(elevatorLogs, key);
  const acts = actsOn(theaterLogs, key);
  const streak = calcElevatorFreeStreak(elevatorLogs);
  const ritualDone = !!day.routine;
  const ritualStreak = calcRoutineStreak(days);

  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-mist-400">{dateStr}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-mist-50">
            {greeting()}, Jeremy
          </h1>
          <p className="mt-1.5 text-sm italic text-sage-400">{MISSION_STATEMENT}</p>
          <p className="mt-1 text-xs font-medium tracking-wide text-mist-400">{PERSONAL_CREED}</p>
        </div>
        <div className="mt-1 flex items-center gap-1">
          <Link
            href="/search"
            className="rounded-full p-2 text-mist-400 hover:bg-ink-800 hover:text-mist-100"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            href="/history"
            className="rounded-full p-2 text-mist-400 hover:bg-ink-800 hover:text-mist-100"
            aria-label="History"
          >
            <History className="h-5 w-5" />
          </Link>
          <Link
            href="/backup"
            className="rounded-full p-2 text-mist-400 hover:bg-ink-800 hover:text-mist-100"
            aria-label="Backup"
          >
            <Database className="h-5 w-5" />
          </Link>
          <Link
            href="/reminders"
            className="rounded-full p-2 text-mist-400 hover:bg-ink-800 hover:text-mist-100"
            aria-label="Reminders"
          >
            <Bell className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Guided checklist — take it one step at a time */}
      <TodayPath />

      {/* Section 1 */}
      <MissionControl />

      {/* Identity in motion — every action is a vote */}
      <IdentityVotesCard />

      {/* Never miss twice — calm recovery, only when relevant */}
      <NeverMissTwiceCard />

      {/* Morning Ritual — the 6am anchor */}
      <Link
        href="/routine"
        className="flex items-center gap-3 rounded-2xl border border-ink-700/60 bg-gradient-to-br from-ember-500/10 to-sage-500/5 p-4 transition-colors hover:border-ink-600"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800/70">
          {ritualDone ? <Check className="h-5 w-5 text-sage-400" /> : <Sunrise className="h-5 w-5 text-ember-400" />}
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-mist-100">Morning Ritual</div>
          <div className="text-xs text-mist-500">
            {ritualDone ? "Complete today" : "Check in · stretch · walk — by 7am"}
            {ritualStreak > 0 && ` · ${ritualStreak}-day streak`}
          </div>
        </div>
      </Link>

      {/* Make up a movement piece set aside this morning (e.g. a walk at lunch) */}
      <RitualMakeupCard />

      {/* Today's calendar — appears once a calendar is connected */}
      <DayCard />

      {/* Daily Word — scripture before the noise */}
      <ScriptureCard />

      {/* Cowork briefs — scheduled-task results, scanned first at 7am */}
      <CoworkBriefs />

      {/* Slack — the 7am "start here" briefing */}
      <SlackBriefing />

      {/* Proactive insight */}
      <InsightCard />

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

      {/* Accrued steps & miles — appears once you've logged movement */}
      <MovementCard />

      {/* Pulse — 15-min awareness check */}
      <Link
        href="/pulse"
        className="flex items-center gap-3 rounded-2xl border border-ink-700/60 bg-gradient-to-br from-sage-500/10 to-sky-500/5 p-4 transition-colors hover:border-ink-600"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800/70">
          <Timer className="h-5 w-5 text-sage-400" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-mist-100">Start a Pulse</div>
          <div className="text-xs text-mist-500">15-min check: Mountain or Noise?</div>
        </div>
      </Link>

      {/* Habits — design the system, cast the votes */}
      <Link
        href="/habits"
        className="flex items-center gap-3 rounded-2xl border border-ink-700/60 bg-gradient-to-br from-sage-500/10 to-sky-500/5 p-4 transition-colors hover:border-ink-600"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800/70">
          <Repeat className="h-5 w-5 text-sage-400" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-mist-100">Habits</div>
          <div className="text-xs text-mist-500">
            {buildCount > 0
              ? `${buildDone}/${buildCount} done today · the four laws`
              : "Build & break habits with the four laws"}
          </div>
        </div>
      </Link>

      {/* Weekly Review */}
      <Link
        href="/review"
        className="flex items-center gap-3 rounded-2xl border border-ink-700/60 bg-gradient-to-br from-sky-500/10 to-sage-500/5 p-4 transition-colors hover:border-ink-600"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800/70">
          <CalendarRange className="h-5 w-5 text-sky-400" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-mist-100">Weekly Review</div>
          <div className="text-xs text-mist-500">Your last 7 days, in focus</div>
        </div>
      </Link>

      {/* Estimated AI spend */}
      <CostMeterCard />

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

      {/* Quick-add a session, one tap */}
      <QuickAddFab />
    </div>
  );
}
