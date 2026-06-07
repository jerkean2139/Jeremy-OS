import { NextRequest, NextResponse } from "next/server";
import { getSlackBriefing, type SlackBriefingData } from "@/lib/slack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The 7am Slack briefing. Gated by the passcode middleware like every other
// API. A short in-memory cache keeps repeated dashboard loads from hammering
// the Slack API; pass ?refresh=1 to force a fresh pull.
let cache: { at: number; data: SlackBriefingData } | null = null;
const TTL_MS = 120_000;

export async function GET(req: NextRequest) {
  const refresh = req.nextUrl.searchParams.get("refresh") === "1";
  if (!refresh && cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json(cache.data);
  }
  const data = await getSlackBriefing();
  if (data.ok) cache = { at: Date.now(), data };
  return NextResponse.json(data);
}
