import { NextRequest, NextResponse } from "next/server";
import { isDbConfigured, saveSubscription, deleteSubscription, type PushSub } from "@/lib/db";
import { isPushConfigured } from "@/lib/push-server";

export const runtime = "nodejs";

// POST /api/push/subscribe — store a Web Push subscription.
export async function POST(req: NextRequest) {
  if (!isDbConfigured() || !isPushConfigured()) {
    return NextResponse.json({ ok: false, configured: false });
  }
  let sub: PushSub;
  try {
    sub = (await req.json())?.subscription;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!sub?.endpoint) {
    return NextResponse.json({ ok: false, error: "missing_subscription" }, { status: 400 });
  }
  try {
    await saveSubscription(sub);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push] subscribe failed", err);
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  }
}

// DELETE /api/push/subscribe — remove a subscription by endpoint.
export async function DELETE(req: NextRequest) {
  let endpoint: string | undefined;
  try {
    endpoint = (await req.json())?.endpoint;
  } catch {
    endpoint = undefined;
  }
  if (endpoint) await deleteSubscription(endpoint);
  return NextResponse.json({ ok: true });
}
