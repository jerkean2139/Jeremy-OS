# Architecture

How Jeremy OS is actually built. Grounded in the code — file paths are real.

---

## Overview

A single **Next.js 14 (App Router)** application in TypeScript, styled with Tailwind, that runs as an installable **PWA**. State lives in a **Zustand** store persisted to `localStorage` (instant + offline), with **optional** Postgres cloud sync layered on top. An **optional** OpenAI coach and an **optional** passcode lock complete the picture — each degrades gracefully when its env var is absent.

```
Browser (PWA)
  ├─ Zustand store  ──persist──▶  localStorage   (instant, offline, always on)
  │                                   │
  │                              sync.ts (debounced)
  │                                   ▼
  └─ fetch /api/state ───────▶  Next.js API route ──▶  Postgres (one JSONB row)   [optional]
       fetch /api/coach ─────▶  Next.js API route ──▶  OpenAI / local fallback    [optional]
       fetch /api/auth  ─────▶  Next.js API route ──▶  HttpOnly cookie            [optional]
  middleware.ts gates everything when APP_PASSCODE is set.
```

---

## Next.js App Router

- Root layout: `src/app/layout.tsx`. Sets PWA metadata, dark theme color (`#08090c`), `viewportFit: cover`, and mounts `<PWARegister />`, `<SyncProvider />`, `<BottomNav />` around a centered mobile `<main>` (`max-w-lg`, `min-h-[100dvh]`, safe-area-aware padding).
- Each feature is a route folder under `src/app/` with a `page.tsx`. Page components are client components (`"use client"`) that read the Zustand store. See [`features.md`](./features.md) for the route↔file map.
- API routes live under `src/app/api/*/route.ts`, all `runtime = "nodejs"`.

## Client-side state — Zustand + localStorage

- The store is `src/lib/store.ts`: a Zustand `create()` wrapped in the `persist` middleware.
- **Persistence**: `createJSONStorage(() => localStorage)` under the key `jeremy-os-v1`. `partialize` persists only the seven domain slices (`identity`, `days`, `elevatorLogs`, `theaterLogs`, `pulseLogs`, `manumation`, `coachHistory`) — never the transient flags.
- **Hydration**: persisted state hydrates on the client only. `onRehydrateStorage` flips `_hydrated`, and `HydrationGate` (`src/components/HydrationGate.tsx`) renders a calm spinner until then, avoiding SSR/client mismatch flashes.
- The store also holds transient, non-persisted fields: `_hydrated`, `_syncStatus`, `_lastSyncedAt`.
- Days are keyed by ISO date (`YYYY-MM-DD`) via `todayKey()`. `getDay()` returns an `emptyDay` default (pressure 5, empty mountain) when a date has no entry yet.

## Optional Postgres JSONB sync (single-row)

A deliberate single-user design: **one row, last-write-wins.**

- `src/lib/db.ts` — a lazy `pg` `Pool`. `getPool()` returns `null` when `DATABASE_URL` is absent (local-only mode). `ensureSchema()` lazily creates the table once per process — no manual migration:
  ```sql
  create table if not exists app_state (
    id int primary key default 1,
    data jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now(),
    constraint app_state_singleton check (id = 1)
  );
  ```
  `readState()` / `writeState()` read/upsert the single `id = 1` row. SSL is off by default (Railway private network); set `DATABASE_SSL=true` for external/public connections.
- `src/app/api/state/route.ts` — `GET` returns `{ configured, data, updatedAt }` (reports `configured:false` when there's no DB). `PUT` upserts the full state document. Both are `force-dynamic`.
- `src/lib/sync.ts` — the client sync engine, started by `SyncProvider`:
  1. **On load, pull** the server document. If the server has meaningful data (`isEmptyState` check), it wins and is applied to the store. If the server is empty but local has data, local is pushed up to seed it (first-run migration).
  2. **After the pull, push** on every store change, debounced ~900ms. A best-effort flush fires on `visibilitychange → hidden`.
  3. A guard flag (`applyingRemote`) prevents the pull from triggering a push loop.
- `localStorage` always remains the instant-load cache and full offline fallback. Sync status is surfaced through `_syncStatus` (`idle | local | saving | synced | offline | error`).
- `src/components/SyncProvider.tsx` simply calls `startSync()` on mount (rendered in the root layout).

> An alternative Supabase backend exists (`src/lib/supabase.ts`, `supabase/schema.sql`) but Postgres-on-Railway is the supported path.

## Passcode lock — middleware

- `src/middleware.ts` is the single-user gate. When `APP_PASSCODE` is **unset** (e.g. local dev), the gate is disabled and the app is wide open.
- When set, every page and data API requires a valid unlock cookie. `/unlock` and `/api/auth` are always allowed. API requests without a valid cookie get a `401 { error: "locked" }`; page requests get a redirect to `/unlock?next=<path>`.
- The matcher excludes Next internals and public static assets (`_next/static`, `_next/image`, `favicon.ico`, `icons/`, `manifest.json`, `sw.js`).
- The cookie token is derived from the passcode via `computeAuthToken` (`src/lib/auth-token.ts`). The raw passcode is never stored in the cookie or shipped to the browser. `src/app/api/auth/route.ts` validates the passcode and sets an `HttpOnly`, `Secure`, 30-day cookie. `src/app/unlock/page.tsx` is the entry screen.

## PWA / service worker

- Installable and offline-capable via `public/manifest.json`, `public/sw.js`, and `public/icons/*`.
- `src/components/PWARegister.tsx` registers the service worker on the client.
- The layout is mobile-first and safe-area-aware: `100dvh`, `viewportFit: cover`, `env(safe-area-inset-bottom)` padding on the bottom nav, `black-translucent` Apple status bar.

## Optional OpenAI coach with offline fallback

- `src/app/api/coach/route.ts` powers both the chat coach and the morning-summary generation.
- A fixed `SYSTEM_PROMPT` defines the coach: a calm "coach, mirror, strategic advisor, and pattern detector" — explicitly **not a therapist**, never diagnosing, no guilt or shame. It understands the code words and keeps replies short and mobile-readable.
- When `OPENAI_API_KEY` is set, it calls the OpenAI chat completions API (`OPENAI_MODEL`, default `gpt-5.4-mini`, `temperature 0.7`, `max_tokens 400`).
- When the key is **absent or the call fails**, a rule-based `localEngine()` returns mentor-style replies keyed off the user's text. The feature always works, online or off. The response reports its `source` (`openai | local | local-fallback`).
- Context for the coach is built client-side in `coach/page.tsx` from `buildSeries` + `correlations` + the Elevator-free streak (last 14 days), so the AI reasons over real recent data.

## Derived analytics (pure functions)

- `src/lib/analytics.ts` holds pure functions over store state, reused by the dashboard, the analytics page, and the coach context: `buildSeries` (daily points over a range), `correlations` (Pearson `r` across pairs like Pressure vs Elevator), `summarizePulses`, `floorsOn` / `actsOn`, and `calcElevatorFreeStreak`. Keeping these pure makes them easy to test and share.

---

## Deployment

- Target: **Railway** — web service + Postgres in one project. `railway.json` pins build/start and a healthcheck; Nixpacks auto-detects Next.js.
- `DATABASE_URL` is wired to the Railway Postgres plugin; the private network needs no SSL.
- The app binds to Railway's `PORT` automatically and runs on any Node `>= 20` host that provides `PORT` (and optionally `DATABASE_URL`).
