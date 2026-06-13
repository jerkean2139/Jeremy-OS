import { NextRequest, NextResponse } from "next/server";
import { createCalendarEvent, diagnoseGcal } from "@/lib/gcal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET → end-to-end status (configured? auth ok? calendar reachable?) so the UI
// can confirm the connection or name the exact gap.
export async function GET() {
  return NextResponse.json(await diagnoseGcal(), {
    headers: { "Cache-Control": "no-store" },
  });
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
