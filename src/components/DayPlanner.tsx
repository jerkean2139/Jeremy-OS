"use client";

import { useMemo, useState } from "react";
import { Plus, X, Check, ChevronUp, ChevronDown, ListTodo } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useStore } from "@/lib/store";
import { fmtRange, type CalEvent } from "@/lib/calendar";
import { cn } from "@/lib/utils";

// Plan your day by slotting tasks into today's FIXED calendar blocks. The block
// times never move — you just shuffle what's inside each one (or the backlog).
export function DayPlanner({ date, events }: { date: string; events: CalEvent[] }) {
  const planTasks = useStore((s) => s.planTasks);
  const addPlanTask = useStore((s) => s.addPlanTask);
  const patchPlanTask = useStore((s) => s.patchPlanTask);
  const removePlanTask = useStore((s) => s.removePlanTask);
  const [draft, setDraft] = useState("");

  const tasks = useMemo(
    () => (planTasks ?? []).filter((t) => t.date === date),
    [planTasks, date]
  );

  // Blocks = today's calendar events (fixed), plus a Backlog at the end.
  const blocks = useMemo(
    () => [
      ...events.map((e) => ({ key: e.uid, label: e.summary, when: fmtRange(e) })),
      { key: "__backlog__", label: "Backlog", when: "unscheduled" },
    ],
    [events]
  );

  const tasksFor = (blockKey: string | null) =>
    tasks
      .filter((t) => (blockKey === "__backlog__" ? t.blockKey === null : t.blockKey === blockKey))
      .sort((a, b) => a.order - b.order);

  const move = (id: string, dir: -1 | 1, list: { id: string; order: number }[]) => {
    const i = list.findIndex((t) => t.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    patchPlanTask(list[i].id, { order: list[j].order });
    patchPlanTask(list[j].id, { order: list[i].order });
  };

  const add = () => {
    if (!draft.trim()) return;
    addPlanTask(date, draft);
    setDraft("");
  };

  return (
    <Card className="mb-5">
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-center gap-2 text-sm font-medium text-mist-100">
          <ListTodo className="h-4 w-4 text-sage-400" /> Plan your blocks
        </div>
        <p className="text-xs text-mist-500">
          Block times stay fixed — slot tasks into them, move things around freely.
        </p>

        {/* Quick add → goes to Backlog */}
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Add a task…"
            className="min-w-0 flex-1 rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-600 outline-none focus:border-ink-600"
          />
          <button
            onClick={add}
            disabled={!draft.trim()}
            className="shrink-0 rounded-xl bg-sage-500/20 px-3 text-sage-200 hover:bg-sage-500/30 disabled:opacity-40"
            aria-label="Add task"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {blocks.map((b) => {
            const list = tasksFor(b.key);
            const isBacklog = b.key === "__backlog__";
            if (isBacklog && list.length === 0) return null;
            return (
              <div
                key={b.key}
                className={cn(
                  "rounded-xl border p-2.5",
                  isBacklog ? "border-dashed border-ink-700/70" : "border-ink-700/60 bg-ink-900/30"
                )}
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-2 px-1">
                  <span className="truncate text-sm text-mist-200">{b.label}</span>
                  <span className="shrink-0 text-[11px] text-mist-500">{b.when}</span>
                </div>
                {list.length === 0 ? (
                  <p className="px-1 py-1 text-[11px] text-mist-600">Nothing slotted here yet.</p>
                ) : (
                  <div className="space-y-1">
                    {list.map((t, i) => (
                      <div key={t.id} className="flex items-center gap-1.5 rounded-lg bg-ink-800/50 px-2 py-1.5">
                        <button
                          onClick={() => patchPlanTask(t.id, { done: !t.done })}
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            t.done ? "border-sage-400 bg-sage-500/30 text-sage-200" : "border-ink-600"
                          )}
                          aria-label="Toggle done"
                        >
                          {t.done && <Check className="h-2.5 w-2.5" />}
                        </button>
                        <span className={cn("min-w-0 flex-1 truncate text-sm", t.done ? "text-mist-500 line-through" : "text-mist-100")}>
                          {t.text}
                        </span>
                        <div className="flex shrink-0 items-center">
                          <button onClick={() => move(t.id, -1, list)} className="p-0.5 text-mist-600 hover:text-mist-300" aria-label="Move up">
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => move(t.id, 1, list)} className="p-0.5 text-mist-600 hover:text-mist-300" aria-label="Move down">
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <select
                          value={t.blockKey ?? "__backlog__"}
                          onChange={(e) =>
                            patchPlanTask(t.id, {
                              blockKey: e.target.value === "__backlog__" ? null : e.target.value,
                            })
                          }
                          className="max-w-[6.5rem] shrink-0 rounded-md border border-ink-700 bg-ink-900 px-1 py-1 text-[11px] text-mist-300 outline-none"
                          aria-label="Move to block"
                        >
                          {blocks.map((opt) => (
                            <option key={opt.key} value={opt.key}>
                              {opt.key === "__backlog__" ? "Backlog" : opt.when}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => removePlanTask(t.id)} className="shrink-0 p-0.5 text-mist-600 hover:text-ember-400" aria-label="Delete task">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
