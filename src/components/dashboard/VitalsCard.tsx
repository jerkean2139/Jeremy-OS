"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

// Quick inline vitals: weight + sleep. Tap to edit, calm and frictionless.
function InlineNumber({
  label,
  unit,
  value,
  onCommit,
  step = 0.1,
}: {
  label: string;
  unit: string;
  value: number | undefined;
  onCommit: (v: number | undefined) => void;
  step?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value?.toString() ?? "");

  return (
    <div className="rounded-2xl border border-ink-700/60 bg-ink-850/70 p-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
        {label}
      </div>
      {editing ? (
        <input
          autoFocus
          type="number"
          step={step}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            onCommit(draft === "" ? undefined : Number(draft));
            setEditing(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="mt-1.5 w-full bg-transparent text-2xl font-semibold tabular-nums text-mist-50 focus:outline-none"
        />
      ) : (
        <button
          onClick={() => {
            setDraft(value?.toString() ?? "");
            setEditing(true);
          }}
          className="mt-1.5 flex items-baseline gap-1 text-left"
        >
          <span className="text-2xl font-semibold tabular-nums text-mist-50">
            {value ?? "—"}
          </span>
          {value != null && <span className="text-sm text-mist-400">{unit}</span>}
        </button>
      )}
    </div>
  );
}

export function VitalsCard() {
  const day = useStore((s) => s.getDay());
  const updateDay = useStore((s) => s.updateDay);
  const [open, setOpen] = useState(false);

  // How many recovery metrics are filled in today, for the collapsed hint.
  const recoveryFilled = [day.readiness, day.sleepScore, day.hrv, day.restingHr].filter(
    (v) => v != null
  ).length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <InlineNumber
          label="Weight"
          unit="lbs"
          value={day.weight}
          onCommit={(v) => updateDay({ weight: v })}
          step={0.1}
        />
        <InlineNumber
          label="Sleep"
          unit="hrs"
          value={day.sleepHours}
          onCommit={(v) => updateDay({ sleepHours: v })}
          step={0.5}
        />
      </div>

      {open && (
        <div className="grid grid-cols-2 gap-3">
          <InlineNumber
            label="Readiness"
            unit="/ 100"
            value={day.readiness}
            onCommit={(v) => updateDay({ readiness: v })}
            step={1}
          />
          <InlineNumber
            label="Sleep score"
            unit="/ 100"
            value={day.sleepScore}
            onCommit={(v) => updateDay({ sleepScore: v })}
            step={1}
          />
          <InlineNumber
            label="HRV"
            unit="ms"
            value={day.hrv}
            onCommit={(v) => updateDay({ hrv: v })}
            step={1}
          />
          <InlineNumber
            label="Resting HR"
            unit="bpm"
            value={day.restingHr}
            onCommit={(v) => updateDay({ restingHr: v })}
            step={1}
          />
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-1.5 py-1 text-xs font-medium text-mist-500 hover:text-mist-300"
      >
        {open ? "Less" : "More from Oura / Apple Health"}
        {!open && recoveryFilled > 0 && (
          <span className="rounded-full bg-ink-700/70 px-1.5 text-[10px] text-mist-400">
            {recoveryFilled}
          </span>
        )}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
    </div>
  );
}
