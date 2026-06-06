"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store";
import { buildSeries, correlations, calcElevatorFreeStreak } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export default function CoachPage() {
  return (
    <HydrationGate>
      <Coach />
    </HydrationGate>
  );
}

const STARTERS = [
  "Why do I keep taking the Elevator?",
  "I feel overwhelmed. Help me focus.",
  "What pattern do you see this week?",
  "What's my one move today?",
];

function Coach() {
  const history = useStore((s) => s.coachHistory);
  const addMessage = useStore((s) => s.addCoachMessage);
  const clearCoach = useStore((s) => s.clearCoach);
  const days = useStore((s) => s.days);
  const elevatorLogs = useStore((s) => s.elevatorLogs);
  const theaterLogs = useStore((s) => s.theaterLogs);
  const pulseLogs = useStore((s) => s.pulseLogs);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, thinking]);

  const buildContext = () => {
    const series = buildSeries(days, elevatorLogs, theaterLogs, pulseLogs, 14);
    const cors = correlations(series);
    const streak = calcElevatorFreeStreak(elevatorLogs);
    const recent = series
      .slice(-7)
      .map(
        (p) =>
          `${p.date}: pressure ${p.pressure ?? "—"}, floors ${p.floors}, acts ${p.acts}, sleep ${p.sleep ?? "—"}, focus ${p.focusPct ?? "—"}%`
      )
      .join("\n");
    const pat = cors.map((c) => `${c.label}: r=${c.value}`).join("; ");
    return `Elevator-free streak: ${streak} days.\nLast 7 days:\n${recent}\nCorrelations: ${pat || "not enough data yet"}`;
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || thinking) return;
    addMessage({ role: "user", content });
    setInput("");
    setThinking(true);

    const priorMessages = [...history, { role: "user" as const, content }].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          messages: priorMessages.slice(-10),
          context: buildContext(),
        }),
      });
      const data = await res.json();
      addMessage({ role: "assistant", content: data.reply ?? "I'm here." });
    } catch {
      addMessage({
        role: "assistant",
        content: "I'm here, even offline. What's the pressure right now, and what's the one mountain?",
      });
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col">
      <div className="flex items-start justify-between">
        <PageHeader
          title="Recovery Coach"
          subtitle="A mirror and a strategist. Not a therapist."
        />
        {history.length > 0 && (
          <button
            onClick={clearCoach}
            className="mt-1 rounded-full p-2 text-mist-500 hover:text-ember-400"
            aria-label="Clear conversation"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div ref={scrollRef} className="no-scrollbar flex-1 space-y-3 overflow-y-auto pb-4">
        {history.length === 0 && (
          <div className="rounded-2xl border border-ink-700/60 bg-ink-850/70 p-5">
            <div className="mb-3 flex items-center gap-2 text-sage-400">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Start with what&apos;s true.</span>
            </div>
            <p className="text-sm text-mist-400">
              I read your last two weeks of pressure, Elevator, Theater, and sleep to
              spot patterns. Ask me anything.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-ink-600 bg-ink-800/50 px-3 py-2 text-xs text-mist-300 hover:text-mist-100"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                m.role === "user"
                  ? "bg-mist-50 text-ink-950"
                  : "border border-ink-700/60 bg-ink-850/80 text-mist-100"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-ink-700/60 bg-ink-850/80 px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-pulse-soft rounded-full bg-mist-500" />
                <span className="h-2 w-2 animate-pulse-soft rounded-full bg-mist-500 [animation-delay:0.2s]" />
                <span className="h-2 w-2 animate-pulse-soft rounded-full bg-mist-500 [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-ink-700/60 pt-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Say what's on your mind…"
          rows={1}
          className="max-h-32 flex-1 resize-none rounded-2xl border border-ink-700 bg-ink-900/60 px-4 py-3 text-mist-50 placeholder:text-mist-500 focus:border-sage-500/50 focus:outline-none"
        />
        <Button
          size="md"
          onClick={() => send(input)}
          disabled={!input.trim() || thinking}
          className="h-12 w-12 shrink-0 rounded-2xl p-0"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
