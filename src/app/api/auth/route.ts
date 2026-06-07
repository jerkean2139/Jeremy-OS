import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, computeAuthToken } from "@/lib/auth-token";

export const runtime = "nodejs";

// POST /api/auth — exchange a passcode for an unlock cookie.
export async function POST(req: NextRequest) {
  const passcode = process.env.APP_PASSCODE;
  if (!passcode) {
    // No passcode configured — nothing to unlock.
    return NextResponse.json({ ok: true, disabled: true });
  }

  let input: unknown;
  try {
    input = (await req.json())?.passcode;
  } catch {
    input = undefined;
  }

  // Length-aware constant-ish comparison to avoid trivial timing leaks.
  const valid =
    typeof input === "string" &&
    input.length === passcode.length &&
    timingSafeEqual(input, passcode);

  if (!valid) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await computeAuthToken(passcode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}

// DELETE /api/auth — lock the app (clear the cookie).
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(AUTH_COOKIE);
  return res;
}

function timingSafeEqual(a: string, b: string): boolean {
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
