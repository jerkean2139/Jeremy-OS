import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Premium text-to-speech for the morning ritual's voice coach. Uses OpenAI's
// natural voice when OPENAI_API_KEY is set; returns 204 No Content otherwise so
// the client falls back to the browser's built-in speechSynthesis (offline-safe).
export async function POST(req: NextRequest) {
  let text = "";
  try {
    const body = await req.json();
    text = String(body.text ?? "").slice(0, 800);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !text.trim()) return new NextResponse(null, { status: 204 });

  const voice = process.env.OPENAI_TTS_VOICE || "sage";
  // Try the configured (newer) model first, then fall back to the widely
  // available tts-1 — so a model-access gap can't silently drop us to the
  // robotic browser voice.
  const models = [process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts", "tts-1"];
  const tried = new Set<string>();

  for (const model of models) {
    if (tried.has(model)) continue;
    tried.add(model);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, voice, input: text, response_format: "mp3" }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        console.error("[tts] model error", model, res.status, await res.text().catch(() => ""));
        continue; // try the next model
      }
      const buf = await res.arrayBuffer();
      return new NextResponse(buf, {
        status: 200,
        headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
      });
    } catch (err) {
      console.error("[tts] request failed", model, err);
    } finally {
      clearTimeout(timer);
    }
  }

  // Everything failed — let the client use its browser voice.
  return new NextResponse(null, { status: 204 });
}
