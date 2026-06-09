"use client";

import { useCallback, useEffect, useState } from "react";
import { Slack, RefreshCw, AtSign, Hash, MessageCircle, Users, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { SwipeRow } from "@/components/SwipeRow";
import { useStore } from "@/lib/store";
import type { SlackBriefingData, SlackUnread, SlackMention } from "@/lib/slack";
import { cn } from "@/lib/utils";

// Stable per-message keys so "handled" survives reloads but new messages in a
// channel (changed latest text) resurface.
const unreadKey = (u: SlackUnread) => `u:${u.id}:${u.latest ?? ""}`;
const mentionKey = (m: SlackMention) => `m:${m.channel}:${m.ts}`;

// The 7am Slack briefing: a calm AI triage on top, browsable unreads below.
// Used both as a dashboard card and at the end of the Morning Ritual.
export function SlackBriefing({ className }: { className?: string }) {
  const [data, setData] = useState<SlackBriefingData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/slack${refresh ? "?refresh=1" : ""}`);
      setData((await res.json()) as SlackBriefingData);
    } catch {
      setData({
        configured: true,
        ok: false,
        error: "offline",
        unreads: [],
        mentions: [],
        fetchedAt: "",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Slack className="h-4 w-4 text-sky-400" />
            <span className="text-sm font-medium text-mist-100">
              Slack{data?.team ? ` · ${data.team}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusPill loading={loading} data={data} />
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="rounded-full p-1.5 text-mist-500 transition-colors hover:bg-ink-800 hover:text-mist-200 disabled:opacity-50"
              aria-label="Refresh Slack"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {loading && !data ? (
          <Skeleton />
        ) : !data?.configured ? (
          <Setup />
        ) : !data.ok ? (
          <p className="text-xs leading-relaxed text-mist-500">
            Couldn&apos;t reach Slack
            {data.error ? ` (${data.error})` : ""}. Check that your SLACK_TOKEN is valid and
            has the read scopes.
          </p>
        ) : (
          <Briefing data={data} />
        )}
      </CardContent>
    </Card>
  );
}

function StatusPill({ loading, data }: { loading: boolean; data: SlackBriefingData | null }) {
  if (loading && !data) return null;
  let label: string;
  let cls: string;
  let dot: string;
  if (!data?.configured) {
    label = "Not connected";
    cls = "text-mist-400 bg-ink-800/80";
    dot = "bg-mist-500";
  } else if (!data.ok) {
    label = "Error";
    cls = "text-ember-300 bg-ember-500/15";
    dot = "bg-ember-400";
  } else {
    label = "Connected";
    cls = "text-sage-300 bg-sage-500/15";
    dot = "bg-sage-400";
  }
  return (
    <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", cls)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} /> {label}
    </span>
  );
}

