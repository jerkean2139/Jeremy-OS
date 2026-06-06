"use client";

import { useState } from "react";
import { Mountain, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useStore } from "@/lib/store";
import { MOUNTAIN_EXAMPLES } from "@/lib/codewords";

// Section 2: Today's Mountain — exactly one goal. No lists. No noise.
export function MountainCard() {
  const day = useStore((s) => s.getDay());
  const updateDay = useStore((s) => s.updateDay);
  const [value, setValue] = useState(day.mountain);
  const [focused, setFocused] = useState(false);

  const commit = () => updateDay({ mountain: value.trim() });
  const done = day.movedMountain === true;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-mist-400">
          <Mountain className="h-3.5 w-3.5 text-sage-400" /> Today&apos;s Mountain
        </span>
        {done && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sage-500/15 px-2.5 py-1 text-xs text-sage-400">
            <Check className="h-3 w-3" /> Moved
          </span>
        )}
      </div>

      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        placeholder="What is the one thing?"
        className="mt-3 w-full bg-transparent text-2xl font-semibold tracking-tight text-mist-50 placeholder:text-mist-600 focus:outline-none"
      />

      {!value && focused && (
        <div className="mt-3 flex flex-wrap gap-2">
          {MOUNTAIN_EXAMPLES.map((ex) => (
            <button
              key={ex}
              onMouseDown={(e) => {
                e.preventDefault();
                setValue(ex);
                updateDay({ mountain: ex });
              }}
              className="rounded-full border border-ink-600 bg-ink-800/50 px-3 py-1.5 text-xs text-mist-400 hover:text-mist-100"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-mist-500">One mountain only. Everything else is noise.</p>
    </Card>
  );
}
