"use client";

import { useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// A row you can swipe left (or drag, on desktop) to mark as handled — like
// clearing a message in Slack. Reveals a sage "Done" track behind the content;
// past the threshold it calls onComplete. Works with touch + mouse via pointer
// events. Content stays tappable (a tap that doesn't drag passes through).
export function SwipeRow({
  onComplete,
  done,
  children,
}: {
  onComplete: () => void;
  done?: boolean;
  children: ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  const dragging = useRef(false);
  const THRESHOLD = 72;
  const MAX = 110;

  const onDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    dragging.current = false;
  };
  const onMove = (e: React.PointerEvent) => {
    if (startX.current == null) return;
    const d = e.clientX - startX.current;
    if (Math.abs(d) > 6) dragging.current = true;
    // Only left-swipe matters.
    setDx(Math.max(Math.min(d, 0), -MAX));
  };
  const finish = () => {
    if (startX.current == null) return;
    const passed = dx <= -THRESHOLD;
    startX.current = null;
    setDx(0);
    if (passed) onComplete();
  };
  // Swallow the click that follows a real drag so it doesn't open the link.
  const onClickCapture = (e: React.MouseEvent) => {
    if (dragging.current) {
      e.preventDefault();
      e.stopPropagation();
      dragging.current = false;
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* The reveal behind the row */}
      <div className="absolute inset-0 flex items-center justify-end bg-sage-500/20 pr-4 text-sage-300">
        <span className="flex items-center gap-1 text-xs font-medium">
          <Check className="h-4 w-4" /> Done
        </span>
      </div>
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onClickCapture={onClickCapture}
        style={{ transform: `translateX(${dx}px)` }}
        className={cn(
          "relative touch-pan-y transition-transform",
          dx === 0 && "duration-200",
          done && "opacity-50"
        )}
      >
        {children}
      </div>
    </div>
  );
}
