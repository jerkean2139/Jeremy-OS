"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Check,
  Flame,
  Pencil,
  Archive,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  X,
  RotateCcw,
  Target,
  ListChecks,
  Link2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store";
import type { Habit, HabitKind, HabitLaws } from "@/lib/types";
import {
  activeHabits,
  habitDoneToday,
  habitStreak,
  missState,
  habitRecipe,
  persistenceNote,
} from "@/lib/habits";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-lg border border-ink-700 bg-ink-900/70 px-3 py-2 text-sm text-mist-50 placeholder:text-mist-600 focus:border-sage-500/50 focus:outline-none";

const LAW_FIELDS: Record<HabitKind, { key: keyof HabitLaws; label: string; hint: string }[]> = {
  build: [
    { key: "obvious", label: "1 · Make it obvious", hint: "The cue — when & where will it happen?" },
    { key: "attractive", label: "2 · Make it attractive", hint: "Pair it with something you enjoy" },
    { key: "easy", label: "3 · Make it easy", hint: "Reduce friction; shrink the first step" },
    { key: "satisfying", label: "4 · Make it satisfying", hint: "Give it an immediate reward" },
  ],
  break: [
    { key: "obvious", label: "1 · Make it invisible", hint: "Remove the cue from your environment" },
    { key: "attractive", label: "2 · Make it unattractive", hint: "Reframe it; see the real cost" },
    { key: "easy", label: "3 · Make it difficult", hint: "Add friction between you and it" },
    { key: "satisfying", label: "4 · Make it unsatisfying", hint: "Make the cost visible / accountable" },
  ],
};

export default function HabitsPage() {
  return (
    <HydrationGate>
      <Habits />
    </HydrationGate>
  );
}

