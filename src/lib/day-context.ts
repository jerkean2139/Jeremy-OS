// Client-side: pulls today's live context — calendar, the 7am Slack triage,
// and Cowork briefs — so the Coach can plan the actual day, not just reflect on
// metrics. Best-effort: any source that's unconfigured or fails is skipped.

import { todayKey } from "./utils";
import { fmtRange, type CalEvent } from "./calendar";
import type { CalendarResponse } from "@/app/api/calendar/route";
import type { SlackBriefingData, CoworkData } from "./slack";

export async function fetchDayContext(icsUrl?: string): Promise<string> {
  const parts: string[] = [];

  const [cal, slack, cowork] = await Promise.all([
    // /api/calendar is POST — it takes the ICS URL in the body (falls back to
    // the CALENDAR_ICS_URL env on the server).
    safe<CalendarResponse>("/api/calendar", {
      method: "POST",
      body: JSON.stringify({ icsUrl: icsUrl || undefined }),
    }),
    safe<SlackBriefingData>("/api/slack"),
    safe<CoworkData>("/api/cowork"),
  ]);

  if (cal?.ok) {
    const today = cal.days.find((d) => d.date === todayKey())?.events ?? [];
    if (today.length) {
      parts.push(
        "TODAY'S CALENDAR:\n" +
          today.map((e: CalEvent) => `- ${fmtRange(e)} ${e.summary}${e.isMeeting ? " [meeting]" : ""}`).join("\n")
      );
    } else {
      parts.push("TODAY'S CALENDAR: nothing scheduled.");
    }
  }

  if (slack?.ok) {
    const u = slack.unreads?.length ?? 0;
    const m = slack.mentions?.length ?? 0;
    let line = `SLACK: ${u} unread conversation${u === 1 ? "" : "s"}, ${m} mention${m === 1 ? "" : "s"}.`;
    if (slack.digest) line += ` Triage: ${slack.digest}`;
    parts.push(line);
  }

  if (cowork?.ok && cowork.briefs?.length) {
    parts.push(
      "COWORK BRIEFS (scheduled-task results):\n" +
        cowork.briefs.slice(0, 6).map((b) => `- ${b.text}`).join("\n")
    );
  }

  return parts.join("\n\n");
}

async function safe<T>(
  url: string,
  init?: { method?: string; body?: string }
): Promise<T | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      method: init?.method ?? "GET",
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
      body: init?.body,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
