import { NextRequest, NextResponse } from "next/server";
import { readingForDay, type ChapterRef } from "@/lib/bible";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The daily scripture reading. Pulls the day's OT + NT chapters (World English
// Bible — public domain, free, no key) and generates a calm "what it means"
// reflection via the same OpenAI path the coach uses, with an offline
// fallback. Cached per plan-day in memory since the text never changes.

const BIBLE_API = "https://bible-api.com";
const TRANSLATION = "web";

export interface ChapterText {
  ref: string;
  verses: { verse: number; text: string }[];
  error?: boolean;
}

export interface ScriptureResponse {
  day: number;
  total: number;
  ot: { label: string; chapters: ChapterText[] };
  nt: { label: string; chapters: ChapterText[] };
  summary?: string;
}

const cache = new Map<number, ScriptureResponse>();

async function fetchChapter(c: ChapterRef): Promise<ChapterText> {
  const ref = `${c.book} ${c.chapter}`;
  try {
    const res = await fetch(
      `${BIBLE_API}/${encodeURIComponent(ref)}?translation=${TRANSLATION}`,
      { cache: "no-store" }
    );
    if (!res.ok) return { ref, verses: [], error: true };
    const data = await res.json();
    const verses = (data.verses || []).map((v: any) => ({
      verse: v.verse as number,
      text: String(v.text || "").replace(/\s+/g, " ").trim(),
    }));
    return { ref, verses };
  } catch {
    return { ref, verses: [], error: true };
  }
}

export async function GET(req: NextRequest) {
  const dayParam = Number(req.nextUrl.searchParams.get("day") || "1");
  const reading = readingForDay(dayParam);
  const day = reading.day;

  const cached = cache.get(day);
  if (cached) return NextResponse.json(cached);

  const [otChapters, ntChapters] = await Promise.all([
    Promise.all(reading.ot.chapters.map(fetchChapter)),
    Promise.all(reading.nt.chapters.map(fetchChapter)),
  ]);

  const summary = await summarize(reading.ot.label, reading.nt.label, [
    ...otChapters,
    ...ntChapters,
  ]);

  const payload: ScriptureResponse = {
    day,
    total: reading.total,
    ot: { label: reading.ot.label, chapters: otChapters },
    nt: { label: reading.nt.label, chapters: ntChapters },
    summary,
  };

  // Only cache a complete pull (don't pin a failed fetch).
  if (![...otChapters, ...ntChapters].some((c) => c.error)) {
    cache.set(day, payload);
  }
  return NextResponse.json(payload);
}

const SUMMARY_PROMPT = `You are a calm, encouraging guide explaining the Bible to a high-performing entrepreneur reading through scripture each morning. Explain what today's passage means: its core message, the heart of what God is communicating, and one way it might steady or guide him today.

TONE: warm, grounded, hopeful — never preachy, never heavy theological jargon. 3-5 short, mobile-readable sentences. No greeting, no "today's passage is"; just the meaning. End with one quiet line of application or encouragement.`;

async function summarize(
  otLabel: string,
  ntLabel: string,
  chapters: ChapterText[]
): Promise<string | undefined> {
  const corpus = chapters
    .filter((c) => c.verses.length)
    .map((c) => `${c.ref}\n${c.verses.map((v) => `${v.verse} ${v.text}`).join(" ")}`)
    .join("\n\n")
    .slice(0, 8000);

  const refs = [otLabel, ntLabel].filter(Boolean).join(" and ");

  if (!corpus.trim()) {
    return undefined;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return `Today you're reading ${refs}. Sit with it slowly — read it once for the story, once for the line that's meant for you. Let one verse stay with you through the day.`;
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SUMMARY_PROMPT },
          { role: "user", content: `Passage (${refs}):\n\n${corpus}` },
        ],
        temperature: 0.6,
        max_tokens: 350,
      }),
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || undefined;
  } catch {
    return undefined;
  }
}
