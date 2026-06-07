# CLAUDE.md — Operating Guide for AI Sessions

> **Jeremy OS** is a mobile-first PWA that acts as a personal operating system for focus, identity, and recovery — a calm, premium, dark-mode mentor for a high-performing ADHD entrepreneur building the **Manumation** movement.
>
> **Mission: Reduce noise. Increase clarity. Move the mountain.**

This file is read at the start of every session (Claude Code, Cowork, ChatGPT, etc.). Keep it skimmable. The deeper wiki lives in [`/docs`](./docs/README.md).

---

## Tone & posture

This is a calm mentor, never a compliance officer. **No guilt, no shame, no red warnings — only awareness.** Match that tone in code, copy, and conversation. Awareness over compliance; understanding over punishment.

---

## Code words (private language) — READ THIS

The UI never uses clinical or addiction terms. It speaks in code words. The single source of truth is [`src/lib/codewords.ts`](./src/lib/codewords.ts). When discussing these, be **discreet**: refer to the two habit trackers as **"key habits we're forming and nurturing,"** not by their clinical meaning.

| Code word | Count | Private meaning |
|-----------|-------|-----------------|
| **Elevator** | **Floors** | A private substance habit (a key habit we're forming and nurturing) |
| **Theater** | **Acts** | A private habit (a key habit we're forming and nurturing) |
| **Pressure** | — | Anxiety level (1–10) |
| **Mountain** | — | The single most important goal |
| **Noise** | — | Distractions |

The data model uses neutral internal names (`elevatorLogs`, `theaterLogs`, `floors`, `acts`) so the meaning stays private and consistent.

---

## Tech stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** — custom calm/dark palette + handcrafted shadcn-style UI primitives
- **Zustand** + `localStorage` persistence (works fully offline, no account)
- **Postgres** (optional) — single-row JSONB cloud sync, deployed on **Railway**
- **Recharts** (analytics), **lucide-react** (icons)
- **OpenAI API** (optional) for the coach + summaries, with an offline rule-based fallback
- Node `>= 20`

## Run / build / check

```bash
npm install
cp .env.example .env.local   # optional — app works without it
npm run dev                  # http://localhost:3000
npm run build                # production build
npm start                    # run the production build
npm run typecheck            # tsc --noEmit
npm run lint                 # next lint
```

The app runs entirely on-device by default. Optional env vars (all server-side):
`APP_PASSCODE` (passcode lock), `OPENAI_API_KEY` / `OPENAI_MODEL` (AI coach),
`DATABASE_URL` / `DATABASE_SSL` (Postgres sync), `SLACK_TOKEN` (the 7am Slack briefing).

---

## Directory map

```
src/
  app/
    page.tsx              # Dashboard (Today)
    morning/              # Morning check-in (voice-first)
    routine/              # Morning Ritual: timed check-in → stretch → walk → read → briefing
    pulse/                # 15-min "Mountain or Noise?" timer + capture
    elevator/             # Elevator tracker (key habit)
    theater/              # Theater tracker (key habit)
    reflection/           # Evening reflection
    scripture/            # Daily Word: one-year Bible plan (OT+NT) + AI "what it means"
    habits/               # Atomic Habits hub: build/break habits via the 4 Laws
    coach/                # AI Recovery Coach
    manumation/           # Launch command center (Distance to Launch)
    analytics/            # Charts + auto-detected correlations
    unlock/               # Passcode screen
    api/coach/route.ts    # OpenAI coach + local fallback
    api/tts/route.ts      # OpenAI text-to-speech (premium voice) or 204 -> browser fallback
    api/state/route.ts    # Postgres state GET/PUT (single user)
    api/slack/route.ts    # 7am Slack briefing (unreads + mentions + AI triage), cached
    api/scripture/route.ts # Daily Word: WEB Bible text (free API) + AI reflection, cached
    api/auth/route.ts     # Passcode -> HttpOnly cookie
    layout.tsx            # Root layout: BottomNav, PWARegister, SyncProvider
  components/
    dashboard/            # MissionControl, MountainCard, PressureCard, VitalsCard
    charts/               # TrendChart (Recharts wrapper)
    ui/                   # Card, Button, Slider, Chip, Progress
    HydrationGate, BottomNav, PageHeader, PressureMeter, StatTile,
    VoiceField, VoiceChat, SyncProvider, PWARegister
  lib/
    types.ts              # Domain model
    routine.ts            # Morning Ritual: stretch sequence, walk targets, streak
    bible.ts              # One-year Bible reading plan (OT+NT daily), pure functions
    habits.ts             # Atomic Habits: streaks, "never miss twice", identity votes
    store.ts              # Zustand + persistence
    codewords.ts          # The private language (source of truth)
    analytics.ts          # Series + correlation engine (pure functions)
    db.ts                 # Postgres pool + schema + read/write
    sync.ts               # Pull-on-load, debounced push
    auth-token.ts         # Passcode -> cookie token
    utils.ts              # todayKey, uid, greeting, pressureColor, cn
    supabase.ts           # Optional alternative client
  hooks/useVoice.ts       # Web Speech API (speech-to-text)
  hooks/useSpeech.ts      # Text-to-speech: premium /api/tts → browser fallback
  middleware.ts           # Passcode gate
public/                   # manifest.json, sw.js, icons
railway.json              # Railway build/deploy
supabase/schema.sql       # Optional alternative cloud schema
```

---

## Key architectural decisions

1. **Single-user by design.** No auth model, no multi-tenant. One person, one state document. Sync is last-write-wins.
2. **localStorage first, Postgres optional.** Zustand persists to `localStorage` (instant, offline). When `DATABASE_URL` is set, the whole state syncs to Postgres as **one JSONB row** (`app_state`, `id = 1`). On load the server document wins; if the server is empty, local seeds it. See `db.ts` + `sync.ts` + `api/state/route.ts`.
3. **Passcode lock via middleware.** When `APP_PASSCODE` is set, `middleware.ts` gates every page and API; visitors go to `/unlock`, APIs return `401`. A correct passcode sets an `HttpOnly`, `Secure`, 30-day cookie. The raw passcode never reaches the browser or the cookie.
4. **Code words as the only language.** Clinical terms never appear in the UI. `codewords.ts` is the single source of truth.
5. **Calm AI with offline fallback.** The coach uses OpenAI when `OPENAI_API_KEY` is set, otherwise a local rule-based mentor engine in `api/coach/route.ts`. The feature always works.
6. **PWA.** Installable, offline-capable (`manifest.json` + `sw.js`), `100dvh` safe-area-aware mobile layout.

---

## Conventions (quick)

- **`"use client"` + `HydrationGate`**: persisted state hydrates client-side only; wrap page bodies in `HydrationGate` to avoid SSR/client mismatch flashes.
- **UI primitives** live in `components/ui`; compose them, don't reinvent.
- **Code words** come from `codewords.ts` — never hardcode the private language.
- **Styling**: calm/dark/mobile-first. Palette names: `ink` (backgrounds), `mist` (text), `sage` (positive/focus), `ember` (warm caution, never alarm), `sky` (accent/admin). Use `cn()` from `utils.ts` to merge classes.
- **Analytics** are pure functions over store state (`analytics.ts`) so they're reusable across dashboard, analytics page, and coach context.

See [`docs/conventions.md`](./docs/conventions.md) for the full set.

---

## The wiki brain → `/docs`

`/docs` is the portable, model-agnostic shared memory for this repo (the "LLM wiki pattern": markdown-in-git). Start there for anything beyond this guide:

- [`docs/README.md`](./docs/README.md) — index + how to use the wiki
- [`docs/product-vision.md`](./docs/product-vision.md) — mission & philosophy
- [`docs/architecture.md`](./docs/architecture.md) — how it's built
- [`docs/data-model.md`](./docs/data-model.md) — every type, documented
- [`docs/features.md`](./docs/features.md) — per-feature reference
- [`docs/conventions.md`](./docs/conventions.md) — coding conventions
- [`docs/roadmap.md`](./docs/roadmap.md) — MVP vs Phase 2
- [`docs/consolidation.md`](./docs/consolidation.md) — the 360 repo-consolidation effort
