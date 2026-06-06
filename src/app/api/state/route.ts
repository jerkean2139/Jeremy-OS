import { NextRequest, NextResponse } from "next/server";
import { isDbConfigured, readState, writeState } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/state — returns the persisted single-user state document.
// When no database is configured, reports configured:false so the client
// stays in localStorage-only mode.
export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, data: null, updatedAt: null });
  }
  try {
    const { data, updatedAt } = await readState();
    return NextResponse.json({ configured: true, data, updatedAt });
  } catch (err) {
    console.error("[state] read failed", err);
    return NextResponse.json(
      { configured: true, data: null, updatedAt: null, error: "read_failed" },
      { status: 500 }
    );
  }
}

// PUT /api/state — upserts the full state document.
export async function PUT(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, ok: false });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  try {
    const updatedAt = await writeState(body);
    return NextResponse.json({ configured: true, ok: true, updatedAt });
  } catch (err) {
    console.error("[state] write failed", err);
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }
}
