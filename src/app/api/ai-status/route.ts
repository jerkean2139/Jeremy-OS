import { NextResponse } from "next/server";
import { diagnoseOpenAI } from "@/lib/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Precise AI health check so the UI can say exactly what's wrong (no key,
// rejected key, model not on this account, quota, network) instead of silently
// falling back to the offline/generic engine. No token cost — uses /v1/models.
export async function GET() {
  const status = await diagnoseOpenAI();
  return NextResponse.json(status, {
    headers: { "Cache-Control": "no-store" },
  });
}
