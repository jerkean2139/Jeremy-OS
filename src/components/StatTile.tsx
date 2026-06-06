import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  accent?: string;
  className?: string;
}

export function StatTile({ label, value, unit, hint, accent, className }: StatTileProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-ink-700/60 bg-ink-850/70 p-4",
        className
      )}
    >
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className={cn("text-2xl font-semibold tabular-nums", accent ?? "text-mist-50")}>
          {value}
        </span>
        {unit && <span className="text-sm text-mist-400">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 text-xs text-mist-500">{hint}</div>}
    </div>
  );
}
