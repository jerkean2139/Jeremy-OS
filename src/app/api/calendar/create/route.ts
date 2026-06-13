import { NextRequest, NextResponse } from "next/server";
import { createCalendarEvent, gcalConfigured } from "@/lib/gcal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET → whether write access is configured (so the UI can show/hide scheduling).
export async function GET() {
  return NextResponse.json({ configured: gcalConfigured() });
}

// POST → create a calendar event (a scheduled time block) on your Google
// Calendar. Body: { summary, start (ISO), end (ISO), description? }.
export async function POST(req: NextRequest) {
  let body: { summary?: string; start?: string; end?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const { summary, start, end, description } = body;
  if (!summary?.trim() || !start || !end) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const result = await createCalendarEvent({ summary: summary.trim(), start, end, description });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
