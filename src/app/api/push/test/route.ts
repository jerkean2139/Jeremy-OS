import { NextResponse } from "next/server";
import { isPushConfigured, sendToAll } from "@/lib/push-server";
import { isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";

// POST /api/push/test — send a test notification to all of this user's devices.
// Gated by the app passcode middleware (this is an authenticated route).
export async function POST() {
  if (!isDbConfigured() || !isPushConfigured()) {
    return NextResponse.json({ ok: false, configured: false });
  }
  try {
    const delivered = await sendToAll({
      title: "Jeremy OS",
      body: "Reminders are working. Reduce noise. Move the mountain.",
      url: "/",
      tag: "jeremy-os-test",
    });
    return NextResponse.json({ ok: true, delivered });
  } catch (err) {
    console.error("[push] test failed", err);
    return NextResponse.json({ ok: false, error: "send_failed" }, { status: 500 });
  }
}
