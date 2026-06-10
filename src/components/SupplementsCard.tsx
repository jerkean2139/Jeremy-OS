"use client";

import { useState } from "react";
import { Pill, Plus, X, Check, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useStore } from "@/lib/store";
import { todayKey } from "@/lib/utils";
import { cn } from "@/lib/utils";

// Supplements & meds for the nightly routine: check each off as you take it
// (resets daily). Includes an optional fasting-window note, since meds land at
// dinner or after. Calm — awareness, not a scorecard.
export function SupplementsCard({ date }: { date?: string }) {
  const key = date ?? todayKey();
  const supplements = useStore((s) => s.supplements);
  const taken = useStore((s) => s.getDay(key).supplementsTaken) ?? [];
  const fastUntil = useStore((s) => s.fastUntil);
  const toggle = useStore((s) => s.toggleSupplementTaken);
  const add = useStore((s) => s.addSupplement);
  const remove = useStore((s) => s.removeSupplement);
  const setFastUntil = useStore((s) => s.setFastUntil);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [when, setWhen] = useState("");
  const [editing, setEditing] = useState(false);

  const items = supplements ?? [];
  const allTaken = items.length > 0 && items.every((i) => taken.includes(i.id));

  const save = () => {
    if (!name.trim()) return;
    add(name, when);
    setName("");
    setWhen("");
    setAdding(false);
  };

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-mist-100">
            <Pill className="h-4 w-4 text-sage-400" /> Supplements &amp; meds
          </div>
          {items.length > 0 && (
            <button
              onClick={() => setEditing((e) => !e)}
              className="text-xs text-mist-500 hover:text-mist-300"
            >
              {editing ? "Done" : "Edit"}
            </button>
          )}
        </div>

        {/* Fasting window note */}
        <div className="flex items-center gap-2 rounded-xl border border-ink-700/60 bg-ink-900/40 px-3 py-2 text-xs text-mist-400">
          <Clock className="h-3.5 w-3.5 text-mist-500" />
          {fastUntil ? (
            <span>
              Eating window opens <span className="text-mist-200">{fmt12(fastUntil)}</span> · meds at
              dinner or after
            </span>
          ) : (
            <span>Set your fasting window</span>
          )}
          <input
            type="time"
            value={fastUntil ?? ""}
            onChange={(e) => setFastUntil(e.target.value)}
            className="ml-auto rounded-lg border border-ink-700 bg-ink-900 px-2 py-1 text-xs text-mist-100 outline-none focus:border-ink-600"
          />
        </div>

        {items.length === 0 && !adding ? (
          <p className="py-1 text-center text-sm text-mist-500">
            Add the supplements and meds you take in the evening.
          </p>
        ) : (
          <div className="space-y-1.5">
            {items.map((item) => {
              const isTaken = taken.includes(item.id);
              return (
                <div key={item.id} className="flex items-center gap-2">
                  <button
                    onClick={() => toggle(item.id, key)}
                    className={cn(
                      "flex flex-1 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                      isTaken
                        ? "border-sage-500/40 bg-sage-500/10"
                        : "border-ink-700 hover:border-ink-600"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        isTaken ? "border-sage-400 bg-sage-500/30 text-sage-200" : "border-ink-600"
                      )}
                    >
                      {isTaken && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("text-sm", isTaken ? "text-mist-300 line-through" : "text-mist-100")}>
                        {item.name}
                      </span>
                      {item.when && <span className="ml-2 text-[11px] text-mist-500">{item.when}</span>}
                    </span>
                  </button>
                  {editing && (
                    <button
                      onClick={() => remove(item.id)}
                      className="shrink-0 rounded-full p-1.5 text-mist-600 hover:bg-ink-800 hover:text-ember-400"
                      aria-label={`Remove ${item.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {allTaken && (
          <p className="text-center text-xs text-sage-300">All taken — good. Rest well.</p>
        )}

        {/* Add row */}
        {adding ? (
          <div className="space-y-2 rounded-xl border border-ink-700/60 bg-ink-900/40 p-3">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="e.g. Magnesium"
              className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-600 outline-none focus:border-ink-600"
            />
            <div className="flex items-center gap-2">
              <input
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder="when (Dinner, Bedtime…)"
                className="min-w-0 flex-1 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-600 outline-none focus:border-ink-600"
              />
              <button
                onClick={save}
                disabled={!name.trim()}
                className="shrink-0 rounded-lg bg-sage-500/20 px-3 py-2 text-sm font-medium text-sage-200 hover:bg-sage-500/30 disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-ink-700 py-2 text-sm text-mist-400 hover:border-ink-600 hover:text-mist-200"
          >
            <Plus className="h-4 w-4" /> Add a supplement or med
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function fmt12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (isNaN(h)) return hhmm;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}
