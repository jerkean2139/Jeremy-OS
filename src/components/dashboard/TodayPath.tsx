"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ArrowRight,
  Sunrise,
  BookOpen,
  Repeat,
  Timer,
  Moon,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useStore } from "@/lib/store";
import { activeHabits, habitMarkedOn } from "@/lib/habits";
import { todayKey, cn } from "@/lib/utils";

interface Step {
  id: string;
  title: string;
  hint: string;
  icon: LucideIcon;
  done: boolean;
  action: () => void; // toggle (habits) or navigate (activities)
  isNav: boolean;
}

// The guided "do this next" home: a calm checklist of today's path. Habits
// check off in place (and record); activities take you there to do them, then
// show checked when you return. Completing a step pops with a small animation.
export function TodayPath() {
  const router = useRouter();
  const day = useStore((s) => s.getDay());
  const scripture = useStore((s) => s.scripture);
  const habits = useStore((s) => s.habits);
  const pulseLogs = useStore((s) => s.pulseLogs);
  const toggleHabitDay = useStore((s) => s.toggleHabitDay);

  const key = todayKey();

  const steps: Step[] = useMemo(() => {
    const list: Step[] = [
      {
        id: "ritual",
        title: "Morning Ritual",
        hint: "Check in · stretch · walk · read",
        icon: Sunrise,
        done: !!day.routine,
        action: () => router.push("/routine"),
        isNav: true,
      },
      {
        id: "word",
        title: "Daily Word",
        hint: "Today's reading + what it means",
        icon: BookOpen,
        done: scripture?.lastReadDate === key,
        action: () => router.push("/scripture"),
        isNav: true,
      },
    ];

    for (const h of activeHabits(habits ?? []).filter((x) => x.kind === "build")) {
      list.push({
        id: `habit-${h.id}`,
        title: h.name,
        hint: h.twoMinute || h.identity || "A small vote",
        icon: Repeat,
        done: habitMarkedOn(h, key),
        action: () => toggleHabitDay(h.id),
        isNav: false,
      });
    }

    list.push(
      {
        id: "pulse",
        title: "Run a Pulse",
        hint: "Mountain or Noise?",
        icon: Timer,
        done: pulseLogs.some((p) => todayKey(new Date(p.timestamp)) === key),
        action: () => router.push("/pulse"),
        isNav: true,
      },
      {
        id: "reflection",
        title: "Evening Reflection",
        hint: "Close the day",
        icon: Moon,
        done: !!day.reflection,
        action: () => router.push("/reflection"),
        isNav: true,
      }
    );
    return list;
  }, [day.routine, day.reflection, scripture, habits, pulseLogs, key, router, toggleHabitDay]);

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const pct = Math.round((doneCount / steps.length) * 100);

  // Animate steps that flip to done within the session (e.g. a habit checked
  // here). Initial mount establishes a baseline and doesn't animate.
  const prev = useRef<Record<string, boolean> | null>(null);
  const [justDone, setJustDone] = useState<Set<string>>(new Set());
  const doneSig = steps.map((s) => `${s.id}:${s.done ? 1 : 0}`).join("|");

  useEffect(() => {
    const current: Record<string, boolean> = {};
    steps.forEach((s) => (current[s.id] = s.done));
    if (prev.current) {
      const newly = new Set<string>();
      for (const s of steps) if (s.done && prev.current[s.id] === false) newly.add(s.id);
      if (newly.size) {
        setJustDone(newly);
        const t = setTimeout(() => setJustDone(new Set()), 900);
        prev.current = current;
        return () => clearTimeout(t);
      }
    }
    prev.current = current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneSig]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-sage-400">
              Today&apos;s path
            </div>
            <div className="mt-0.5 text-sm text-mist-400">
              {allDone ? "You walked the whole path." : "One step at a time — just do the next one."}
            </div>
          </div>
          <span className="text-sm font-semibold tabular-nums text-mist-200">
            {doneCount}/{steps.length}
          </span>
        </div>

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
          <div
            className="h-full rounded-full bg-sage-500/80 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-3 space-y-1">
          {steps.map((s) => (
            <StepRow key={s.id} step={s} justDone={justDone.has(s.id)} />
          ))}
        </div>

        {allDone && (
          <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-sage-500/10 py-3 text-center text-sm text-sage-300 animate-fade-in">
            <span className="text-base">🌄</span> Every step was a vote. Well done.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StepRow({ step, justDone }: { step: Step; justDone: boolean }) {
  const { icon: Icon, done, title, hint, isNav, action } = step;
  return (
    <button
      onClick={action}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors",
        done ? "" : "hover:bg-ink-800/50"
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors",
          done
            ? "border-sage-500/50 bg-sage-500/20 text-sage-300"
            : "border-ink-600 text-mist-500"
        )}
      >
        {done ? (
          <Check className={cn("h-4 w-4", justDone && "animate-pop")} />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-sm",
            done ? "text-mist-500 line-through" : "font-medium text-mist-100"
          )}
        >
          {title}
        </span>
        {!done && <span className="block truncate text-xs text-mist-500">{hint}</span>}
      </span>

      {!done &&
        (isNav ? (
          <ArrowRight className="h-4 w-4 shrink-0 text-mist-600" />
        ) : (
          <span className="shrink-0 text-[11px] text-mist-600">tap to log</span>
        ))}
    </button>
  );
}
