"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, X, Building2, Theater as TheaterIcon, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Toast = { kind: "elevator" | "theater"; id: string; href: string; label: string };

// A floating quick-add on the Home screen: one tap to log an Elevator floor or
// a Theater act, with the current pressure attached. Calm by design — instant
// undo, no shame, with a link to add detail.
export function QuickAddFab() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const addElevator = useStore((s) => s.addElevatorLog);
  const addTheater = useStore((s) => s.addTheaterLog);
  const deleteElevator = useStore((s) => s.deleteElevatorLog);
  const deleteTheater = useStore((s) => s.deleteTheaterLog);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const pressure = () => useStore.getState().getDay().pressureLevel ?? 5;

  const logElevator = () => {
    addElevator({ floors: 1, pressureLevel: pressure(), triggers: [] });
    const logs = useStore.getState().elevatorLogs;
    const id = logs[logs.length - 1]?.id ?? "";
    setOpen(false);
    setToast({ kind: "elevator", id, href: "/elevator", label: "Floor logged. No judgment." });
  };

  const logTheater = () => {
    addTheater({ acts: 1, pressureLevel: pressure(), trigger: "" });
    const logs = useStore.getState().theaterLogs;
    const id = logs[logs.length - 1]?.id ?? "";
    setOpen(false);
    setToast({ kind: "theater", id, href: "/theater", label: "Act logged. No judgment." });
  };

  const undo = () => {
    if (!toast) return;
    if (toast.kind === "elevator") deleteElevator(toast.id);
    else deleteTheater(toast.id);
    setToast(null);
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 animate-fade-in">
          <div className="flex items-center gap-3 rounded-2xl border border-ink-700/70 bg-ink-850/95 px-4 py-2.5 shadow-lg backdrop-blur">
            <span className="text-sm text-mist-200">{toast.label}</span>
            <button
              onClick={undo}
              className="inline-flex items-center gap-1 text-xs text-mist-400 hover:text-mist-100"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Undo
            </button>
            <Link
              href={toast.href}
              onClick={() => setToast(null)}
              className="text-xs font-medium text-sky-300 hover:text-sky-200"
            >
              Details
            </Link>
          </div>
        </div>
      )}

      {/* Expanded actions */}
      <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3">
        {open && (
          <div className="flex flex-col items-end gap-2 animate-fade-in">
            <button
              onClick={logTheater}
              className="flex items-center gap-2 rounded-full border border-ink-700/70 bg-ink-850/95 py-2 pl-3 pr-4 shadow-lg backdrop-blur hover:border-ink-600"
            >
              <TheaterIcon className="h-4 w-4 text-mist-300" />
              <span className="text-sm font-medium text-mist-100">Theater</span>
            </button>
            <button
              onClick={logElevator}
              className="flex items-center gap-2 rounded-full border border-ink-700/70 bg-ink-850/95 py-2 pl-3 pr-4 shadow-lg backdrop-blur hover:border-ink-600"
            >
              <Building2 className="h-4 w-4 text-mist-300" />
              <span className="text-sm font-medium text-mist-100">Elevator</span>
            </button>
          </div>
        )}

        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all",
            open
              ? "bg-ink-700 text-mist-200 rotate-45"
              : "bg-sage-500/90 text-ink-950 hover:bg-sage-400"
          )}
          aria-label={open ? "Close quick add" : "Quick add a session"}
        >
          {open ? <X className="h-6 w-6" /> : <Plus className="h-7 w-7" />}
        </button>
      </div>
    </>
  );
}
