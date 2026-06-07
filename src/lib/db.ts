import { Pool } from "pg";

// Single-user Postgres persistence for Jeremy OS.
// The entire app state is stored as one JSONB document (one row). For a
// personal, single-user operating system this is simple, durable, and a
// perfect match for the localStorage-shaped client state.
//
// When DATABASE_URL is absent (e.g. local dev without a DB), getPool()
// returns null and the app falls back to localStorage-only.

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function getPool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      // Railway's private network needs no SSL. Set DATABASE_SSL=true for
      // external/public connections (e.g. local dev against a public proxy).
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

export const isDbConfigured = () => Boolean(process.env.DATABASE_URL);

// Lazily create the table on first use; cached so it runs once per process.
export function ensureSchema(): Promise<void> {
  const p = getPool();
  if (!p) return Promise.resolve();
  if (!schemaReady) {
    schemaReady = p
      .query(
        `create table if not exists app_state (
           id int primary key default 1,
           data jsonb not null default '{}'::jsonb,
           updated_at timestamptz not null default now(),
           constraint app_state_singleton check (id = 1)
         );
         create table if not exists push_subscriptions (
           endpoint text primary key,
           sub jsonb not null,
           created_at timestamptz not null default now()
         );
         create table if not exists push_sent (
           key text not null,
           sent_date date not null,
           sent_at timestamptz not null default now(),
           primary key (key, sent_date)
         );`
      )
      .then(() => undefined)
      .catch((err) => {
        // Reset so a later request can retry if the DB was briefly unreachable.
        schemaReady = null;
        throw err;
      });
  }
  return schemaReady;
}

export interface StoredState {
  data: Record<string, unknown> | null;
  updatedAt: string | null;
}

export async function readState(): Promise<StoredState> {
  const p = getPool();
  if (!p) return { data: null, updatedAt: null };
  await ensureSchema();
  const res = await p.query<{ data: Record<string, unknown>; updated_at: Date }>(
    "select data, updated_at from app_state where id = 1"
  );
  if (res.rowCount === 0) return { data: null, updatedAt: null };
  return {
    data: res.rows[0].data,
    updatedAt: res.rows[0].updated_at.toISOString(),
  };
}

export async function writeState(data: unknown): Promise<string> {
  const p = getPool();
  if (!p) throw new Error("No database configured");
  await ensureSchema();
  const res = await p.query<{ updated_at: Date }>(
    `insert into app_state (id, data, updated_at)
       values (1, $1::jsonb, now())
     on conflict (id) do update
       set data = excluded.data, updated_at = now()
     returning updated_at`,
    [JSON.stringify(data)]
  );
  return res.rows[0].updated_at.toISOString();
}

// --- Push subscriptions ---

export interface PushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function saveSubscription(sub: PushSub): Promise<void> {
  const p = getPool();
  if (!p) throw new Error("No database configured");
  await ensureSchema();
  await p.query(
    `insert into push_subscriptions (endpoint, sub)
       values ($1, $2::jsonb)
     on conflict (endpoint) do update set sub = excluded.sub`,
    [sub.endpoint, JSON.stringify(sub)]
  );
}

export async function deleteSubscription(endpoint: string): Promise<void> {
  const p = getPool();
  if (!p) return;
  await ensureSchema();
  await p.query("delete from push_subscriptions where endpoint = $1", [endpoint]);
}

export async function listSubscriptions(): Promise<PushSub[]> {
  const p = getPool();
  if (!p) return [];
  await ensureSchema();
  const res = await p.query<{ sub: PushSub }>("select sub from push_subscriptions");
  return res.rows.map((r) => r.sub);
}

/**
 * Claim a reminder send for today. Returns true if this is the first time the
 * (key, today) pair has been claimed — used to avoid duplicate cron sends.
 */
export async function claimSend(key: string, dateKey: string): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  await ensureSchema();
  const res = await p.query(
    `insert into push_sent (key, sent_date) values ($1, $2)
     on conflict (key, sent_date) do nothing`,
    [key, dateKey]
  );
  return (res.rowCount ?? 0) > 0;
}
