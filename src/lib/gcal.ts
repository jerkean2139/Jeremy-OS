// Server-only Google Calendar *write* access (single-user). Unlike the
// read-only .ics feed, this can create events — so the app can turn the 7am
// briefing's action items into time blocks on your calendar.
//
// Two auth options (service account is the quickest to set up):
//   A) Service account (recommended): GOOGLE_SERVICE_ACCOUNT_JSON holds the
//      downloaded key (raw JSON or base64). Share your calendar with the
//      service account's email and set GOOGLE_CALENDAR_ID to your calendar
//      (your Google email). No consent screen, no expiring token.
//   B) OAuth refresh token: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
//      GOOGLE_REFRESH_TOKEN (writes to GOOGLE_CALENDAR_ID, default "primary").

import crypto from "crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

function hasServiceAccount(): boolean {
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
}

function hasRefreshToken(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );
}

export function gcalConfigured(): boolean {
  return hasServiceAccount() || hasRefreshToken();
}

function calendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID || "primary";
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Parse the service-account key (raw JSON or base64), normalizing the PEM.
function loadServiceAccount(): { client_email: string; private_key: string } | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  let txt = raw;
  if (!txt.startsWith("{")) {
    try {
      txt = Buffer.from(txt, "base64").toString("utf8");
    } catch {
      return null;
    }
  }
  try {
    const j = JSON.parse(txt);
    if (j.client_email && j.private_key) {
      return { client_email: j.client_email, private_key: String(j.private_key).replace(/\\n/g, "\n") };
    }
  } catch {
    /* fall through */
  }
  return null;
}

// Mint an access token from a service account via a signed JWT bearer grant.
async function getAccessTokenSA(): Promise<string | null> {
  const sa = loadServiceAccount();
  if (!sa) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 })
  );
  const signingInput = `${header}.${claim}`;
  let assertion: string;
  try {
    const signature = crypto.createSign("RSA-SHA256").update(signingInput).sign(sa.private_key);
    assertion = `${signingInput}.${b64url(signature)}`;
  } catch (err) {
    console.error("[gcal] JWT sign failed", err);
    return null;
  }
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  return exchange(body);
}

// Exchange a refresh token for an access token.
async function getAccessTokenRefresh(): Promise<string | null> {
  if (!hasRefreshToken()) return null;
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
    grant_type: "refresh_token",
  });
  return exchange(body);
}

async function exchange(body: URLSearchParams): Promise<string | null> {
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
    return ((await res.json()).access_token as string) || null;
  } catch (err) {
    console.error("[gcal] token request failed", err);
    return null;
  }
}

// Service account first (simpler, non-expiring), then OAuth refresh token.
async function getAccessToken(): Promise<string | null> {
  return (await getAccessTokenSA()) ?? (await getAccessTokenRefresh());
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

export interface GcalStatus {
  configured: boolean;
  ok: boolean; // auth works AND the target calendar is reachable/writable
  method?: "service_account" | "oauth";
  calendarId?: string;
  error?: "auth_failed" | "no_calendar_access" | "network" | string;
}

// End-to-end health check so the UI can confirm setup or name the exact gap:
// not configured → bad key/token → calendar not shared / wrong id → ready.
export async function diagnoseGcal(): Promise<GcalStatus> {
  if (!gcalConfigured()) return { configured: false, ok: false };
  const method = hasServiceAccount() ? "service_account" : "oauth";
  const id = calendarId();

  const token = await getAccessToken();
  if (!token) return { configured: true, ok: false, method, calendarId: id, error: "auth_failed" };

  try {
    const res = await fetch(`${API}/calendars/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) return { configured: true, ok: true, method, calendarId: id };
    if (res.status === 403 || res.status === 404) {
      return { configured: true, ok: false, method, calendarId: id, error: "no_calendar_access" };
    }
    return { configured: true, ok: false, method, calendarId: id, error: `http_${res.status}` };
  } catch {
    return { configured: true, ok: false, method, calendarId: id, error: "network" };
  }
}
