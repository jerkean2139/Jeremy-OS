"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Mountain, Sparkles, Sunrise, Check, ArrowRight, Repeat } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { MISSION_STATEMENT, DEFAULT_IDENTITY } from "@/lib/codewords";
import { pushSupported, subscribeToPush } from "@/lib/push";
import { cn } from "@/lib/utils";

// First-run setup: a calm, four-step welcome shown once on a fresh install.
// Mounted globally; it renders only after hydration, only when onboarding
// hasn't been completed, and never over the passcode/unlock screen.
const STEPS = [0, 1, 2, 3];

export function Onboarding() {
  const pathname = usePathname();
  const hydrated = useStore((s) => s._hydrated);
  const onboardedAt = useStore((s) => s.onboardedAt);
  const identity = useStore((s) => s.identity);
  const setIdentity = useStore((s) => s.setIdentity);
  const setReminders = useStore((s) => s.setReminders);
  const reminders = useStore((s) => s.reminders);
  const addHabit = useStore((s) => s.addHabit);
  const completeOnboarding = useStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);
  const [lines, setLines] = useState("");
  const [habitName, setHabitName] = useState("");
  const [habitIdentity, setHabitIdentity] = useState("");
  const [habitAdded, setHabitAdded] = useState(false);
  const [time, setTime] = useState(reminders.morning.time || "06:00");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [canPush, setCanPush] = useState(false);

  // Seed the editable identity once hydration brings the saved value in.
  useEffect(() => {
    if (hydrated) {
      const saved = identity.lines.filter(Boolean);
      setLines((saved.length ? saved : DEFAULT_IDENTITY).join("\n"));
      setTime(reminders.morning.time || "06:00");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => setCanPush(pushSupported()), []);

  if (!hydrated || onboardedAt || pathname === "/unlock") return null;

  const enablePush = async () => {
    setPushBusy(true);
    const ok = await subscribeToPush();
    setPushOn(ok);
    setReminders({ pushEnabled: ok || reminders.pushEnabled });
    setPushBusy(false);
  };

  const saveIdentityAndNext = () => {
    const cleaned = lines
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    setIdentity(cleaned.length ? cleaned : DEFAULT_IDENTITY);
    setStep(2);
  };

  const saveHabitAndNext = () => {
    const name = habitName.trim();
    if (name && !habitAdded) {
      addHabit({ name, kind: "build", identity: habitIdentity.trim() || undefined });
      setHabitAdded(true);
    }
    setStep(3);
  };

  const finish = () => {
    setReminders({ morning: { ...reminders.morning, enabled: true, time } });
    completeOnboarding();
  };

  const skip = () => (step >= 3 ? finish() : setStep(step + 1));

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-ink-950/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),2rem)]">
        {/* Progress dots */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-6 bg-sage-400" : "w-1.5 bg-ink-600"
              )}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-sage-500/15">
              <Mountain className="h-8 w-8 text-sage-400" />
            </div>
            <h1 className="text-2xl font-semibold text-mist-50">Welcome to Jeremy OS</h1>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-mist-400">
              A calm, private operating system for focus, identity, and daily recovery.
            </p>
            <p className="mt-6 text-base font-medium text-sage-300">{MISSION_STATEMENT}</p>
          </div>
        )}

        {step === 1 && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-5">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/15">
                <Sparkles className="h-6 w-6 text-sky-400" />
              </div>
              <h2 className="text-xl font-semibold text-mist-50">Who you are</h2>
              <p className="mt-2 text-sm leading-relaxed text-mist-400">
                A few lines you want to be reminded of. One per line — edit them to sound
                like you.
              </p>
            </div>
            <textarea
              value={lines}
              onChange={(e) => setLines(e.target.value)}
              rows={6}
              className="min-h-[9rem] w-full flex-1 resize-none rounded-2xl border border-ink-700 bg-ink-900/60 px-4 py-3 text-sm leading-relaxed text-mist-50 placeholder:text-mist-500 focus:border-sage-500/50 focus:outline-none"
              placeholder={DEFAULT_IDENTITY.join("\n")}
            />
          </div>
        )}

        {step === 2 && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-5">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sage-500/15">
                <Repeat className="h-6 w-6 text-sage-400" />
              </div>
              <h2 className="text-xl font-semibold text-mist-50">Small votes</h2>
              <p className="mt-2 text-sm leading-relaxed text-mist-400">
                You become your habits. Every small action is a vote for the person you&apos;re
                becoming — you never have to be perfect, just never miss twice. Start with one
                habit to build (you can change it anytime).
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-ink-700/60 bg-ink-850/60 p-5">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-mist-500">
                  One habit to build
                </label>
                <input
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  placeholder="e.g. Walk every morning"
                  className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-mist-50 placeholder:text-mist-600 focus:border-sage-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-mist-500">
                  A vote for the kind of person who… <span className="text-mist-600">(optional)</span>
                </label>
                <input
                  value={habitIdentity}
                  onChange={(e) => setHabitIdentity(e.target.value)}
                  placeholder="moves their body daily"
                  className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-mist-50 placeholder:text-mist-600 focus:border-sage-500/50 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-5">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-ember-500/15">
                <Sunrise className="h-6 w-6 text-ember-400" />
              </div>
              <h2 className="text-xl font-semibold text-mist-50">Daily recovery</h2>
              <p className="mt-2 text-sm leading-relaxed text-mist-400">
                A gentle nudge to start your morning ritual — even when the app is closed.
              </p>
            </div>

            <div className="space-y-4 rounded-2xl border border-ink-700/60 bg-ink-850/60 p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-mist-300">Remind me at</span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-1.5 text-mist-50 focus:border-sage-500/50 focus:outline-none"
                />
              </div>

              {canPush ? (
                <Button
                  variant={pushOn ? "outline" : "soft"}
                  className="w-full"
                  onClick={enablePush}
                  disabled={pushBusy || pushOn}
                >
                  {pushOn ? (
                    <>
                      <Check className="h-4 w-4 text-sage-400" /> Notifications on
                    </>
                  ) : pushBusy ? (
                    "…"
                  ) : (
                    "Enable background notifications"
                  )}
                </Button>
              ) : (
                <p className="text-xs leading-relaxed text-mist-500">
                  To get nudges on iPhone, install Jeremy OS to your Home Screen first
                  (Share → Add to Home Screen), then turn this on later in Reminders.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="mt-8 space-y-3">
          {step === 0 && (
            <Button size="lg" className="w-full" onClick={() => setStep(1)}>
              Begin <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {step === 1 && (
            <Button size="lg" className="w-full" onClick={saveIdentityAndNext}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {step === 2 && (
            <Button size="lg" className="w-full" onClick={saveHabitAndNext}>
              {habitName.trim() ? "Add habit & continue" : "Continue"}{" "}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {step === 3 && (
            <Button size="lg" className="w-full" onClick={finish}>
              Enter Jeremy OS
            </Button>
          )}
          {step > 0 && (
            <button
              onClick={skip}
              className="block w-full text-center text-xs text-mist-500 hover:text-mist-300"
            >
              {step === 3 ? "Skip for now" : "Skip"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
