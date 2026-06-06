"use client";

import { useState } from "react";
import { Pencil, Check, Plus, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useStore } from "@/lib/store";

// Section 1: WHO AM I BECOMING? — the daily identity statement.
export function MissionControl() {
  const identity = useStore((s) => s.identity);
  const setIdentity = useStore((s) => s.setIdentity);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(identity.lines);

  const save = () => {
    setIdentity(draft.map((l) => l.trim()).filter(Boolean));
    setEditing(false);
  };

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-sage-500/10 to-sky-500/5 p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-sage-400">
            Who am I becoming?
          </span>
          <button
            onClick={() => {
              if (editing) save();
              else {
                setDraft(identity.lines);
                setEditing(true);
              }
            }}
            className="rounded-full p-1.5 text-mist-400 hover:bg-ink-700 hover:text-mist-100"
            aria-label={editing ? "Save identity" : "Edit identity"}
          >
            {editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </button>
        </div>

        {!editing ? (
          <div className="mt-4 space-y-2.5">
            {identity.lines.map((line, i) => (
              <p key={i} className="text-lg font-medium leading-snug text-mist-50">
                {line}
              </p>
            ))}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {draft.map((line, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={line}
                  onChange={(e) =>
                    setDraft((d) => d.map((l, j) => (j === i ? e.target.value : l)))
                  }
                  className="flex-1 rounded-lg border border-ink-700 bg-ink-900/70 px-3 py-2 text-mist-50 focus:border-sage-500/50 focus:outline-none"
                />
                <button
                  onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}
                  className="rounded-lg p-2 text-mist-500 hover:text-ember-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setDraft((d) => [...d, ""])}
              className="inline-flex items-center gap-1.5 text-sm text-mist-400 hover:text-mist-100"
            >
              <Plus className="h-4 w-4" /> Add a line
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