function Briefing({ data }: { data: SlackBriefingData }) {
  const slackDone = useStore((s) => s.slackDone);
  const toggleDone = useStore((s) => s.toggleSlackDone);
  const done = new Set(slackDone ?? []);
  const [showHandled, setShowHandled] = useState(false);

  const mentions = data.mentions.slice(0, 5);
  const activeMentions = mentions.filter((m) => !done.has(mentionKey(m)));
  const activeUnreads = data.unreads.filter((u) => !done.has(unreadKey(u)));
  const handledCount =
    mentions.filter((m) => done.has(mentionKey(m))).length +
    data.unreads.filter((u) => done.has(unreadKey(u))).length;

  const handledMentions = mentions.filter((m) => done.has(mentionKey(m)));
  const handledUnreads = data.unreads.filter((u) => done.has(unreadKey(u)));

  const nothingRaw = data.unreads.length === 0 && data.mentions.length === 0;
  const allClear = !nothingRaw && activeMentions.length === 0 && activeUnreads.length === 0;

  return (
    <div className="space-y-3">
      {data.digest && (
        <p className="whitespace-pre-line rounded-xl border border-sky-500/20 bg-sky-500/5 px-3.5 py-3 text-sm leading-relaxed text-mist-200">
          {data.digest}
        </p>
      )}

      {(activeMentions.length > 0 || activeUnreads.length > 0) && (
        <p className="px-1 text-[11px] text-mist-600">Swipe a message left to clear it.</p>
      )}

      {activeMentions.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
            <AtSign className="h-3 w-3" /> Mentions
          </div>
          {activeMentions.map((m) => (
            <SwipeRow key={mentionKey(m)} onComplete={() => toggleDone(mentionKey(m))}>
              <MentionRow m={m} />
            </SwipeRow>
          ))}
        </div>
      )}

      {activeUnreads.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
            Unread
          </div>
          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {activeUnreads.map((u) => (
              <SwipeRow key={unreadKey(u)} onComplete={() => toggleDone(unreadKey(u))}>
                <UnreadRow u={u} />
              </SwipeRow>
            ))}
          </div>
        </div>
      )}

      {nothingRaw && (
        <p className="py-2 text-center text-sm text-mist-500">
          Slack is quiet. Nothing&apos;s waiting on you.
        </p>
      )}

      {allClear && (
        <p className="py-2 text-center text-sm text-sage-300">
          All clear — you&apos;ve handled everything.
        </p>
      )}

      {handledCount > 0 && (
        <div className="border-t border-ink-700/60 pt-2">
          <button
            onClick={() => setShowHandled((v) => !v)}
            className="text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500 hover:text-mist-300"
          >
            {showHandled ? "Hide" : "Show"} handled · {handledCount}
          </button>
          {showHandled && (
            <div className="mt-2 space-y-1.5">
              {handledMentions.map((m) => (
                <HandledRow key={mentionKey(m)} onUndo={() => toggleDone(mentionKey(m))}>
                  <MentionRow m={m} />
                </HandledRow>
              ))}
              {handledUnreads.map((u) => (
                <HandledRow key={unreadKey(u)} onUndo={() => toggleDone(unreadKey(u))}>
                  <UnreadRow u={u} />
                </HandledRow>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HandledRow({ onUndo, children }: { onUndo: () => void; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1 opacity-50">{children}</div>
      <button
        onClick={onUndo}
        className="shrink-0 rounded-full p-1.5 text-mist-500 hover:bg-ink-800 hover:text-mist-200"
        aria-label="Mark as not handled"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function MentionRow({ m }: { m: SlackMention }) {
  return (
    <a
      href={m.permalink}
      target="_blank"
      rel="noreferrer"
      className="block rounded-lg bg-ink-800/50 px-3 py-2 transition-colors hover:bg-ink-800"
    >
      <div className="text-[11px] text-mist-500">{m.channel}</div>
      <div className="line-clamp-2 text-sm text-mist-200">{m.text || "—"}</div>
    </a>
  );
}

function UnreadRow({ u }: { u: SlackUnread }) {
  const Icon = u.kind === "dm" ? MessageCircle : u.kind === "group" ? Users : Hash;
  return (
    <a
      href={u.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-start gap-2.5 rounded-lg bg-ink-800/50 px-3 py-2 transition-colors hover:bg-ink-800"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-mist-400" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-mist-100">{u.name}</span>
          <span className="shrink-0 rounded-full bg-sky-500/20 px-1.5 text-[11px] font-medium text-sky-300">
            {u.count}
          </span>
        </div>
        {u.latest && <div className="line-clamp-1 text-xs text-mist-500">{u.latest}</div>}
      </div>
    </a>
  );
}

function Setup() {
  return (
    <p className="text-xs leading-relaxed text-mist-500">
      Connect Slack to get a calm 7am triage. Create a Slack app, add the read scopes
      (channels/groups/im/mpim read + history, <span className="text-mist-400">search:read</span>,{" "}
      <span className="text-mist-400">users:read</span>), install it, and set its user token as{" "}
      <span className="text-mist-300">SLACK_TOKEN</span> in your environment.
    </p>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      <div className="h-14 animate-pulse-soft rounded-xl bg-ink-800/60" />
      <div className="h-9 animate-pulse-soft rounded-lg bg-ink-800/40" />
      <div className="h-9 animate-pulse-soft rounded-lg bg-ink-800/40" />
    </div>
  );
}
