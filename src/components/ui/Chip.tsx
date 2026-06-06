"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ChipProps {
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

// Toggleable pill used for pressure sources and triggers.
export function Chip({ selected, onClick, children, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-2 text-sm transition-all duration-150",
        selected
          ? "border-sage-500 bg-sage-500/15 text-sage-400"
          : "border-ink-600 bg-ink-800/50 text-mist-400 hover:border-ink-600 hover:text-mist-200",
        className
      )}
    >
      {children}
    </button>
  );
}
