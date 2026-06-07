"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sunrise,
  Check,
  Play,
  Pause,
  SkipForward,
  Footprints,
  Wind,
  Volume2,
  ArrowRight,
  Clock,
  BookOpen,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { VoiceField } from "@/components/VoiceField";
import { VoiceChat } from "@/components/VoiceChat";
import { SlackBriefing } from "@/components/SlackBriefing";
import { ScriptureReader } from "@/components/ScriptureReader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store";
import { useSpeech } from "@/hooks/useSpeech";
import {
  STRETCH_SEQUENCE,
  STRETCH_TOTAL_SEC,
  WALK_MIN_SEC,
  WALK_MAX_SEC,
  WALK_PROMPTS,
  fmtClock,
} from "@/lib/routine";
import { calcElevatorFreeStreak } from "@/lib/analytics";
import { clampDay } from "@/lib/bible";
import { cn, todayKey } from "@/lib/utils";

type Step = "intro" | "checkin" | "stretch" | "walk" | "read" | "complete";

// A soft suggested reading length — finishable early, extendable. Calm, not enforced.
const READ_SEC = 12 * 60;

export default function RoutinePage() {
  return (
    <HydrationGate>
      <Ritual />
    </HydrationGate>
  );
}

function Ritual() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [stretchSec, setStretchSec] = useState(0);
  const [walkSec, setWalkSec] = useState(0);
  const [steps, setSteps] = useState<number | undefined>(undefined);

  const begin = () => {
    setStartedAt(Date.now());
    setStep("checkin");
  };

  return (
    <div>
      <PageHeader title="Morning Ritual" subtitle="6am → at the computer by 7am." back="/" />
      {startedAt && step !== "intro" && <RitualPill startedAt={startedAt} step={step} />}

      {step === "intro" && <Intro onStart={begin} />}
      {step === "checkin" && <CheckinStep onDone={() => setStep("stretch")} />}
      {step === "stretch" && (
        <StretchStep
          onDone={(sec) => {
            setStretchSec(sec);
            setStep("walk");
          }}
        />
      )}
      {step === "walk" && (
        <WalkStep
          onDone={(sec, s) => {
            setWalkSec(sec);
            setSteps(s);
            setStep("read");
          }}
        />
      )}
      {step === "read" && <ReadStep onDone={() => setStep("complete")} />}
      {step === "complete" && (
        <CompleteStep
          totalSec={startedAt ? Math.round((Date.now() - startedAt) / 1000) : stretchSec + walkSec}
          stretchSec={stretchSec}
          walkSec={walkSec}
          steps={steps}
          onDone={() => router.push("/")}
        />
      )}
    </div>
  );
}

