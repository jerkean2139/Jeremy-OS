"use client";

import { useStore } from "@/lib/store";

// Persisted state hydrates on the client only. Render a calm skeleton until
// then to avoid SSR/client mismatch flashes.
export function HydrationGate({ children }: { children: React.ReactNode }) {
  const hydrated = useStore((s) => s._hydrated);
  if (!hydrated) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <div className="h-8 w-8 animate-pulse-soft rounded-full border-2 border-sage-500/60" />
      </div>
    );
  }
  return <>{children}</>;
}
