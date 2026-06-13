"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Trash2, Brain, Plus, X, Wand2, Mic, CalendarPlus, Check, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AiStatusLine } from "@/components/AiStatusLine";
import { HydrationGate } from "@/components/HydrationGate";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store";
import { buildCoachContext } from "@/lib/coach-context";
import { fetchDayContext } from "@/lib/day-context";
import { askCoach } from "@/lib/ai-client";
import { useVoice } from "@/hooks/useVoice";
import { cn } from "@/lib/utils";

interface ProposedEvent {
  summary: string;
  start: string;
  end: string;
  notes?: string;
}

export default function CoachPage() {
  return (
    <HydrationGate>
      <Coach />
    </HydrationGate>
  );
}

const STARTERS = [
  "Plan my day with me.",
  "I feel overwhelmed. Help me focus.",
  "What's the one move that moves the mountain today?",
  "How are my habits shaping who I'm becoming?",
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
  // Live day context (calendar + Slack triage + Cowork briefs), loaded once.
  const [dayContext, setDayContext] = useState("");
  // Calendar blocks the coach has proposed, awaiting confirmation.
  const [proposals, setProposals] = useState<ProposedEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const voice = useVoice();

  // Stream dictation into the input box while the mic is live.
  useEffect(() => {
    if (voice.listening) setInput(voice.transcript);
  }, [voice.transcript, voice.listening]);

  const toggleMic = () => {
    if (voice.listening) {
      voice.stop();
    } else {
      voice.reset();
      setInput("");
      voice.start();
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, thinking]);

  useEffect(() => {
    fetchDayContext().then(setDayContext).catch(() => {});
  }, []);

  const buildContext = () => {
    const base = buildCoachContext({
      days,
      elevatorLogs,
      theaterLogs,
      pulseLogs,
      identity,
      habits: habits ?? [],
      scorecard: scorecard ?? [],
      scripture,
    });
    const now = `Current date/time: ${new Date().toString()}.`;
    return dayContext ? `${base}\n\n${now}\n\nTODAY (live):\n${dayContext}` : `${base}\n\n${now}`;
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || thinking) return;
    if (voice.listening) voice.stop();
    addMessage({ role: "user", content });
    setInput("");
    setProposals([]);
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
      const ev = (data.proposedEvents as ProposedEvent[] | undefined) ?? [];
      if (ev.length) setProposals(ev);
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
              I read your last two weeks plus today&apos;s calendar, Slack, and Cowork briefs. Tap the
              mic and talk — tell me what to block and when, and I&apos;ll propose it for your calendar
              (you confirm). Ask me to line up your morning around the biggest things.
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

        {proposals.length > 0 && (
          <ProposalCard events={proposals} onClear={() => setProposals([])} />
        )}

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
        {voice.supported && (
          <button
            onClick={toggleMic}
            aria-label={voice.listening ? "Stop dictation" : "Dictate"}
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-colors",
              voice.listening
                ? "border-ember-500/50 bg-ember-500/15 text-ember-300"
                : "border-ink-700 text-mist-400 hover:text-mist-100"
            )}
          >
            <Mic className={cn("h-5 w-5", voice.listening && "animate-pulse")} />
          </button>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder={voice.listening ? "Listening…" : "Say what's on your mind…"}
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

// Calendar blocks the coach proposed — confirm to create them on the calendar.
function ProposalCard({ events, onClear }: { events: ProposedEvent[]; onClear: () => void }) {
  const [state, setState] = useState<Record<number, "idle" | "busy" | "done" | "err">>({});

  const add = async (i: number, e: ProposedEvent) => {
    setState((s) => ({ ...s, [i]: "busy" }));
    try {
      const res = await fetch("/api/calendar/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: e.summary, start: e.start, end: e.end, description: e.notes }),
      });
      const ok = (await res.json()).ok === true;
      setState((s) => ({ ...s, [i]: ok ? "done" : "err" }));
    } catch {
      setState((s) => ({ ...s, [i]: "err" }));
    }
  };

  const addAll = () => events.forEach((e, i) => state[i] !== "done" && add(i, e));

  return (
    <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-sky-300">
          <CalendarClock className="h-3.5 w-3.5" /> Proposed blocks
        </div>
        <button onClick={onClear} className="text-mist-500 hover:text-mist-200" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1.5">
        {events.map((e, i) => {
          const st = state[i] ?? "idle";
          return (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-ink-900/50 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-mist-100">{e.summary}</div>
                <div className="text-[11px] text-mist-500">{fmtSlot(e.start, e.end)}</div>
              </div>
              <button
                onClick={() => add(i, e)}
                disabled={st === "busy" || st === "done"}
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                  st === "done"
                    ? "text-sage-400"
                    : st === "err"
                    ? "bg-ember-500/15 text-ember-300"
                    : "bg-sky-500/20 text-sky-200 hover:bg-sky-500/30 disabled:opacity-50"
                )}
              >
                {st === "done" ? <Check className="h-4 w-4" /> : st === "busy" ? "Adding…" : st === "err" ? "Retry" : "Add"}
              </button>
            </div>
          );
        })}
      </div>
      {events.length > 1 && (
        <button
          onClick={addAll}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-500/20 py-2 text-sm font-medium text-sky-200 hover:bg-sky-500/30"
        >
          <CalendarPlus className="h-4 w-4" /> Add all to calendar
        </button>
      )}
    </div>
  );
}

// "Sun Jun 14 · 9:00–10:30 AM" from two local ISO strings.
function fmtSlot(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime())) return `${start} → ${end}`;
  const day = s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const t = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${t(s)}–${t(e)}`;
}
