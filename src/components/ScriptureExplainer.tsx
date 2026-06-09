"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2, X, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Passage {
  ref: string;
  verses?: number[];
  text: string;
}

interface Turn {
  role: "user" | "assistant";
  content: string;
}

// The seed instruction (kept out of the visible thread) that frames every
// reply: plain, high-school-level modern English with an optional metaphor.
const SEED =
  "Break this passage down for me in plain, modern English at a high-school level. What does it literally say, and what does it actually mean? If it helps, give me one everyday metaphor or analogy.";

// A focused conversation about a specific passage. Auto-explains on open, then
// takes follow-up questions. Posts to /api/coach in "scripture" mode.
export function ScriptureExplainer({
  passage,
  onClose,
  onBookmark,
}: {
  passage: Passage;
  onClose: () => void;
  onBookmark?: () => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [saved, setSaved] = useState(false);
  const startedRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  const passageText = `${passage.ref}${
    passage.verses?.length ? ` (v${passage.verses.join(", ")})` : ""
  }\n${passage.text}`;

  const run = async (displayTurns: Turn[]) => {
    setTurns(displayTurns);
    setThinking(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "scripture",
          passage: passageText,
          // Seed frames the task; the visible turns carry the conversation.
          messages: [{ role: "user", content: SEED }, ...displayTurns].slice(-10),
        }),
      });
      const data = await res.json();
      setTurns([...displayTurns, { role: "assistant", content: String(data.reply ?? "…") }]);
    } catch {
      setTurns([
        ...displayTurns,
        { role: "assistant", content: "Couldn't reach the guide right now — try again in a moment." },
      ]);
    } finally {
      setThinking(false);
    }
  };

  // Auto-explain when opened.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    run([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, thinking]);

  const send = () => {
    const q = input.trim();
    if (!q || thinking) return;
    setInput("");
    run([...turns, { role: "user", content: q }]);
  };

  const bookmark = () => {
    onBookmark?.();
    setSaved(true);
  };

  return (
    <div className="rounded-2xl border border-sky-500/25 bg-ink-900/60 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-sky-300">
          <Sparkles className="h-3.5 w-3.5" /> Break it down
        </div>
        <button
          onClick={onClose}
          className="-mr-1 -mt-1 rounded-full p-1 text-mist-500 hover:bg-ink-800 hover:text-mist-200"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* The passage under study */}
      <div className="mb-3 rounded-xl border border-ink-700/60 bg-ink-850/60 px-3 py-2">
        <div className="text-xs font-medium text-mist-300">
          {passage.ref}
          {passage.verses?.length ? ` · v${passage.verses.join(", ")}` : ""}
        </div>
        <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-mist-500">{passage.text}</p>
      </div>

      <div className="max-h-72 space-y-2.5 overflow-y-auto">
        {turns.map((t, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[88%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
              t.role === "user"
                ? "ml-auto bg-sky-500/15 text-mist-100"
                : "bg-ink-800/80 text-mist-200"
            )}
          >
            {t.content}
          </div>
        ))}
        {thinking && (
          <div className="flex items-center gap-2 text-xs text-mist-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> reading it…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask a follow-up…"
          className="min-w-0 flex-1 rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5 text-sm text-mist-100 placeholder:text-mist-600 outline-none focus:border-ink-600"
        />
        <button
          onClick={send}
          disabled={!input.trim() || thinking}
          className="shrink-0 rounded-xl bg-sky-500/20 p-2.5 text-sky-300 hover:bg-sky-500/30 disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {onBookmark && (
        <button
          onClick={bookmark}
          disabled={saved}
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-mist-500 hover:text-sage-300 disabled:text-sage-400"
        >
          <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-sage-400")} />
          {saved ? "Saved to bookmarks" : "Save this passage"}
        </button>
      )}
    </div>
  );
}
