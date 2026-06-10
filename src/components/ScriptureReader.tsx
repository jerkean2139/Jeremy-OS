"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Sparkles, Loader2, MessageSquareText, Bookmark, X, Headphones, Square } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { ScriptureExplainer } from "@/components/ScriptureExplainer";
import { readingForDay } from "@/lib/bible";
import { useStore } from "@/lib/store";
import { meterChat } from "@/lib/ai-client";
import { useSpeech } from "@/hooks/useSpeech";
import type { ScriptureResponse, ChapterText } from "@/app/api/scripture/route";
import { cn, chunkText } from "@/lib/utils";

// Build an ordered list of spoken chunks for the whole reading — summary, then
// each passage announced and read aloud — so it never truncates while walking.
function buildListenChunks(data: ScriptureResponse | null): string[] {
  if (!data) return [];
  const chunks: string[] = [];
  if (data.summary) chunks.push(...chunkText(`Here's what it means. ${data.summary}`));
  for (const [heading, passage] of [
    ["Old Testament", data.ot],
    ["New Testament", data.nt],
  ] as const) {
    if (!passage?.label) continue;
    chunks.push(`${heading}. ${passage.label}.`);
    for (const c of passage.chapters ?? []) {
      if (!c.verses?.length) continue;
      chunks.push(...chunkText(c.verses.map((v) => v.text).join(" ")));
    }
  }
  return chunks;
}

type Sel = { ref: string; verses: number[]; texts: Record<number, string> };

