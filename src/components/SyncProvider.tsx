"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { startSync } from "@/lib/sync";

// Starts client<->Postgres sync once the persisted store has hydrated.
export function SyncProvider() {
  const hydrated = useStore((s) => s._hydrated);
  useEffect(() => {
    if (hydrated) void startSync();
  }, [hydrated]);
  return null;
}
