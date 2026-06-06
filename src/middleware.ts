import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, computeAuthToken } from "@/lib/auth-token";

// Single-user passcode gate.
//
// When APP_PASSCODE is set, every page and data API requires a valid unlock
// cookie; otherwise the visitor is redirected to /unlock. When APP_PASSCODE is
// NOT set (e.g. local dev), the gate is disabled and the app is wide open.

export async function middleware(req: NextRequest) {
  const passcode = process.env.APP_PASSCODE;
  if (!passcode) return NextResponse.next(); // gate disabled

  const { pathname } = req.nextUrl;

  // Always allow the unlock screen, the auth endpoint, and the cron sweep
  // (the cron route authenticates itself with CRON_SECRET).
  if (
    pathname.startsWith("/unlock") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/push/cron")
  ) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  const expected = await computeAuthToken(passcode);
  if (cookie && cookie === expected) {
    return NextResponse.next();
  }

  // For API calls, answer with 401 rather than an HTML redirect.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "locked" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/unlock";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and public static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js).*)",
  ],
};
