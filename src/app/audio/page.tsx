"use client";

import { Headphones, Music4, Waves, Info } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store";
import { EightDPanel } from "@/components/audio/EightDPanel";
import { BinauralPanel } from "@/components/audio/BinauralPanel";
import { cn } from "@/lib/utils";

export default function AudioPage() {
  return (
    <HydrationGate>
      <AudioTab />
    </HydrationGate>
  );
}

function AudioTab() {
  const mode = useStore((s) => s.audioMode) ?? "8d";
  const setMode = useStore((s) => s.setAudioMode);
  const acked = useStore((s) => s.audioHeadphoneAck);
  const ack = useStore((s) => s.ackAudioHeadphones);

  return (
    <div>
      <PageHeader title="Audio" subtitle="Focus & calm, in your ears" back="/" />

      {!acked && (
        <Card className="mb-5 border-sky-500/25 bg-sky-500/5">
          <CardContent className="flex items-start gap-3 pt-5">
            <Headphones className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
            <div className="space-y-2">
              <p className="text-sm text-mist-200">
                Use headphones. Both modes rely on true left/right separation — they
                don&apos;t work on a single speaker.
              </p>
              <Button variant="soft" size="sm" onClick={ack}>
                Got it
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mode selector */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <ModeCard
          active={mode === "8d"}
          onClick={() => setMode("8d")}
          icon={<Music4 className="h-5 w-5" />}
          title="8D Audio"
          sub="Spin a track around your head"
        />
        <ModeCard
          active={mode === "binaural"}
          onClick={() => setMode("binaural")}
          icon={<Waves className="h-5 w-5" />}
          title="Binaural Beats"
          sub="Two tones, one felt beat"
        />
      </div>

      {mode === "8d" ? <EightDPanel /> : <BinauralPanel />}

      {/* Honest framing */}
      <div className="mt-6 flex items-start gap-2 px-1 text-xs leading-relaxed text-mist-600">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Many people find these helpful for focus or relaxation. Results vary, and this
          isn&apos;t a medical treatment — it doesn&apos;t diagnose, treat, or cure any condition.
        </p>
      </div>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-2xl border p-4 text-left transition-colors",
        active
          ? "border-sage-500/50 bg-sage-500/10"
          : "border-ink-700 hover:border-ink-600"
      )}
    >
      <div className={cn("mb-2", active ? "text-sage-400" : "text-mist-400")}>{icon}</div>
      <div className="text-sm font-medium text-mist-100">{title}</div>
      <div className="mt-0.5 text-[11px] text-mist-500">{sub}</div>
    </button>
  );
}
