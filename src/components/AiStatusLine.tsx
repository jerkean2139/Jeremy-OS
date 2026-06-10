"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import type { AiStatus } from "@/lib/openai";
import { cn } from "@/lib/utils";

// A tiny, honest one-liner about whether the AI is actually live — and if not,
// the exact reason. Shown where you test the AI (coach, ritual voice).
export function AiStatusLine({
  className,
  hideWhenOk,
}: {
  className?: string;
  hideWhenOk?: boolean;
}) {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-status", { cache: "no-store" });
      setStatus((await res.json()) as AiStatus);
    } catch {
      setStatus({ configured: true, ok: false, preferred: "", voice: false, error: "network" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const r = describe(status);

  // On secondary surfaces, stay quiet when the AI is healthy.
  if (hideWhenOk && !loading && status?.ok && status.preferredAvailable !== false) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs",
        r.tone === "ok"
          ? "border-sage-500/25 bg-sage-500/5 text-sage-200"
          : r.tone === "warn"
          ? "border-ember-500/25 bg-ember-500/5 text-ember-200"
          : "border-ink-700/60 bg-ink-900/40 text-mist-400",
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-mist-500" />
      ) : r.tone === "ok" ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-sage-400" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 text-ember-400" />
      )}
      <span className="min-w-0 flex-1">{loading ? "Checking AI…" : r.text}</span>
      {!loading && (
        <button
          onClick={() => load()}
          className="shrink-0 rounded-full p-1 text-mist-500 hover:bg-ink-800 hover:text-mist-200"
          aria-label="Recheck AI status"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function describe(s: AiStatus | null): { tone: "ok" | "warn" | "off"; text: string } {
  if (!s) return { tone: "off", text: "AI status unknown." };

  if (!s.configured) {
    return { tone: "off", text: "AI not connected — set OPENAI_API_KEY on the server." };
  }
  if (s.ok) {
    if (s.preferredAvailable === false && s.model) {
      return {
        tone: "warn",
        text: `AI ready on ${s.model} — but ${s.preferred} isn't on this account. Set OPENAI_MODEL=${s.model}.`,
      };
    }
    return { tone: "ok", text: `AI ready · ${s.model}${s.voice ? " · voice on" : ""}` };
  }

  switch (s.error) {
    case "invalid_key":
      return { tone: "warn", text: "AI key rejected — the OPENAI_API_KEY is invalid or revoked." };
    case "insufficient_quota":
      return { tone: "warn", text: "Key valid, but the OpenAI account is out of quota/credits." };
    case "no_model":
      return {
        tone: "warn",
        text: `Key works, but no usable chat model (tried ${s.preferred}, gpt-4o-mini, gpt-4o). Check model access.`,
      };
    case "network":
      return { tone: "off", text: "Couldn't reach OpenAI (network). It'll retry." };
    default:
      return { tone: "warn", text: `AI unavailable${s.error ? ` (${s.error})` : ""}.` };
  }
}
