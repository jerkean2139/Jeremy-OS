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

  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
        voice: process.env.OPENAI_TTS_VOICE || "sage",
        input: text,
        response_format: "mp3",
      }),
    });
    if (!res.ok) return new NextResponse(null, { status: 204 });
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
