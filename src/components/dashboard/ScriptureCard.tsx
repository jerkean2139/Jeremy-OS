"use client";

import Link from "next/link";
import { BookOpen, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { clampDay, readingLabel, PLAN_DAYS } from "@/lib/bible";
import { todayKey } from "@/lib/utils";

// A light dashboard card for the day's reading. No network — the reference
// label is computed from the pure plan, so it's instant.
export function ScriptureCard() {
  const scripture = useStore((s) => s.scripture);
  const day = clampDay(scripture?.currentDay ?? 1);
  const readToday = scripture?.lastReadDate === todayKey();
  const label = readingLabel(day);

  return (
    <Link
      href="/scripture"
      className="flex items-center gap-3 rounded-2xl border border-ink-700/60 bg-gradient-to-br from-sky-500/10 to-sage-500/5 p-4 transition-colors hover:border-ink-600"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800/70">
        {readToday ? (
          <Check className="h-5 w-5 text-sage-400" />
        ) : (
          <BookOpen className="h-5 w-5 text-sky-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-mist-100">Daily Word</div>
        <div className="truncate text-xs text-mist-500">
          {readToday ? "Read today · " : ""}
          {label} · Day {day}/{PLAN_DAYS}
        </div>
      </div>
    </Link>
  );
}
