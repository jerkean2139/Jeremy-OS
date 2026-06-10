"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Trash2, Brain, Plus, X, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AiStatusLine } from "@/components/AiStatusLine";
import { HydrationGate } from "@/components/HydrationGate";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store";
import { buildCoachContext } from "@/lib/coach-context";
import { askCoach } from "@/lib/ai-client";
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
  "How are my habits shaping who I'm becoming?",
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
  const identity = useStore((s) => s.identity);
  const habits = useStore((s) => s.habits);
  const scorecard = useStore((s) => s.scorecard);
  const scripture = useStore((s) => s.scripture);
  const coachMemory = useStore((s) => s.coachMemory);
  const addCoachMemory = useStore((s) => s.addCoachMemory);
  const removeCoachMemory = useStore((s) => s.removeCoachMemory);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [newMemory, setNewMemory] = useState("");
  const [learning, setLearning] = useState(false);
  const [memoryNote, setMemoryNote] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, thinking]);

  const buildContext = () =>
    buildCoachContext({
      days,
      elevatorLogs,
      theaterLogs,
      pulseLogs,
      identity,
      habits: habits ?? [],
      scorecard: scorecard ?? [],
      scripture,
    });

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
      const data = await askCoach(
        {
          mode: "chat",
          messages: priorMessages.slice(-10),
          context: buildContext(),
          memory: coachMemory,
        },
        "coach"
      );
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

  const addMemory = () => {
    const n = newMemory.trim();
    if (!n) return;
    addCoachMemory(n);
    setNewMemory("");
  };

  // Ask the coach to distill durable facts from the conversation into memory.
  const learnFromChat = async () => {
    if (learning || history.length === 0) return;
    setLearning(true);
    setMemoryNote(null);
    try {
      const data = await askCoach(
        {
          mode: "memory",
          messages: history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
          context: buildContext(),
          memory: coachMemory,
        },
        "memory"
      );
      const lines = String(data.reply ?? "")
        .split("\n")
        .map((l) => l.replace(/^[-*•\d.\s]+/, "").trim())
        .filter(Boolean);
      if (lines.length === 0) {
        setMemoryNote("Learning from chat needs the AI coach (no key configured). You can add notes by hand.");
      } else {
        lines.forEach((l) => addCoachMemory(l));
        setMemoryOpen(true);
      }
    } catch {
      setMemoryNote("Couldn't reach the coach just now.");
    } finally {
      setLearning(false);
    }
  };

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col">
      <div className="flex items-start justify-between">
        <PageHeader
          title="Recovery Coach"
          subtitle="A mirror and a strategist. Not a therapist."
        />
        <div className="mt-1 flex items-center gap-1">
          <button
            onClick={() => setMemoryOpen((o) => !o)}
            className={cn(
              "relative rounded-full p-2 hover:text-mist-100",
              memoryOpen ? "text-sage-400" : "text-mist-500"
            )}
            aria-label="Coach memory"
          >
            <Brain className="h-4 w-4" />
            {coachMemory.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sage-500/90 px-1 text-[9px] font-semibold text-ink-950">
                {coachMemory.length}
              </span>
            )}
          </button>
          {history.length > 0 && (
            <button
              onClick={clearCoach}
              className="rounded-full p-2 text-mist-500 hover:text-ember-400"
              aria-label="Clear conversation"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <AiStatusLine className="mb-3" />

      {memoryOpen && (
        <div className="mb-3 rounded-2xl border border-ink-700/60 bg-ink-850/70 p-4">
          <div className="mb-2 flex items-center gap-2 text-sage-400">
            <Brain className="h-4 w-4" />
            <span className="text-sm font-medium">Coach remembers</span>
          </div>
          <p className="mb-3 text-xs text-mist-500">
            Durable facts the coach carries into every reply. Edit anytime.
          </p>

          {coachMemory.length > 0 ? (
            <ul className="mb-3 space-y-1.5">
              {coachMemory.map((m, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-lg border border-ink-700/50 bg-ink-900/40 px-3 py-2 text-sm text-mist-200"
                >
                  <span className="mt-0.5 text-sage-500">•</span>
                  <span className="min-w-0 flex-1">{m}</span>
                  <button
                    onClick={() => removeCoachMemory(i)}
                    className="rounded-full p-0.5 text-mist-600 hover:text-ember-400"
                    aria-label="Forget this"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-sm text-mist-500">Nothing yet. Add a note or learn from a chat.</p>
          )}

          <div className="flex items-center gap-2">
            <input
              value={newMemory}
              onChange={(e) => setNewMemory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addMemory();
                }
              }}
              placeholder="Add something to remember…"
              className="flex-1 rounded-xl border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-mist-50 placeholder:text-mist-500 focus:border-sage-500/50 focus:outline-none"
            />
            <button
              onClick={addMemory}
              disabled={!newMemory.trim()}
              className="rounded-xl bg-ink-700/70 p-2 text-mist-100 hover:bg-ink-600 disabled:opacity-40"
              aria-label="Add memory"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={learnFromChat}
            disabled={learning || history.length === 0}
            className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 disabled:opacity-40"
          >
            <Wand2 className="h-3.5 w-3.5" />
            {learning ? "Learning…" : "Learn from this chat"}
          </button>
          {memoryNote && <p className="mt-2 text-xs text-mist-500">{memoryNote}</p>}
        </div>
      )}

      <div ref={scrollRef} className="no-scrollbar flex-1 space-y-3 overflow-y-auto pb-4">
        {history.length === 0 && (
          <div className="rounded-2xl border border-ink-700/60 bg-ink-850/70 p-5">
            <div className="mb-3 flex items-center gap-2 text-sage-400">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Start with what&apos;s true.</span>
            </div>
            <p className="text-sm text-mist-400">
              I read your last two weeks — pressure, Elevator, Theater, sleep — plus your
              habits, votes, scorecard, and identity. I coach systems, not willpower. Ask me
              anything.
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
