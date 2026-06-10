import { NextRequest, NextResponse } from "next/server";
import { getCoworkBriefs } from "@/lib/slack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Recent messages from the designated Cowork Slack channel — your scheduled
// Claude Cowork tasks' results, surfaced above the Slack briefing. The channel
// comes from COWORK_SLACK_CHANNEL or a per-request override (set in-app).
export async function GET(req: NextRequest) {
  const channel = req.nextUrl.searchParams.get("channel") || undefined;
  const data = await getCoworkBriefs(channel);
  return NextResponse.json(data);
}
