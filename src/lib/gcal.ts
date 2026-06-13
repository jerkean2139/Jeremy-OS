// Server-only Google Calendar *write* access (single-user). Unlike the
// read-only .ics feed, this can create events — so the app can turn the 7am
// briefing's action items into time blocks on your calendar.
//
// Auth uses a one-time OAuth refresh token stored in env (no per-request user
// consent), matching the app's other env-configured integrations:
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
//   GOOGLE_CALENDAR_ID (optional, defaults to "primary")

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3";

export function gcalConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );
}

function calendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID || "primary";
}

// Exchange the long-lived refresh token for a short-lived access token.
async function getAccessToken(): Promise<string | null> {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
    grant_type: "refresh_token",
  });
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[gcal] token error", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    return (data.access_token as string) || null;
  } catch (err) {
    console.error("[gcal] token request failed", err);
    return null;
  }
}

export interface CreateEventInput {
  summary: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  description?: string;
}

export interface CreateEventResult {
  ok: boolean;
  htmlLink?: string;
  id?: string;
  error?: string;
}

export async function createCalendarEvent(input: CreateEventInput): Promise<CreateEventResult> {
  if (!gcalConfigured()) return { ok: false, error: "not_configured" };

  const token = await getAccessToken();
  if (!token) return { ok: false, error: "auth_failed" };

  const tz = process.env.GOOGLE_CALENDAR_TZ || "America/New_York";
  try {
    const res = await fetch(`${API}/calendars/${encodeURIComponent(calendarId())}/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.start, timeZone: tz },
        end: { dateTime: input.end, timeZone: tz },
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      console.error("[gcal] create error", res.status, msg);
      return { ok: false, error: res.status === 401 ? "auth_failed" : `http_${res.status}` };
    }
    const data = await res.json();
    return { ok: true, htmlLink: data.htmlLink as string, id: data.id as string };
  } catch (err) {
    console.error("[gcal] create failed", err);
    return { ok: false, error: "network" };
  }
}
