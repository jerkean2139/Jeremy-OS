"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MISSION_STATEMENT } from "@/lib/codewords";

export default function UnlockPage() {
  return (
    <Suspense fallback={null}>
      <Unlock />
    </Suspense>
  );
}

function Unlock() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode || loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (res.ok) {
        router.replace(next);
        router.refresh();
      } else {
        setError(true);
        setPasscode("");
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center px-2 animate-fade-in">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sage-500/20 to-sky-500/10">
        <Lock className="h-7 w-7 text-sage-400" />
      </div>

      <h1 className="text-xl font-semibold tracking-tight text-mist-50">Jeremy OS</h1>
      <p className="mt-1 text-sm italic text-mist-400">{MISSION_STATEMENT}</p>

      <form onSubmit={submit} className="mt-8 w-full max-w-xs">
        <input
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          autoFocus
          value={passcode}
          onChange={(e) => {
            setPasscode(e.target.value);
            setError(false);
          }}
          placeholder="Enter passcode"
          className={`w-full rounded-2xl border bg-ink-900/60 px-4 py-4 text-center text-lg tracking-[0.3em] text-mist-50 placeholder:tracking-normal placeholder:text-mist-500 focus:outline-none ${
            error ? "border-ember-500/70" : "border-ink-700 focus:border-sage-500/50"
          }`}
        />
        {error && (
          <p className="mt-2 text-center text-sm text-ember-400">
            That passcode didn&apos;t match. Try again.
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="mt-4 w-full"
          disabled={!passcode || loading}
        >
          {loading ? "Unlocking…" : "Unlock"}
          {!loading && <ArrowRight className="h-5 w-5" />}
        </Button>
      </form>
    </div>
  );
}
