"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { Card, CardContent } from "@/components/ui/Card";
import { useStore } from "@/lib/store";
import type { ScorecardMark } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ScorecardPage() {
  return (
    <HydrationGate>
      <Scorecard />
    </HydrationGate>
  );
}

const MARKS: { value: ScorecardMark; symbol: string; label: string; cls: string; activeCls: string }[] = [
  { value: "good", symbol: "+", label: "Helps", cls: "text-sage-400", activeCls: "border-sage-500/50 bg-sage-500/15 text-sage-300" },
  { value: "neutral", symbol: "=", label: "Neutral", cls: "text-mist-400", activeCls: "border-ink-500 bg-ink-700/60 text-mist-200" },
  { value: "bad", symbol: "−", label: "Hurts", cls: "text-ember-400", activeCls: "border-ember-500/50 bg-ember-500/15 text-ember-300" },
];

function Scorecard() {
  const scorecard = useStore((s) => s.scorecard);
  const addItem = useStore((s) => s.addScorecardItem);
  const updateItem = useStore((s) => s.updateScorecardItem);
  const removeItem = useStore((s) => s.removeScorecardItem);

  const [text, setText] = useState("");
  const [mark, setMark] = useState<ScorecardMark>("neutral");

  const items = useMemo(() => scorecard ?? [], [scorecard]);
  const counts = useMemo(() => {
    const c = { good: 0, neutral: 0, bad: 0 };
    for (const i of items) c[i.mark] += 1;
    return c;
  }, [items]);

  const add = () => {
    if (!text.trim()) return;
    addItem(text, mark);
    setText("");
    setMark("neutral");
  };

  return (
    <div>
      <PageHeader title="Habit Scorecard" subtitle="Awareness, not judgment" back="/habits" />

      <p className="mb-5 rounded-xl border border-sage-500/20 bg-sage-500/5 px-4 py-3 text-sm leading-relaxed text-mist-300">
        List the things you do on a normal day, then mark each one:{" "}
        <span className="text-sage-400">+</span> helps the person you&apos;re becoming,{" "}
        <span className="text-mist-300">=</span> neutral,{" "}
        <span className="text-ember-400">−</span> works against you. No fixing yet — just see it
        clearly.
      </p>

      {/* Add a habit */}
      <Card className="mb-5">
        <CardContent className="space-y-3 pt-5">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="e.g. Check phone first thing"
            className="w-full rounded-lg border border-ink-700 bg-ink-900/70 px-3 py-2 text-sm text-mist-50 placeholder:text-mist-600 focus:border-sage-500/50 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-2">
              {MARKS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMark(m.value)}
                  className={cn(
                    "flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border text-sm transition-colors",
                    mark === m.value ? m.activeCls : "border-ink-700 text-mist-500 hover:border-ink-600"
                  )}
                >
                  <span className="text-base font-semibold">{m.symbol}</span> {m.label}
                </button>
              ))}
            </div>
            <button
              onClick={add}
              disabled={!text.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mist-50 text-ink-950 hover:bg-white disabled:opacity-40"
              aria-label="Add habit"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <ListChecks className="h-7 w-7 text-sage-400" />
            <div className="text-mist-200">Your scorecard is empty.</div>
            <p className="max-w-xs text-sm text-mist-500">
              Add the habits that make up a normal day — waking, coffee, phone, work, meals,
              evening. Awareness comes first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            <Tally symbol="+" label="Helps" value={counts.good} cls="text-sage-400" />
            <Tally symbol="=" label="Neutral" value={counts.neutral} cls="text-mist-300" />
            <Tally symbol="−" label="Hurts" value={counts.bad} cls="text-ember-400" />
          </div>

          <div className="space-y-2">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="flex gap-1.5">
                    {MARKS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => updateItem(item.id, { mark: m.value })}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md border text-sm font-semibold transition-colors",
                          item.mark === m.value
                            ? m.activeCls
                            : "border-ink-700 text-mist-600 hover:border-ink-600"
                        )}
                        aria-label={m.label}
                      >
                        {m.symbol}
                      </button>
                    ))}
                  </div>
                  <span className="flex-1 text-sm text-mist-100">{item.text}</span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="rounded-full p-1.5 text-mist-600 hover:bg-ink-800 hover:text-ember-400"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="mt-5 text-center text-xs text-mist-500">
            No good or bad habits, only effective ones. Seeing clearly is the first change.
          </p>
        </>
      )}
    </div>
  );
}

function Tally({
  symbol,
  label,
  value,
  cls,
}: {
  symbol: string;
  label: string;
  value: number;
  cls: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-700/60 bg-ink-850/70 p-3 text-center">
      <div className={cn("text-xl font-semibold", cls)}>
        {symbol} {value}
      </div>
      <div className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-mist-500">{label}</div>
    </div>
  );
}