function Habits() {
  const habits = useStore((s) => s.habits);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);

  const active = useMemo(() => activeHabits(habits ?? []), [habits]);
  const build = active.filter((h) => h.kind === "build");
  const breakers = active.filter((h) => h.kind === "break");
  const maxStreak = active.reduce((m, h) => Math.max(m, habitStreak(h)), 0);
  const persistence = persistenceNote(maxStreak);

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (h: Habit) => {
    setEditing(h);
    setEditorOpen(true);
  };

  return (
    <div>
      <PageHeader title="Habits" subtitle="Tiny votes for who you're becoming" back="/" />

      {editorOpen ? (
        <HabitEditor habit={editing} onClose={() => setEditorOpen(false)} />
      ) : (
        <>
          <p className="mb-4 rounded-xl border border-sage-500/20 bg-sage-500/5 px-4 py-3 text-sm leading-relaxed text-mist-300">
            You don&apos;t rise to your goals, you fall to your systems. Design each habit with the
            four laws — then let small reps compound. <span className="text-mist-400">Never miss twice.</span>
          </p>

          <Link
            href="/scorecard"
            className="mb-5 flex items-center gap-3 rounded-2xl border border-ink-700/60 bg-ink-850/70 p-4 transition-colors hover:border-ink-600 hover:bg-ink-800"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800/70">
              <ListChecks className="h-5 w-5 text-sky-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-mist-100">Habit Scorecard</div>
              <div className="text-xs text-mist-500">See your current habits clearly — no judgment</div>
            </div>
          </Link>

          {persistence && (
            <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-sage-500/25 bg-sage-500/5 p-4">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-sage-400" />
              <p className="text-sm leading-relaxed text-mist-200">{persistence}</p>
            </div>
          )}

          {active.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <Target className="h-7 w-7 text-sage-400" />
                <div className="text-mist-200">No habits yet.</div>
                <p className="max-w-xs text-sm text-mist-500">
                  Add one habit to build (or break). Make it obvious, attractive, easy, and
                  satisfying — and start with a two-minute version.
                </p>
                <Button className="mt-1" onClick={openNew}>
                  <Plus className="h-4 w-4" /> Add your first habit
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {build.length > 0 && (
                <Section title="Building" icon={<TrendingUp className="h-4 w-4 text-sage-400" />}>
                  {build.map((h) => (
                    <HabitRow key={h.id} habit={h} onEdit={() => openEdit(h)} />
                  ))}
                </Section>
              )}
              {breakers.length > 0 && (
                <Section title="Breaking" icon={<TrendingDown className="h-4 w-4 text-ember-400" />}>
                  {breakers.map((h) => (
                    <HabitRow key={h.id} habit={h} onEdit={() => openEdit(h)} />
                  ))}
                </Section>
              )}

              <Button variant="soft" className="w-full" onClick={openNew}>
                <Plus className="h-4 w-4" /> Add a habit
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
        {icon} {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function HabitRow({ habit, onEdit }: { habit: Habit; onEdit: () => void }) {
  const toggle = useStore((s) => s.toggleHabitDay);
  const archive = useStore((s) => s.archiveHabit);
  const [open, setOpen] = useState(false);

  const isBuild = habit.kind === "build";
  const markedToday = habitDoneToday(habit);
  const streak = habitStreak(habit);
  const miss = missState(habit);

  const laws = LAW_FIELDS[habit.kind].filter((f) => habit.laws[f.key]);
  const recipe = habitRecipe(habit);
  const hasDetail =
    laws.length > 0 ||
    habit.twoMinute ||
    !!recipe ||
    !!habit.stakes ||
    !!habit.accountablePartner;

  const streakLabel = isBuild
    ? `${streak} day${streak === 1 ? "" : "s"} strong`
    : `${streak} day${streak === 1 ? "" : "s"} clean`;

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => toggle(habit.id)}
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors",
              isBuild
                ? markedToday
                  ? "border-sage-500/40 bg-sage-500/20 text-sage-300"
                  : "border-ink-600 text-mist-500 hover:border-sage-500/40 hover:text-sage-300"
                : markedToday
                  ? "border-ember-500/40 bg-ember-500/15 text-ember-300"
                  : "border-ink-600 text-mist-500 hover:border-ember-500/40 hover:text-ember-300"
            )}
            aria-label={isBuild ? "Mark done today" : "Log a slip today"}
          >
            {isBuild ? (
              <Check className="h-5 w-5" />
            ) : markedToday ? (
              <RotateCcw className="h-4 w-4" />
            ) : (
              <X className="h-5 w-5" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-mist-100">{habit.name}</div>
            {habit.identity && (
              <div className="text-xs italic text-sage-400/90">{habit.identity}</div>
            )}
            {recipe && (
              <div className="mt-0.5 flex items-start gap-1 text-xs text-sky-300/90">
                <Link2 className="mt-0.5 h-3 w-3 shrink-0" /> {recipe}
              </div>
            )}
            <div className="mt-1 flex items-center gap-1.5 text-xs text-mist-500">
              <Flame className={cn("h-3.5 w-3.5", streak > 0 ? "text-ember-400" : "text-mist-600")} />
              {streakLabel}
              {isBuild && markedToday && <span className="text-sage-400">· done today</span>}
              {!isBuild && markedToday && <span className="text-ember-400">· slip logged</span>}
            </div>
          </div>

          <button
            onClick={onEdit}
            className="rounded-full p-1.5 text-mist-500 hover:bg-ink-800 hover:text-mist-200"
            aria-label="Edit habit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Never miss twice */}
        {miss === "recover" && (
          <div className="rounded-lg bg-ember-500/10 px-3 py-2 text-xs text-ember-200/90">
            {isBuild
              ? "Yesterday slipped by — that's fine. Never miss twice. Do the two-minute version today."
              : "Yesterday happened, no shame. Never miss twice — today is a clean slate."}
            {habit.accountablePartner && (
              <span className="mt-1 block text-ember-300/80">
                {habit.accountablePartner} is in your corner.
              </span>
            )}
          </div>
        )}

        {hasDetail && (
          <div>
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-1 text-xs text-mist-500 hover:text-mist-300"
            >
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
              {open ? "Hide design" : "The design"}
            </button>
            {open && (
              <div className="mt-2 space-y-2 border-t border-ink-700/60 pt-3 text-sm">
                {recipe && <Detail label="Habit recipe">{recipe}</Detail>}
                {habit.twoMinute && (
                  <Detail label="Two-minute version">{habit.twoMinute}</Detail>
                )}
                {laws.map((f) => (
                  <Detail key={f.key} label={f.label}>
                    {habit.laws[f.key]}
                  </Detail>
                ))}
                {habit.stakes && <Detail label="The stakes">{habit.stakes}</Detail>}
                {habit.accountablePartner && (
                  <Detail label="Who knows">{habit.accountablePartner}</Detail>
                )}
                <button
                  onClick={() => archive(habit.id)}
                  className="mt-1 inline-flex items-center gap-1 text-xs text-mist-600 hover:text-ember-400"
                >
                  <Archive className="h-3.5 w-3.5" /> Archive habit
                </button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-mist-500">{label}</div>
      <div className="text-mist-200">{children}</div>
    </div>
  );
}

function HabitEditor({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const addHabit = useStore((s) => s.addHabit);
  const updateHabit = useStore((s) => s.updateHabit);

  const [name, setName] = useState(habit?.name ?? "");
  const [kind, setKind] = useState<HabitKind>(habit?.kind ?? "build");
  const [identity, setIdentity] = useState(habit?.identity ?? "");
  const [twoMinute, setTwoMinute] = useState(habit?.twoMinute ?? "");
  const [stackAfter, setStackAfter] = useState(habit?.stackAfter ?? "");
  const [cueTime, setCueTime] = useState(habit?.cueTime ?? "");
  const [cuePlace, setCuePlace] = useState(habit?.cuePlace ?? "");
  const [stakes, setStakes] = useState(habit?.stakes ?? "");
  const [accountablePartner, setAccountablePartner] = useState(habit?.accountablePartner ?? "");
  const [laws, setLaws] = useState<HabitLaws>(habit?.laws ?? {});

  const canSave = name.trim().length > 0;
  const recipePreview = habitRecipe({ name: name || "this", stackAfter, cueTime, cuePlace });

  const save = () => {
    if (!canSave) return;
    const fields = {
      name,
      kind,
      identity,
      twoMinute,
      stackAfter,
      cueTime,
      cuePlace,
      stakes,
      accountablePartner,
      laws,
    };
    if (habit) {
      updateHabit(habit.id, fields);
    } else {
      addHabit(fields);
    }
    onClose();
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-4 pt-5">
          {/* Build / Break */}
          <div className="grid grid-cols-2 gap-2">
            {(["build", "break"] as HabitKind[]).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition-colors",
                  kind === k
                    ? k === "build"
                      ? "border-sage-500/50 bg-sage-500/15 text-sage-200"
                      : "border-ember-500/50 bg-ember-500/15 text-ember-200"
                    : "border-ink-700 text-mist-400 hover:border-ink-600"
                )}
              >
                {k === "build" ? "Build a habit" : "Break a habit"}
              </button>
            ))}
          </div>

          <Field label="Habit">
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={kind === "build" ? "e.g. Walk every morning" : "e.g. Scrolling at night"}
            />
          </Field>

          <Field label="Identity — the kind of person who…" hint="Every rep is a vote for this">
            <input
              className={inputCls}
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder={
                kind === "build" ? "moves their body daily" : "is present and rested at night"
              }
            />
          </Field>

          <Field label="Two-minute version" hint="Scale it down so it's impossible to skip">
            <input
              className={inputCls}
              value={twoMinute}
              onChange={(e) => setTwoMinute(e.target.value)}
              placeholder={kind === "build" ? "Put on my walking shoes" : "Phone in another room"}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Habit recipe — implementation intention + stacking */}
      <Card>
        <CardContent className="space-y-4 pt-5">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
              Habit recipe
            </div>
            <div className="mb-1 text-xs text-mist-600">
              When &amp; where it happens — make the cue obvious.
            </div>
          </div>

          <Field label="After…" hint="an anchor you already do (habit stacking)">
            <input
              className={inputCls}
              value={stackAfter}
              onChange={(e) => setStackAfter(e.target.value)}
              placeholder="my morning coffee"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="At (time)">
              <input
                type="time"
                className={inputCls}
                value={cueTime}
                onChange={(e) => setCueTime(e.target.value)}
              />
            </Field>
            <Field label="In (place)">
              <input
                className={inputCls}
                value={cuePlace}
                onChange={(e) => setCuePlace(e.target.value)}
                placeholder="the kitchen"
              />
            </Field>
          </div>

          {recipePreview && (
            <p className="rounded-lg bg-sky-500/5 px-3 py-2 text-sm italic text-sky-200/90">
              {recipePreview}
            </p>
          )}
        </CardContent>
      </Card>

      {/* The four laws */}
      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
            The four laws {kind === "break" ? "(inverted)" : ""}
          </div>
          {LAW_FIELDS[kind].map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint}>
              <textarea
                className={cn(inputCls, "resize-none")}
                rows={2}
                value={laws[f.key] ?? ""}
                onChange={(e) => setLaws((l) => ({ ...l, [f.key]: e.target.value }))}
              />
            </Field>
          ))}
        </CardContent>
      </Card>

      {/* Accountability — make it unsatisfying to miss */}
      <Card>
        <CardContent className="space-y-4 pt-5">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
              Accountability
            </div>
            <div className="mb-1 text-xs text-mist-600">
              Add a cost and a witness — make it unsatisfying to miss.
            </div>
          </div>

          <Field label="The stakes" hint="what missing costs you">
            <input
              className={inputCls}
              value={stakes}
              onChange={(e) => setStakes(e.target.value)}
              placeholder="$20 to charity, no coffee tomorrow…"
            />
          </Field>

          <Field label="Who knows" hint="someone you've told / who's watching">
            <input
              className={inputCls}
              value={accountablePartner}
              onChange={(e) => setAccountablePartner(e.target.value)}
              placeholder="my wife, my coach…"
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="soft" size="lg" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button size="lg" className="flex-1" disabled={!canSave} onClick={save}>
          <Check className="h-5 w-5" /> {habit ? "Save" : "Add habit"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-mist-500">
        {label}
      </label>
      {hint && <div className="mb-1 text-xs text-mist-600">{hint}</div>}
      <div className={hint ? "" : "mt-1"}>{children}</div>
    </div>
  );
}
