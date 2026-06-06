"use client";

import { Slider } from "@/components/ui/Slider";
import { pressureColor } from "@/lib/utils";

interface PressureMeterProps {
  value: number;
  onChange: (v: number) => void;
  label?: string;
}

// Pressure (anxiety) on a 1-10 scale. Color shifts calmly from sage to ember.
export function PressureMeter({ value, onChange, label }: PressureMeterProps) {
  const accent = value <= 3 ? "#5d9c80" : value <= 6 ? "#d99a6c" : "#c97f4a";
  return (
    <div>
      <div className="mb-3 flex items-end justify-between">
        <span className="text-sm text-mist-300">{label ?? "Pressure"}</span>
        <span className={`text-3xl font-semibold tabular-nums ${pressureColor(value)}`}>
          {value}
          <span className="text-base text-mist-500">/10</span>
        </span>
      </div>
      <Slider value={value} min={1} max={10} step={1} onChange={onChange} accent={accent} />
      <div className="mt-2 flex justify-between text-[11px] text-mist-500">
        <span>Calm</span>
        <span>Heavy</span>
      </div>
    </div>
  );
}