// Fetches and renders one plan-day's reading: the AI "what it means"
// reflection on top, then the OT + NT passages with verse numbers. Tap any
// verse to highlight it — then bookmark the selection or break it down with AI.
// Shared by the /scripture page and the Morning Ritual reading step.
export function ScriptureReader({ day }: { day: number }) {
  const [data, setData] = useState<ScriptureResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Sel | null>(null);
  const [explaining, setExplaining] = useState(false);
  const addBookmark = useStore((s) => s.addScriptureBookmark);
  const { speakChunks, cancel: cancelSpeech, speaking } = useSpeech();
  const listenChunks = useMemo(() => buildListenChunks(data), [data]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setData(null);
    setSel(null);
    setExplaining(false);
    // Never spin forever: abort the request after 20s and fall back to labels.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    fetch(`/api/scripture?day=${day}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: ScriptureResponse) => {
        if (alive) setData(d);
        if (!d?.cached && d?.summaryModel && d.summaryUsage) {
          meterChat("scripture", d.summaryModel, d.summaryUsage);
        }
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timer);
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [day]);

  // Reference labels are pure + instant, shown before the text arrives.
  const labels = readingForDay(day);

  const toggleVerse = (ref: string, verse: number, text: string) => {
    setExplaining(false);
    setSel((cur) => {
      if (!cur || cur.ref !== ref) return { ref, verses: [verse], texts: { [verse]: text } };
      const has = cur.verses.includes(verse);
      const verses = has
        ? cur.verses.filter((v) => v !== verse)
        : [...cur.verses, verse].sort((a, b) => a - b);
      if (verses.length === 0) return null;
      return { ref, verses, texts: { ...cur.texts, [verse]: text } };
    });
  };

  const selText = sel ? sel.verses.map((v) => `${v} ${sel.texts[v]}`).join(" ").trim() : "";
  const passage = sel ? { ref: sel.ref, verses: sel.verses, text: selText } : null;

  const saveBookmark = () => {
    if (!sel) return;
    addBookmark({ day, ref: sel.ref, verses: sel.verses, text: selText });
  };

  return (
    <div>
      {/* What it means — the orienting frame. */}
      <Card className="mb-5 border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-transparent">
        <CardContent className="pt-5">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-sky-300">
            <Sparkles className="h-3.5 w-3.5" /> What it means
          </div>
          {loading ? (
            <div className="flex items-center gap-2 py-2 text-sm text-mist-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading it for you…
            </div>
          ) : (
            <p className="whitespace-pre-line text-sm leading-relaxed text-mist-200">
              {data?.summary ||
                `Today you're reading ${[labels.ot.label, labels.nt.label]
                  .filter(Boolean)
                  .join(" and ")}. Read it slowly — let one line stay with you.`}
            </p>
          )}
          {!loading && (
            <p className="mt-2 text-xs text-mist-600">
              Tip: tap a verse to highlight it, then bookmark it or break it down.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Listen — hands-free for a walk */}
      {!loading && listenChunks.length > 0 && (
        <button
          onClick={() => (speaking ? cancelSpeech() : speakChunks(listenChunks))}
          className={cn(
            "mb-5 flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-medium transition-colors",
            speaking
              ? "border-ember-500/30 bg-ember-500/10 text-ember-200"
              : "border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/15"
          )}
        >
          {speaking ? (
            <>
              <Square className="h-4 w-4" /> Stop listening
            </>
          ) : (
            <>
              <Headphones className="h-4 w-4" /> Listen to today&apos;s reading
            </>
          )}
        </button>
      )}

      <Passage
        heading="Old Testament"
        label={labels.ot.label}
        chapters={data?.ot.chapters}
        loading={loading}
        sel={sel}
        onToggle={toggleVerse}
      />
      <Passage
        heading="New Testament"
        label={labels.nt.label}
        chapters={data?.nt.chapters}
        loading={loading}
        sel={sel}
        onToggle={toggleVerse}
      />

      {/* Study the selection */}
      {passage && explaining && (
        <div className="mt-4">
          <ScriptureExplainer
            passage={passage}
            onClose={() => setExplaining(false)}
            onBookmark={saveBookmark}
          />
        </div>
      )}

      {/* Selection action bar — floats above the bottom nav while reading. */}
      {sel && !explaining && (
        <div className="sticky bottom-24 z-10 mt-4 flex items-center gap-2 rounded-2xl border border-sky-500/30 bg-ink-850/95 p-2.5 shadow-lg backdrop-blur">
          <span className="pl-1 text-xs text-mist-400">
            {sel.verses.length} verse{sel.verses.length === 1 ? "" : "s"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={saveBookmark}
              className="inline-flex items-center gap-1.5 rounded-xl border border-ink-700 px-3 py-2 text-xs text-mist-200 hover:border-ink-600"
            >
              <Bookmark className="h-3.5 w-3.5" /> Bookmark
            </button>
            <button
              onClick={() => setExplaining(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500/20 px-3 py-2 text-xs font-medium text-sky-200 hover:bg-sky-500/30"
            >
              <MessageSquareText className="h-3.5 w-3.5" /> Break it down
            </button>
            <button
              onClick={() => setSel(null)}
              className="rounded-full p-1.5 text-mist-500 hover:bg-ink-800 hover:text-mist-200"
              aria-label="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Passage({
  heading,
  label,
  chapters,
  loading,
  sel,
  onToggle,
}: {
  heading: string;
  label: string;
  chapters?: ChapterText[];
  loading: boolean;
  sel: Sel | null;
  onToggle: (ref: string, verse: number, text: string) => void;
}) {
  if (!label) return null;
  return (
    <Card className="mb-4">
      <CardContent className="pt-5">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-sage-400" />
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-mist-500">
              {heading}
            </div>
            <div className="text-sm font-semibold text-mist-100">{label}</div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse-soft rounded bg-ink-800/60" />
            <div className="h-3 w-11/12 animate-pulse-soft rounded bg-ink-800/50" />
            <div className="h-3 w-10/12 animate-pulse-soft rounded bg-ink-800/40" />
          </div>
        ) : (
          <div className="space-y-4">
            {chapters?.map((c) => (
              <div key={c.ref}>
                <div className="mb-1 text-xs font-medium text-mist-400">{c.ref}</div>
                {c.error || !c.verses.length ? (
                  <p className="text-sm text-mist-500">
                    Couldn&apos;t load this passage right now. Try again in a moment.
                  </p>
                ) : (
                  <p className="text-[15px] leading-7 text-mist-200">
                    {c.verses.map((v) => {
                      const selected = sel?.ref === c.ref && sel.verses.includes(v.verse);
                      return (
                        <span
                          key={v.verse}
                          role="button"
                          tabIndex={0}
                          onClick={() => onToggle(c.ref, v.verse, v.text)}
                          onKeyDown={(e) =>
                            (e.key === "Enter" || e.key === " ") &&
                            onToggle(c.ref, v.verse, v.text)
                          }
                          className={cn(
                            "cursor-pointer rounded transition-colors",
                            selected
                              ? "bg-sky-500/20 text-mist-50"
                              : "hover:bg-ink-800/60"
                          )}
                        >
                          <sup className="mr-0.5 text-[10px] text-mist-500">{v.verse}</sup>
                          <span className={cn(v.verse !== 1 && "ml-0.5")}>{v.text} </span>
                        </span>
                      );
                    })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
