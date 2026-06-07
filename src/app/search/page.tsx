"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, X, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HydrationGate } from "@/components/HydrationGate";
import { Card, CardContent } from "@/components/ui/Card";
import { useStore } from "@/lib/store";
import { searchJournal, snippet, type JournalSource } from "@/lib/search";
import { cn } from "@/lib/utils";

export default function SearchPage() {
  return (
    <HydrationGate>
      <JournalSearch />
    </HydrationGate>
  );
}

const SOURCE_STYLE: Record<JournalSource, string> = {
  Morning: "text-ember-400",
  Reflection: "text-sky-400",
  Pulse: "text-sage-400",
  Elevator: "text-ember-400",
  Theater: "text-ember-400",
  Mountain: "text-mist-300",
};

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, query }: { text: string; query: string }) {
  const terms = query.trim().split(/\s+/).filter(Boolean).map(escapeRe);
  if (!terms.length) return <>{text}</>;
  const splitter = new RegExp(`(${terms.join("|")})`, "ig");
  const isMatch = (p: string) => terms.some((t) => new RegExp(`^${t}$`, "i").test(p));
  const parts = text.split(splitter);
  return (
    <>
      {parts.map((p, i) =>
        isMatch(p) ? (
          <mark key={i} className="rounded bg-sage-500/25 text-sage-200">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

function prettyDate(key: string) {
  return new Date(`${key}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function JournalSearch() {
  const days = useStore((s) => s.days);
  const elevatorLogs = useStore((s) => s.elevatorLogs);
  const theaterLogs = useStore((s) => s.theaterLogs);
  const pulseLogs = useStore((s) => s.pulseLogs);
  const [query, setQuery] = useState("");

  const hits = useMemo(
    () => searchJournal({ days, elevatorLogs, theaterLogs, pulseLogs }, query),
    [days, elevatorLogs, theaterLogs, pulseLogs, query]
  );

  const trimmed = query.trim();

  return (
    <div>
      <PageHeader title="Search" subtitle="Find any word you've ever written here." back="/" />

      {/* Search input */}
      <div className="relative mb-5">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-500" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search check-ins, reflections, notes…"
          className="w-full rounded-2xl border border-ink-700 bg-ink-900/60 py-3.5 pl-11 pr-11 text-mist-50 placeholder:text-mist-500 focus:border-sage-500/50 focus:outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-mist-500 hover:text-mist-200"
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!trimmed ? (
        <p className="px-1 text-sm text-mist-500">
          Type to search across your mornings, reflections, pulse notes, and habit notes.
        </p>
      ) : hits.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-mist-400">
            Nothing matches “{trimmed}” yet.
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mb-3 px-1 text-xs text-mist-500">
            {hits.length} {hits.length === 1 ? "match" : "matches"}
          </p>
          <div className="space-y-3">
            {hits.map((h) => (
              <Link key={h.id} href={h.href}>
                <Card className="transition-colors hover:border-ink-600">
                  <CardContent className="flex items-center gap-3 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={cn("font-medium", SOURCE_STYLE[h.source])}>
                          {h.source}
                        </span>
                        <span className="text-mist-600">·</span>
                        <span className="text-mist-500">{h.field}</span>
                        <span className="text-mist-600">·</span>
                        <span className="text-mist-500">{prettyDate(h.date)}</span>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-mist-200">
                        <Highlight text={snippet(h.text, query)} query={query} />
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-mist-600" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
