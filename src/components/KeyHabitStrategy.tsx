"use client";

import { useState } from "react";
import { Shield, Pencil, Check, ChevronDown, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useStore } from "@/lib/store";
import type { HabitLaws, KeyHabit } from "@/lib/types";
import { cn } from "@/lib/utils";

// The inverted Four Laws as a standing strategy for a key habit — a calm plan,
// designed once and kept close, not a verdict. Editable + persisted.
const FIELDS: { key: keyof HabitLaws; label: string; hint: string }[] = [
  { key: "obvious", label: "Make it invisible", hint: "Remove the cue from your environment" },
  { key: "attractive", label: "Make it unattractive", hint: "Reframe it; see the real cost" },
  { key: "easy", label: "Make it difficult", hint: "Add friction between you and it" },
  { key: "satisfying", label: "Make it unsatisfying", hint: "Make the cost visible / accountable" },
];

const inputCls =
  "w-full resize-none rounded-lg border border-ink-700 bg-ink-900/70 px-3 py-2 text-sm text-mist-50 placeholder:text-mist-600 focus:border-sage-500/50 focus:outline-none";

export function KeyHabitStrategy({
  which,
  accent = "sage",
}: {
  which: KeyHabit;
  accent?: "sage" | "sky";
}) {
  const laws = useStore((s) => s.keyHabitLaws?.[which] ?? {});
  const setKeyHabitLaws = useStore((s) => s.setKeyHabitLaws);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<HabitLaws>(laws);

  const hasAny = FIELDS.some((f) => laws[f.key]?.trim());
  const accentText = accent === "sky" ? "text-sky-300" : "text-sage-300";

  const startEdit = () => {
    setDraft(laws);
    setEditing(true);
    setOpen(true);
  };
  const save = () => {
    const cleaned: HabitLaws = {};
    for (const f of FIELDS) {
      const v = draft[f.key]?.trim();
      if (v) cleaned[f.key] = v;
    }
    setKeyHabitLaws(which, cleaned);
    setEditing(false);
  };

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 text-left"
          >
            <Shield className={cn("h-4 w-4", accentText)} />
            <div>
              <div className="text-sm font-medium text-mist-100">Your strategy</div>
              <div className="text-xs text-mist-500">The four laws, inverted</div>
            </div>
          </button>
          <div className="flex items-center gap-1">
            {!editing && (
              <button
                onClick={startEdit}
                className="rounded-full p-1.5 text-mist-500 hover:bg-ink-800 hover:text-mist-200"
                aria-label="Edit strategy"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => setOpen((o) => !o)}
              className="rounded-full p-1.5 text-mist-500 hover:bg-ink-800 hover:text-mist-200"
              aria-label="Toggle strategy"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            </button>
          </div>
        </div>

        {open && (
          <div className="mt-4">
            {editing ? (
              <div className="space-y-3">
                {FIELDS.map((f) => (
                  <div key={f.key}>
                    <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-mist-500">
                      {f.label}
                    </div>
                    <div className="mb-1 text-xs text-mist-600">{f.hint}</div>
                    <textarea
                      rows={2}
                      className={inputCls}
                      value={draft[f.key] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setEditing(false)}
                    className="inline-flex items-center gap-1 rounded-lg bg-ink-700/70 px-3 py-1.5 text-xs text-mist-200 hover:bg-ink-600"
                  >
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                  <button
                    onClick={save}
                    className="inline-flex items-center gap-1 rounded-lg bg-mist-50 px-3 py-1.5 text-xs font-medium text-ink-950 hover:bg-white"
                  >
                    <Check className="h-3.5 w-3.5" /> Save strategy
                  </button>
                </div>
              </div>
            ) : hasAny ? (
              <div className="space-y-3">
                {FIELDS.map((f) =>
                  laws[f.key]?.trim() ? (
                    <div key={f.key}>
                      <div className={cn("text-[11px] font-medium uppercase tracking-[0.14em]", accentText)}>
                        {f.label}
                      </div>
                      <div className="text-sm text-mist-200">{laws[f.key]}</div>
                    </div>
                  ) : null
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-mist-500">
                  Design a calm plan once: make it invisible, unattractive, difficult, and
                  unsatisfying. Then let your environment do the work, not your willpower.
                </p>
                <button
                  onClick={startEdit}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ink-700/70 px-3 py-1.5 text-sm text-mist-100 hover:bg-ink-600"
                >
                  <Pencil className="h-3.5 w-3.5" /> Design your strategy
                </button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
