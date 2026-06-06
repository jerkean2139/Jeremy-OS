# Jeremy OS

> Reduce noise. Increase clarity. Move the mountain.

A mobile-first Progressive Web App that acts as a **personal operating system for focus, identity, and recovery** — not a habit tracker, not a sobriety app. Built for a high-performing ADHD entrepreneur navigating overwhelm, anxiety, distraction, and private habits, while building the **Manumation** movement.

It is designed to feel like a trusted mentor, not a compliance officer: calm, premium, dark-mode-first. No guilt. No shame. No red warnings. Only awareness.

---

## The language (code words)

The dashboard never uses clinical or addiction terms. It speaks privately:

| Code word | Meaning |
|-----------|---------|
| **Elevator** / **Floors** | THC usage / number of sessions |
| **Theater** / **Acts** | Porn usage / number of sessions |
| **Pressure** | Anxiety level (1–10) |
| **Mountain** | The single most important goal |
| **Noise** | Distractions |

These live in one place: `src/lib/codewords.ts`.

---

## Features

- **Dashboard** — date + greeting, mission statement, and live snapshot (Pressure, Weight, Sleep, Floors, Acts, Streak).
  - **Mission Control** — editable daily identity statement ("Who am I becoming?").
  - **Today's Mountain** — exactly one goal. No lists, no multiple priorities.
  - **Pressure Meter** — 1–10 slider + multi-select pressure sources, trended over time.
- **Morning Check-In** — voice-first (Web Speech API): what's true, the mountain, the pressure, the win. Generates an AI summary.
- **Elevator Tracking** — "I Took The Elevator": floors, pressure, what happened in the last 15 minutes (triggers), optional note.
- **Theater Tracking** — "I Entered The Theater": acts, pressure, trigger. Private. No streak-shaming.
- **AI Recovery Coach** — coach / mirror / strategic advisor / pattern detector. Never a therapist, never diagnoses. Reads your last two weeks to spot patterns. Powered by OpenAI, with a built-in offline fallback.
- **Daily Reflection** — evening: today's win, biggest pressure, did I move the mountain, what I learned.
- **Manumation Command Center** — Funnel, Content, Outbound, Summit, Team readiness → a single **Distance to Launch** metric.
- **Analytics** — visual charts and auto-detected correlations: Pressure vs Elevator, Pressure vs Theater, Sleep vs Pressure, Weight vs Elevator, Productive Days vs Elevator. Weekly / monthly / quarterly ranges.
- **PWA** — installable, offline-capable (service worker + manifest + icons), `100dvh` safe-area-aware layout.

---

## Tech stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** with a custom calm/premium dark palette + handcrafted shadcn-style UI primitives
- **Zustand** with `localStorage` persistence (works fully offline, no account required)
- **Recharts** for analytics
- **lucide-react** icons
- **OpenAI API** (optional) for the coach + summaries
- **Supabase** (optional) for cloud sync — schema in `supabase/schema.sql`

---

## Getting started

```bash
npm install
cp .env.example .env.local   # optional — app works without it
npm run dev
```

Open http://localhost:3000. The app runs entirely on-device by default.

### Optional integrations

Set these in `.env.local`:

```bash
# AI Recovery Coach + summaries (server-side)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Cloud sync (client-side)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Without `OPENAI_API_KEY`, the coach uses a local rule-based mentor engine.
Without Supabase keys, all data stays in `localStorage`. To enable cloud sync,
apply `supabase/schema.sql` (Row Level Security included).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run typecheck` | Type-check with `tsc` |
| `npm run lint` | Lint with ESLint |

---

## Project structure

```
src/
  app/
    page.tsx              # Dashboard
    morning/              # Morning check-in (voice-first)
    elevator/             # Elevator tracking
    theater/              # Theater tracking
    reflection/           # Evening reflection
    coach/                # AI Recovery Coach
    manumation/           # Launch command center
    analytics/            # Charts + correlations
    api/coach/route.ts    # OpenAI coach + local fallback
  components/
    dashboard/            # Dashboard sections
    charts/               # Recharts wrappers
    ui/                   # Card, Button, Slider, Chip, Progress
  lib/
    store.ts              # Zustand + persistence
    types.ts              # Domain model
    codewords.ts          # The private language
    analytics.ts          # Series + correlation engine
    supabase.ts           # Optional client
  hooks/
    useVoice.ts           # Web Speech API
supabase/schema.sql       # Optional cloud schema
public/                   # manifest.json, sw.js, icons
```

---

## Deployment

Deploy the frontend to **Vercel** (zero config). Add the optional env vars in
the Vercel dashboard. For cloud sync, create a **Supabase** project and run
`supabase/schema.sql`.

---

## Philosophy

The purpose is **not** to eliminate the Elevator or the Theater immediately.
The purpose is to reduce noise, increase awareness, create singular focus, and
launch Manumation — helping become the person capable of sustaining success
after launch.
