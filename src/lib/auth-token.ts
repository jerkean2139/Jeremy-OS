// Shared passcode-token derivation. Uses the Web Crypto API so it runs in both
// the Edge middleware and Node API routes. The cookie never stores the raw
// passcode — only a non-reversible digest of it.

export async function computeAuthToken(passcode: string): Promise<string> {
  const data = new TextEncoder().encode(`jeremy-os::${passcode}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const AUTH_COOKIE = "jos_auth";
