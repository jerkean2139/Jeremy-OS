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