// --- Live master timer ---
function RitualPill({ startedAt, step }: { startedAt: number; step: Step }) {
  const [, force] = useState(0);
  useEffect(() => {
    if (step === "complete") return;
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [step]);
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  const over = elapsed > 60 * 60;
  return (
    <div className="mb-4 flex items-center justify-center gap-2 text-sm">
      <Clock className={cn("h-4 w-4", over ? "text-ember-400" : "text-sage-400")} />
      <span className={cn("tabular-nums font-medium", over ? "text-ember-400" : "text-mist-300")}>
        {fmtClock(elapsed)}
      </span>
      <span className="text-mist-600">/ 60:00</span>
    </div>
  );
}

// --- Step 0: Intro ---
function Intro({ onStart }: { onStart: () => void }) {
  const parts = [
    { icon: Sunrise, label: "Check-in", detail: "Set the tone, voice-first" },
    { icon: Wind, label: "Stretch", detail: "5 minutes, guided" },
    { icon: Footprints, label: "Walk", detail: "30–45 minutes" },
    { icon: BookOpen, label: "Read", detail: "Daily Word — 10–15 minutes" },
  ];
  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-4 pt-5">
          {parts.map((p) => (
            <div key={p.label} className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800/70">
                <p.icon className="h-5 w-5 text-sage-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-mist-100">{p.label}</div>
                <div className="text-xs text-mist-500">{p.detail}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <p className="px-1 text-center text-sm text-mist-500">
        One calm hour or so. We&apos;ll time it together and log everything at the end.
      </p>
      <Button size="lg" className="w-full" onClick={onStart}>
        <Play className="h-5 w-5" /> Start ritual
      </Button>
    </div>
  );
}

// --- Step 1: Check-in (reuses the morning data model) ---
function CheckinStep({ onDone }: { onDone: () => void }) {
  const existing = useStore((s) => s.getDay().morning);
  const saveMorning = useStore((s) => s.saveMorning);
  const memory = useStore((s) => s.coachMemory);
  const elevatorLogs = useStore((s) => s.elevatorLogs);

  const [whatIsTrue, setWhatIsTrue] = useState(existing?.whatIsTrue ?? "");
  const [mountain, setMountain] = useState(existing?.mountain ?? "");
  const [pressure, setPressure] = useState(existing?.pressure ?? "");
  const [win, setWin] = useState(existing?.win ?? "");

  const streak = useMemo(() => calcElevatorFreeStreak(elevatorLogs), [elevatorLogs]);
  const context = `Morning ritual check-in. Elevator-free streak: ${streak} days.${
    mountain ? ` Today's mountain: ${mountain}.` : ""
  }${pressure ? ` Pressure: ${pressure}.` : ""}`;

  const next = () => {
    const combined = `What is true: ${whatIsTrue}\nMountain: ${mountain}\nPressure: ${pressure}\nWin: ${win}`;
    saveMorning({
      whatIsTrue,
      mountain,
      pressure,
      win,
      voiceTranscript: combined,
      completedAt: new Date().toISOString(),
    });
    onDone();
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-5 pt-5">
          <VoiceField label="What is true today?" placeholder="Say what's real right now…" value={whatIsTrue} onChange={setWhatIsTrue} />
          <VoiceField label="What mountain are we climbing?" placeholder="The one thing…" value={mountain} onChange={setMountain} rows={2} />
          <VoiceField label="What is creating pressure?" placeholder="Name the weight…" value={pressure} onChange={setPressure} />
          <VoiceField label="What would make today a win?" placeholder="Define the win…" value={win} onChange={setWin} />
        </CardContent>
      </Card>

      <VoiceChat context={context} memory={memory} />

      <Button size="lg" className="w-full" onClick={next}>
        Next: stretch <ArrowRight className="h-5 w-5" />
      </Button>
    </div>
  );
}

// --- Step 2: Guided stretch ---
function StretchStep({ onDone }: { onDone: (sec: number) => void }) {
  const { speak, cancel } = useSpeech();
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(STRETCH_SEQUENCE[0].sec);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const spentRef = useRef(0);

  const move = STRETCH_SEQUENCE[idx];

  // Reset the countdown + announce each move as it begins.
  useEffect(() => {
    setLeft(STRETCH_SEQUENCE[idx].sec);
    speak(`${STRETCH_SEQUENCE[idx].name}. ${STRETCH_SEQUENCE[idx].cue}`);
    return () => cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  useEffect(() => {
    if (paused || done) return;
    const id = setInterval(() => {
      spentRef.current += 1;
      setLeft((l) => {
        if (l > 1) return l - 1;
        setIdx((i) => {
          if (i + 1 >= STRETCH_SEQUENCE.length) {
            setDone(true);
            return i;
          }
          return i + 1;
        });
        return 0;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [paused, done]);

  const finished = done;
  const skip = () => {
    if (idx + 1 >= STRETCH_SEQUENCE.length) setDone(true);
    else setIdx(idx + 1);
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-center gap-1.5">
        {STRETCH_SEQUENCE.map((_, i) => (
          <span
            key={i}
            className={cn("h-1.5 rounded-full transition-all", i < idx ? "w-6 bg-sage-500" : i === idx ? "w-8 bg-sage-400" : "w-6 bg-ink-700")}
          />
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Wind className="h-7 w-7 text-sage-400" />
          <div className="text-xl font-semibold text-mist-50">{move.name}</div>
          <p className="max-w-xs text-sm text-mist-400">{move.cue}</p>
          <div className="mt-2 text-5xl font-semibold tabular-nums text-sage-300">{fmtClock(left)}</div>
          <div className="text-xs text-mist-500">Move {idx + 1} of {STRETCH_SEQUENCE.length}</div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="soft" size="md" className="flex-1" onClick={() => setPaused((p) => !p)}>
          {paused ? <><Play className="h-4 w-4" /> Resume</> : <><Pause className="h-4 w-4" /> Pause</>}
        </Button>
        <Button variant="soft" size="md" className="flex-1" onClick={skip}>
          <SkipForward className="h-4 w-4" /> {idx + 1 >= STRETCH_SEQUENCE.length ? "Finish" : "Skip"}
        </Button>
      </div>

      <Button size="lg" className="w-full" onClick={() => onDone(spentRef.current || STRETCH_TOTAL_SEC)}>
        {finished ? "Stretch done — start walk" : "I'm done — start walk"} <Footprints className="h-5 w-5" />
      </Button>
    </div>
  );
}

// --- Step 3: Walk ---
function WalkStep({ onDone }: { onDone: (sec: number, steps: number | undefined) => void }) {
  const { speak, cancel } = useSpeech();
  const [sec, setSec] = useState(0);
  const [paused, setPaused] = useState(false);
  const [stepsDraft, setStepsDraft] = useState("");
  const bucketRef = useRef(0);

  useEffect(() => {
    speak(WALK_PROMPTS[0]);
    return () => cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [paused]);

  // Spoken check-in every ~10 minutes.
  useEffect(() => {
    const bucket = Math.floor(sec / 600);
    if (bucket > bucketRef.current && bucket < WALK_PROMPTS.length) {
      bucketRef.current = bucket;
      speak(WALK_PROMPTS[bucket]);
    }
  }, [sec, speak]);

  const pct = Math.min(100, (sec / WALK_MAX_SEC) * 100);
  const minMarker = (WALK_MIN_SEC / WALK_MAX_SEC) * 100;
  const reachedTarget = sec >= WALK_MIN_SEC;

  const finish = () => {
    const n = stepsDraft.trim() === "" ? undefined : Number(stepsDraft);
    onDone(sec, Number.isFinite(n as number) ? n : undefined);
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Footprints className="h-7 w-7 text-sage-400" />
          <div className="text-6xl font-semibold tabular-nums text-mist-50">{fmtClock(sec)}</div>
          <div className={cn("text-sm", reachedTarget ? "text-sage-400" : "text-mist-500")}>
            {reachedTarget ? "Target reached — wrap up anytime" : "Target 30–45 min"}
          </div>
          <div className="relative mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-ink-800">
            <div className="h-full rounded-full bg-sage-500/80 transition-all" style={{ width: `${pct}%` }} />
            <span className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-mist-400" style={{ left: `${minMarker}%` }} />
          </div>
        </CardContent>
      </Card>

      <Button variant="soft" size="md" className="w-full" onClick={() => setPaused((p) => !p)}>
        {paused ? <><Play className="h-4 w-4" /> Resume walk</> : <><Pause className="h-4 w-4" /> Pause</>}
      </Button>

      <Card>
        <CardContent className="pt-5">
          <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
            Steps walked (from Oura / Apple Health)
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={stepsDraft}
            onChange={(e) => setStepsDraft(e.target.value)}
            placeholder="e.g. 4200"
            className="mt-2 w-full bg-transparent text-2xl font-semibold tabular-nums text-mist-50 placeholder:text-mist-600 focus:outline-none"
          />
        </CardContent>
      </Card>

      <Button size="lg" className="w-full" onClick={finish}>
        <Check className="h-5 w-5" /> Finish walk
      </Button>
    </div>
  );
}

// --- Step 3.5: Daily Word — read for 10-15 min, soft timer ---
function ReadStep({ onDone }: { onDone: () => void }) {
  const { cancel } = useSpeech();
  const scripture = useStore((s) => s.scripture);
  const markScriptureRead = useStore((s) => s.markScriptureRead);

  const day = clampDay(scripture?.currentDay ?? 1);
  const alreadyReadToday = scripture?.lastReadDate === todayKey();

  const [left, setLeft] = useState(READ_SEC);
  const [paused, setPaused] = useState(false);

  // No spoken cue here — reading is quiet. Make sure nothing's still talking.
  useEffect(() => {
    cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setLeft((l) => (l > 0 ? l - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [paused]);

  const finish = () => {
    // Count it once per day; advances the plan to tomorrow's reading.
    if (!alreadyReadToday) markScriptureRead();
    onDone();
  };

  const done = left === 0;

  return (
    <div className="space-y-5">
      {/* Soft reading timer */}
      <div className="flex items-center justify-center gap-2 text-sm">
        <BookOpen className={cn("h-4 w-4", done ? "text-sage-400" : "text-sky-400")} />
        <span className={cn("tabular-nums font-medium", done ? "text-sage-400" : "text-mist-300")}>
          {fmtClock(left)}
        </span>
        <span className="text-mist-600">{done ? "· take your time" : "reading time"}</span>
      </div>

      <ScriptureReader day={day} />

      <div className="flex gap-3">
        <Button variant="soft" size="md" className="flex-1" onClick={() => setPaused((p) => !p)}>
          {paused ? (
            <>
              <Play className="h-4 w-4" /> Resume
            </>
          ) : (
            <>
              <Pause className="h-4 w-4" /> Pause
            </>
          )}
        </Button>
        <Button
          variant="soft"
          size="md"
          className="flex-1"
          onClick={() => setLeft((l) => l + 5 * 60)}
        >
          <Plus className="h-4 w-4" /> 5 min
        </Button>
      </div>

      <Button size="lg" className="w-full" onClick={finish}>
        <Check className="h-5 w-5" /> Done reading — briefing
      </Button>
    </div>
  );
}

// --- Step 4: Complete + spoken briefing ---
function CompleteStep({
  totalSec,
  stretchSec,
  walkSec,
  steps,
  onDone,
}: {
  totalSec: number;
  stretchSec: number;
  walkSec: number;
  steps: number | undefined;
  onDone: () => void;
}) {
  const { speak } = useSpeech();
  const day = useStore((s) => s.getDay());
  const updateDay = useStore((s) => s.updateDay);
  const savedRef = useRef(false);

  const mountain = day.morning?.mountain?.trim() || day.mountain?.trim();
  const win = day.morning?.win?.trim();

  // Save the ritual + steps once, and read the briefing aloud.
  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    updateDay({
      routine: {
        completedAt: new Date().toISOString(),
        totalSec,
        stretchSec,
        walkSec,
      },
      ...(steps != null ? { steps } : {}),
    });
    const briefing = [
      "Ritual complete. Body's awake, mind's clear.",
      mountain ? `Today's mountain: ${mountain}.` : "Name your one mountain.",
      win ? `A win looks like: ${win}.` : "",
      "It's time. Head to the computer and move it.",
    ]
      .filter(Boolean)
      .join(" ");
    speak(briefing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recap = [
    { label: "Total", value: fmtClock(totalSec) },
    { label: "Stretch", value: fmtClock(stretchSec) },
    { label: "Walk", value: fmtClock(walkSec) },
    { label: "Steps", value: steps != null ? steps.toLocaleString() : "—" },
  ];

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sage-500/20">
            <Check className="h-7 w-7 text-sage-400" />
          </div>
          <div className="text-xl font-semibold text-mist-50">Ritual complete</div>
          <p className="flex items-center gap-1.5 text-sm text-mist-400">
            <Volume2 className="h-4 w-4 animate-pulse text-sky-400" /> your briefing is playing
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {recap.map((r) => (
          <div key={r.label} className="rounded-2xl border border-ink-700/60 bg-ink-850/70 p-4">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">{r.label}</div>
            <div className="mt-1.5 text-2xl font-semibold tabular-nums text-mist-50">{r.value}</div>
          </div>
        ))}
      </div>

      {mountain && (
        <div className="rounded-2xl border border-sage-500/30 bg-sage-500/10 p-5">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-sage-400">
            Today&apos;s mountain
          </div>
          <p className="text-mist-100">{mountain}</p>
        </div>
      )}

      {/* Start here: a calm triage of Slack before the noise pulls you in. */}
      <div>
        <div className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
          Start here
        </div>
        <SlackBriefing />
      </div>

      <Button size="lg" className="w-full" onClick={onDone}>
        At the computer — let&apos;s go <ArrowRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
