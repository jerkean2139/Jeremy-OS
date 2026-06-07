import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/transcribe — multipart form with `file` (audio blob).
// Transcribes via OpenAI. Used as the reliable voice path on iOS PWAs, where
// the browser Web Speech API doesn't work. Returns { text }.
// Falls back to { configured:false } when no OPENAI_API_KEY is set.
export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ configured: false, text: "" }, { status: 503 });
  }

  let incoming: FormData;
  try {
    incoming = await req.formData();
  } catch {
    return NextResponse.json({ error: "expected_multipart" }, { status: 400 });
  }

  const file = incoming.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "missing_audio" }, { status: 400 });
  }
  // Guard against very large uploads (Whisper limit is 25MB).
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "audio_too_large" }, { status: 413 });
  }

  const model = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";
  const name = (file as File).name || "audio.webm";

  const form = new FormData();
  form.append("file", file, name);
  form.append("model", model);

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[transcribe] OpenAI error", res.status, detail);
      return NextResponse.json({ error: "transcription_failed" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json({ text: (data.text ?? "").trim() });
  } catch (err) {
    console.error("[transcribe] request failed", err);
    return NextResponse.json({ error: "transcription_failed" }, { status: 502 });
  }
}
