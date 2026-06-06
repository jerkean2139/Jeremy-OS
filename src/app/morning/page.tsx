"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Check } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { VoiceField } from "@/components/VoiceField";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store";

export default function MorningPage() {
  return (
    <HydrationGate>
      <Morning />
    </HydrationGate>
  );
}

function Morning() {
  const router = useRouter();
  const existing = useStore((s) => s.getDay().morning);
  const saveMorning = useStore((s) => s.saveMorning);

  const [whatIsTrue, setWhatIsTrue] = useState(existing?.whatIsTrue ?? "");
  const [mountain, setMountain] = useState(existing?.mountain ?? "");
  const [pressure, setPressure] = useState(existing?.pressure ?? "");
  const [win, setWin] = useState(existing?.win ?? "");
  const [summary, setSummary] = useState(existing?.aiSummary ?? "");
  const [summarizing, setSummarizing] = useState(false);
  const [saved, setSaved] = useState(false);

  const combined = `What is true: ${whatIsTrue}\nMountain: ${mountain}\nPressure: ${pressure}\nWin: ${win}`;

  const generateSummary = async () => {
    setSummarizing(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "summary",
          text: combined,
        }),
      });
      const data = await res.json();
      setSummary(data.reply ?? "");
    } catch {
      setSummary(localSummary());
    } finally {
      setSummarizing(false);
    }
  };

  // Offline fallback summary if no AI is configured.
  const localSummary = () => {
    const lines = [
      whatIsTrue && `You named what's true: ${whatIsTrue.trim()}.`,
      mountain && `The mountain today is ${mountain.trim()}.`,
      pressure && `Pressure is coming from ${pressure.trim()}.`,
      win && `A win looks like: ${win.trim()}.`,
    ].filter(Boolean);
    return lines.join(" ") + " One mountain. Move it.";
  };

  const save = () => {
    saveMorning({
      whatIsTrue,
      mountain,
      pressure,
      win,
      voiceTranscript: combined,
      aiSummary: summary || localSummary(),
      completedAt: new Date().toISOString(),
    });
    setSaved(true);
    setTimeout(() => router.push("/"), 700);
  };

  return (
    <div>
      <PageHeader
        title="Morning Check-In"
        subtitle="Speak or type. Set the tone before the noise begins."
        back="/"
      />

      <div className="space-y-5">
        <Card>
          <CardContent className="space-y-5 pt-5">
            <VoiceField
              label="What is true today?"
              placeholder="Say what's real right now…"
              value={whatIsTrue}
              onChange={setWhatIsTrue}
            />
            <VoiceField
              label="What mountain are we climbing today?"
              placeholder="The one thing…"
              value={mountain}
              onChange={setMountain}
              rows={2}
            />
            <VoiceField
              label="What is creating pressure?"
              placeholder="Name the weight…"
              value={pressure}
              onChange={setPressure}
            />
            <VoiceField
              label="What would make today a win?"
              placeholder="Define the win…"
              value={win}
              onChange={setWin}
            />
          </CardContent>
        </Card>

        <Button
          variant="soft"
          size="md"
          className="w-full"
          onClick={generateSummary}
          disabled={summarizing || !combined.trim()}
        >
          <Sparkles className="h-4 w-4" />
          {summarizing ? "Reflecting…" : "Generate AI summary"}
        </Button>

        {summary && (
          <Card>
            <CardContent className="pt-5">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-sage-400">
                Today, in focus
              </p>
              <p className="text-mist-100 leading-relaxed">{summary}</p>
            </CardContent>
          </Card>
        )}

        <Button size="lg" className="w-full" onClick={save} disabled={saved}>
          {saved ? (
            <>
              <Check className="h-5 w-5" /> Saved
            </>
          ) : (
            "Begin the day"
          )}
        </Button>
      </div>
    </div>
  );
}
