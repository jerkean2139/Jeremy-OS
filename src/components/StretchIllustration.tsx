import { type StretchIllo } from "@/lib/routine";
import { cn } from "@/lib/utils";

// Minimal line-figure illustrations for each stretch, so you can see the shape
// of the move at a glance. Deliberately simple + on-brand (calm sage strokes);
// swap for photos later by dropping images in /public and mapping them here.

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 3.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Figure({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 100 110" className="h-full w-full text-sage-300/90" aria-hidden>
      <g {...STROKE}>{children}</g>
    </svg>
  );
}

const POSES: Record<StretchIllo, React.ReactNode> = {
  // Standing, head tilted toward a shoulder.
  neck: (
    <>
      <circle cx="44" cy="22" r="8" />
      <path d="M50 30 L46 26" />
      <path d="M50 30 L50 66" />
      <path d="M50 40 L36 58 M50 40 L64 58" />
      <path d="M50 66 L42 96 M50 66 L58 96" />
    </>
  ),
  // Hinged forward at the hips, hands toward the floor.
  fold: (
    <>
      <circle cx="42" cy="76" r="8" />
      <path d="M50 46 L44 66" />
      <path d="M44 66 L40 90" />
      <path d="M50 46 L44 96 M50 46 L56 96" />
    </>
  ),
  // Bodyweight squat: hips back, knees bent over toes, arms forward.
  squat: (
    <>
      <circle cx="50" cy="16" r="8" />
      <path d="M50 24 L50 52" />
      <path d="M50 32 L72 36" />
      <path d="M50 52 L38 66 M50 52 L62 66" />
      <path d="M38 66 L38 92 M62 66 L62 92" />
    </>
  ),
  // Standing twist: torso rotated, arms swung across.
  twist: (
    <>
      <circle cx="50" cy="18" r="8" />
      <path d="M50 26 L50 60" />
      <path d="M50 38 L30 46 M50 38 L70 32" />
      <path d="M50 60 L42 92 M50 60 L58 92" />
    </>
  ),
  // Tall reach overhead.
  reach: (
    <>
      <circle cx="50" cy="24" r="8" />
      <path d="M50 32 L50 62" />
      <path d="M50 40 L40 12 M50 40 L60 12" />
      <path d="M50 62 L42 94 M50 62 L58 94" />
    </>
  ),
};

export function StretchIllustration({
  illo,
  className,
}: {
  illo: StretchIllo;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-28 w-28 items-center justify-center rounded-2xl border border-ink-700/60 bg-ink-900/50 p-3",
        className
      )}
    >
      <Figure>{POSES[illo]}</Figure>
    </div>
  );
}
