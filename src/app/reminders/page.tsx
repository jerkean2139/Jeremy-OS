"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Sunrise, Moon, Timer, Send, Check, Repeat } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store";
import {
  pushSupported,
  isSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestPush,
} from "@/lib/push";
import { cn } from "@/lib/utils";

export default function RemindersPage() {
  return (
    <HydrationGate>
      <Reminders />
    </HydrationGate>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-7 w-12 rounded-full transition-colors",
        on ? "bg-sage-500" : "bg-ink-600"
      )}
      role="switch"
      aria-checked={on}
    >
      <span
        className={cn(
          "absolute top-1 h-5 w-5 rounded-full bg-mist-50 transition-transform",
          on ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-1.5 text-mist-50 focus:border-sage-500/50 focus:outline-none"
    />
  );
}

function Reminders() {
  const reminders = useStore((s) => s.reminders);
  const setReminders = useStore((s) => s.setReminders);

  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tested, setTested] = useState<string | null>(null);

  useEffect(() => {
    setSupported(pushSupported());
    isSubscribed().then(setSubscribed);
  }, []);

  const enablePush = async () => {
    setBusy(true);
    const ok = await subscribeToPush();
    setSubscribed(ok);
    setReminders({ pushEnabled: ok });
    setBusy(false);
  };

  const disablePush = async () => {
    setBusy(true);
    await unsubscribeFromPush();
    setSubscribed(false);
    setReminders({ pushEnabled: false });
    setBusy(false);
  };

  const test = async () => {
    setTested("sending");
    const n = await sendTestPush();
    setTested(n > 0 ? `Sent to ${n} device${n === 1 ? "" : "s"}` : "No devices / not configured");
    setTimeout(() => setTested(null), 3000);
  };

  return (
    <div>
      <PageHeader
        title="Reminders"
        subtitle="Gentle nudges, even when the app is closed."
        back="/"
      />

      {/* Master push toggle */}
      <Card className="mb-5">
        <CardContent className="pt-5">
          {!supported ? (
            <p className="text-sm text-mist-400">
              Push isn&apos;t available here. On iPhone, install Jeremy OS to your Home
              Screen first (Share → Add to Home Screen), then open it and return here.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {subscribed ? (
                    <Bell className="h-5 w-5 text-sage-400" />
                  ) : (
                    <BellOff className="h-5 w-5 text-mist-400" />
                  )}
                  <div>
                    <div className="text-sm font-medium text-mist-100">
                      Background notifications
                    </div>
                    <div className="text-xs text-mist-500">
                      {subscribed ? "This device is subscribed" : "Off"}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={subscribed ? "outline" : "primary"}
                  onClick={subscribed ? disablePush : enablePush}
                  disabled={busy}
                >
                  {busy ? "…" : subscribed ? "Turn off" : "Enable"}
                </Button>
              </div>
              {subscribed && (
                <button
                  onClick={test}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm text-mist-400 hover:text-mist-100"
                >
                  <Send className="h-3.5 w-3.5" />
                  {tested ?? "Send a test notification"}
                </button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Schedules */}
      <div className={cn("space-y-4", !subscribed && "pointer-events-none opacity-50")}>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sunrise className="h-5 w-5 text-ember-400" />
                <span className="text-sm font-medium text-mist-100">Morning check-in</span>
              </div>
              <Toggle
                on={reminders.morning.enabled}
                onChange={(v) => setReminders({ morning: { ...reminders.morning, enabled: v } })}
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-mist-400">Remind me at</span>
              <TimeInput
                value={reminders.morning.time}
                onChange={(t) => setReminders({ morning: { ...reminders.morning, time: t } })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5 text-sky-400" />
                <span className="text-sm font-medium text-mist-100">Evening reflection</span>
              </div>
              <Toggle
                on={reminders.reflection.enabled}
                onChange={(v) =>
                  setReminders({ reflection: { ...reminders.reflection, enabled: v } })
                }
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-mist-400">Remind me at</span>
              <TimeInput
                value={reminders.reflection.time}
                onChange={(t) =>
                  setReminders({ reflection: { ...reminders.reflection, time: t } })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Timer className="h-5 w-5 text-sage-400" />
                <span className="text-sm font-medium text-mist-100">Pulse nudges</span>
              </div>
              <Toggle
                on={reminders.pulse.enabled}
                onChange={(v) => setReminders({ pulse: { ...reminders.pulse, enabled: v } })}
              />
            </div>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-mist-400">Every</span>
                <div className="flex gap-2">
                  {[15, 30, 60].map((m) => (
                    <button
                      key={m}
                      onClick={() => setReminders({ pulse: { ...reminders.pulse, cadenceMin: m } })}
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm transition-colors",
                        reminders.pulse.cadenceMin === m
                          ? "border-sage-500 bg-sage-500/15 text-sage-400"
                          : "border-ink-600 bg-ink-800/50 text-mist-400"
                      )}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-mist-400">Active window</span>
                <div className="flex items-center gap-2">
                  <TimeInput
                    value={reminders.pulse.startTime}
                    onChange={(t) => setReminders({ pulse: { ...reminders.pulse, startTime: t } })}
                  />
                  <span className="text-mist-500">–</span>
                  <TimeInput
                    value={reminders.pulse.endTime}
                    onChange={(t) => setReminders({ pulse: { ...reminders.pulse, endTime: t } })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Repeat className="h-5 w-5 text-sage-400" />
                <span className="text-sm font-medium text-mist-100">Habit nudge</span>
              </div>
              <Toggle
                on={reminders.habits?.enabled ?? false}
                onChange={(v) =>
                  setReminders({ habits: { ...(reminders.habits ?? { time: "12:00" }), enabled: v } })
                }
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-mist-400">Remind me at</span>
              <TimeInput
                value={reminders.habits?.time ?? "12:00"}
                onChange={(t) =>
                  setReminders({ habits: { ...(reminders.habits ?? { enabled: true }), time: t } })
                }
              />
            </div>
            <p className="mt-3 text-xs text-mist-500">
              Only fires if a habit&apos;s still undone — and leads with its two-minute version.
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-mist-500">
        <Check className="h-3.5 w-3.5 text-sage-400" />
        Schedules sync to your account and run server-side.
      </p>
    </div>
  );
}
