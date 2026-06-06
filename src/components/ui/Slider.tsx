"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  className?: string;
  accent?: string; // tailwind color for the track fill
}

// A calm, large-touch-target range input styled for mobile.
export function Slider({
  value,
  min = 1,
  max = 10,
  step = 1,
  onChange,
  className,
  accent = "#5d9c80",
}: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn("jeremy-slider w-full", className)}
      style={{
        background: `linear-gradient(to right, ${accent} 0%, ${accent} ${pct}%, #1d222b ${pct}%, #1d222b 100%)`,
      }}
    />
  );
}
