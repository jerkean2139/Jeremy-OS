// Optional Supabase client. Jeremy OS works fully offline with localStorage;
// when these env vars are provided, this client becomes available for sync.
// See supabase/schema.sql for the matching table definitions.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!url || !anon) return null;
  if (!client) {
    client = createClient(url, anon, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}

export const isSupabaseConfigured = Boolean(url && anon);
