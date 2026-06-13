"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, RefreshCw, Link2, CalendarPlus, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { SwipeRow } from "@/components/SwipeRow";
import { useStore } from "@/lib/store";
import type { CoworkData, CoworkBrief } from "@/lib/slack";
import { cn } from "@/lib/utils";

// Create a 30-min block at the next half hour from a brief's text.
async function scheduleFromText(text: string): Promise<boolean> {
  const start = new Date();
  start.setMinutes(start.getMinutes() > 30 ? 60 : 30, 0, 0);
  const end = new Date(start.getTime() + 30 * 60000);
  const local = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
  };
  try {
    const res = await fetch("/api/calendar/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: text.slice(0, 100), start: local(start), end: local(end) }),
    });
    return (await res.json()).ok === true;
  } catch {
    return false;
  }
}

// Recent results from your scheduled Claude Cowork tasks (pulled from a Slack
// channel), shown above the Slack briefing so they're part of the 7am scan.
// Swipe a brief left to clear it, like Slack.
export function CoworkBriefs({
  className,
  suppressSetup,
}: {
  className?: string;
  suppressSetup?: boolean;
}) {
  const channel = useStore((s) => s.coworkChannel);
  const setChannel = useStore((s) => s.setCoworkChannel);
  const done = useStore((s) => s.coworkDone);
  const toggleDone = useStore((s) => s.toggleCoworkDone);

  const [data, setData] = useState<CoworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [canSchedule, setCanSchedule] = useState(false);

  useEffect(() => {
    fetch("/api/calendar/create", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCanSchedule(!!d.ok))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = channel ? `?channel=${encodeURIComponent(channel)}` : "";
      const res = await fetch(`/api/cowork${qs}`);
      setData((await res.json()) as CoworkData);
    } catch {
      setData({ configured: true, ok: false, error: "offline", briefs: [], fetchedAt: "" });
    } finally {
      setLoading(false);
    }
  }, [channel]);

  useEffect(() => {
    void load();
  }, [load]);

  // Nothing configured and nothing typed yet → show a compact setup.
  if (data && !data.configured) {
    return suppressSetup ? null : <Setup className={className} onSave={setChannel} />;
  }

  const doneSet = new Set(done ?? []);
  const active = (data?.briefs ?? []).filter((b) => !doneSet.has(b.id));
  const allClear = (data?.ok ?? false) && (data?.briefs.length ?? 0) > 0 && active.length === 0;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-sage-400" />
            <span className="text-sm font-medium text-mist-100">
              Cowork briefs{data?.channelName ? ` · #${data.channelName}` : ""}
            </span>
          </div>
          <button
            onClick={() => load()}
            disabled={loading}
            className="rounded-full p-1.5 text-mist-500 hover:bg-ink-800 hover:text-mist-200 disabled:opacity-50"
            aria-label="Refresh Cowork briefs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>

        {loading && !data ? (
          <div className="space-y-1.5">
            <div className="h-12 animate-pulse-soft rounded-lg bg-ink-800/50" />
            <div className="h-12 animate-pulse-soft rounded-lg bg-ink-800/40" />
          </div>
        ) : !data?.ok ? (
          <p className="text-xs leading-relaxed text-mist-500">
            Couldn&apos;t load the Cowork channel
            {data?.error ? ` (${data.error})` : ""}.{" "}
            <button onClick={() => setChannel("")} className="text-sky-300 hover:text-sky-200">
              Change channel
            </button>
          </p>
        ) : active.length === 0 ? (
          <p className="py-1 text-center text-sm text-sage-300">
            {allClear ? "All caught up on Cowork." : "No new Cowork briefs."}
          </p>
        ) : (
          <div className="space-y-1.5">
            {active.map((b) => (
              <SwipeRow key={b.id} onComplete={() => toggleDone(b.id)}>
                <BriefRow b={b} canSchedule={canSchedule} />
              </SwipeRow>
            ))}
          </div>
        )}
        {active.length > 0 && (
          <p className="px-1 text-[11px] text-mist-600">Swipe a brief left to clear it.</p>
        )}
      </CardContent>
    </Card>
  );
}

function BriefRow({ b, canSchedule }: { b: CoworkBrief; canSchedule?: boolean }) {
  const [sched, setSched] = useState<"idle" | "busy" | "done" | "err">("idle");

  const text = (
    <div className="min-w-0">
      {b.author && <div className="text-[11px] text-mist-500">{b.author}</div>}
      <div className="line-clamp-3 text-sm text-mist-200">{b.text}</div>
    </div>
  );

  const onSchedule = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (sched === "busy") return;
    setSched("busy");
    setSched((await scheduleFromText(b.text)) ? "done" : "err");
  };

  return (
    <div className="flex items-center gap-2 rounded-lg bg-ink-800/50 px-3 py-2">
      {b.permalink ? (
        <a href={b.permalink} target="_blank" rel="noreferrer" className="min-w-0 flex-1 hover:opacity-90">
          {text}
        </a>
      ) : (
        <div className="min-w-0 flex-1">{text}</div>
      )}
      {canSchedule && (
        <button
          onClick={onSchedule}
          title="Add a 30-min block to your calendar"
          className={cn(
            "shrink-0 rounded-lg p-1.5 transition-colors",
            sched === "done"
              ? "text-sage-400"
              : sched === "err"
              ? "text-ember-400"
              : "text-mist-500 hover:bg-ink-700 hover:text-sky-300"
          )}
          aria-label="Add to calendar"
        >
          {sched === "done" ? <Check className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}

function Setup({ className, onSave }: { className?: string; onSave: (c: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <Card className={className}>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-center gap-2 text-sm font-medium text-mist-100">
          <Bot className="h-4 w-4 text-sage-400" /> Cowork briefs
        </div>
        <p className="text-xs leading-relaxed text-mist-500">
          Point this at the Slack channel your scheduled Cowork tasks post to. Enter the channel
          name (e.g. <span className="text-mist-300">cowork</span>) or its ID.
        </p>
        <div className="flex items-center gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="cowork"
            className="min-w-0 flex-1 rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5 text-sm text-mist-100 placeholder:text-mist-600 outline-none focus:border-ink-600"
          />
          <button
            onClick={() => value.trim() && onSave(value)}
            disabled={!value.trim()}
            className="shrink-0 rounded-xl bg-sky-500/20 p-2.5 text-sky-300 hover:bg-sky-500/30 disabled:opacity-40"
            aria-label="Connect channel"
          >
            <Link2 className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[11px] text-mist-600">
          Tip: set <code>COWORK_SLACK_CHANNEL</code> on the server to fix it for good. Needs the
          same SLACK_TOKEN, with the channel readable.
        </p>
      </CardContent>
    </Card>
  );
}
