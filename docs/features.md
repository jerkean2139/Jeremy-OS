# Features

A per-feature reference: what it does, its route, and the files that implement it. Two of these — the Elevator and Theater trackers — are the **key habits we're forming and nurturing**, logged discreetly and without judgment.

Bottom navigation (`src/components/BottomNav.tsx`) surfaces five destinations: **Today** (`/`), **Pulse** (`/pulse`), **Summit** (`/manumation`), **Patterns** (`/analytics`), **Coach** (`/coach`). Morning, Reflection, Elevator, and Theater are reached from the dashboard.

---

## Dashboard — "Today"

- **What it does**: The home screen. Shows the date + greeting + mission statement, then the day's core cards (Mission Control, Today's Mountain, Pressure, Vitals), a 3-tile snapshot (Floors today, Acts today, Elevator-free Streak), a Pulse entry point, and quick actions for the two key-habit logs plus Morning/Reflection. Ends with a one-line current-pressure summary.
- **Route**: `/`
- **Files**: `src/app/page.tsx`; dashboard sections in `src/components/dashboard/` (`MissionControl.tsx`, `MountainCard.tsx`, `PressureCard.tsx`, `VitalsCard.tsx`); `src/components/StatTile.tsx`. Reads `floorsOn`, `actsOn`, `calcElevatorFreeStreak` from `analytics.ts`.

### Mission Control (within Dashboard)
- Editable identity statement — "Who am I becoming?". Backed by `identity` / `setIdentity` in the store. Default lines come from `DEFAULT_IDENTITY` in `codewords.ts`.

### Today's Mountain (within Dashboard)
- Exactly one goal. No lists, no competing priorities. Backed by `DayEntry.mountain`.

### Pressure (within Dashboard)
- A 1–10 read plus multi-select pressure sources (`PRESSURE_SOURCES`), trended over time. Uses `src/components/PressureMeter.tsx`.

---

## Morning Check-In

- **What it does**: Voice-first start to the day — what is true, the mountain, the pressure, the win. Generates an AI summary ("Today, in focus"), with a local fallback when no AI is configured. Saving seeds the day's mountain and returns to the dashboard.
- **Route**: `/morning`
- **Files**: `src/app/morning/page.tsx`; `src/components/VoiceField.tsx` + `src/hooks/useVoice.ts` (Web Speech API); calls `/api/coach` with `mode: "summary"`. Persists via `saveMorning`.

## Pulse

- **What it does**: A 15-minute awareness loop. A ring timer (intervals 15/25/30/60m) counts down; when it elapses it fires a gentle nudge (notification + vibration) and opens a capture sheet asking *"What are you doing right now — Mountain or Noise?"*. Each capture is tagged Mountain / Admin / Noise and saved. Shows today's pulse summary (focus %, counts by tag) and a timeline. Reminders fire while the app is open. Manual "+ Log now" is available anytime. Timer state persists across navigation/reload.
- **Route**: `/pulse`
- **Files**: `src/app/pulse/page.tsx`; `src/components/VoiceField.tsx`; `pulsesOn` / `summarizePulses` from `analytics.ts`. Persists via `addPulseLog`.

## The Elevator — key habit tracker

- **What it does**: A discreet, no-judgment log for one of the key habits we're forming and nurturing ("I Took The Elevator"). Captures the count (**Floors**, 1–5 quick-pick), the pressure right now, what happened in the last 15 minutes (`ELEVATOR_TRIGGERS`), and an optional note. Shows total Floors today. Copy: "A moment of awareness, not a verdict."
- **Route**: `/elevator`
- **Files**: `src/app/elevator/page.tsx`; `PressureMeter`, `Chip`. Persists via `addElevatorLog`. The "Elevator-free Streak" derives from `calcElevatorFreeStreak`.

## The Theater — key habit tracker

- **What it does**: A private, quiet log for the other key habit ("I Entered The Theater"). Captures the count (**Acts**, 1–5 quick-pick), the pressure right now, and a free-text trigger. Explicit copy: "Stored privately on this device. No streaks. No shame. Only awareness."
- **Route**: `/theater`
- **Files**: `src/app/theater/page.tsx`; `PressureMeter`. Persists via `addTheaterLog`.

## AI Recovery Coach

- **What it does**: A calm coach, mirror, strategic advisor, and pattern detector — **never a therapist**, never diagnosing. It reasons over the last ~14 days of pressure, the key habits, sleep, and focus (built from `buildSeries` + `correlations` + the Elevator-free streak) to spot patterns and point at the single next move. Chat UI with suggested starters and a clearable history. Powered by OpenAI when configured, with a built-in offline rule-based mentor engine so it always works.
- **Route**: `/coach`
- **Files**: `src/app/coach/page.tsx` (builds the context, manages chat); `src/app/api/coach/route.ts` (system prompt, OpenAI call, `localEngine` fallback). Persists via `addCoachMessage` / `clearCoach`.

## Evening Reflection

- **What it does**: Closes the day "with honesty, not a scorecard" — today's win, the biggest pressure, "Did I move the mountain?" (Yes / Partly / Not today), and what was learned. Sets `DayEntry.movedMountain`.
- **Route**: `/reflection`
- **Files**: `src/app/reflection/page.tsx`; `VoiceField`. Persists via `saveReflection`.

## Manumation Command Center — "Summit"

- **What it does**: The launch dashboard. Five 0–100 sliders (Funnel Completion, Content Loaded, Outbound Status, Summit Planning, Team Readiness) plus a target launch date roll up into one hero number: **Distance to Launch** = `100 − average readiness`. The one distance that matters.
- **Route**: `/manumation`
- **Files**: `src/app/manumation/page.tsx`; `Slider`, `Progress`. Backed by `manumation` / `setManumation` (`ManumationState`).

## Analytics — "Patterns"

- **What it does**: Awareness made visible. Trend charts over Week / Month / Quarter ranges and auto-detected correlations (Pearson `r`): Pressure vs Elevator, Pressure vs Theater, Sleep vs Pressure, Weight vs Elevator, Productive days vs Elevator, Focus vs Pressure, Focus vs Elevator. Patterns are framed as signals, not verdicts.
- **Route**: `/analytics`
- **Files**: `src/app/analytics/page.tsx`; `src/components/charts/TrendChart.tsx` (Recharts); `buildSeries` + `correlations` from `analytics.ts`.

## Passcode Lock

- **What it does**: Optional single-user gate. When `APP_PASSCODE` is set, the whole app and its data APIs sit behind a passcode; visitors land on `/unlock`. A correct passcode sets an `HttpOnly`, `Secure`, 30-day cookie; the raw passcode never reaches the browser. When unset, the app is open (e.g. local dev).
- **Route**: `/unlock` (gate enforced in `src/middleware.ts`)
- **Files**: `src/middleware.ts`, `src/app/unlock/page.tsx`, `src/app/api/auth/route.ts`, `src/lib/auth-token.ts`. The bottom nav hides itself on `/unlock`.

---

## Cross-cutting plumbing

- **Sync**: `src/components/SyncProvider.tsx` + `src/lib/sync.ts` + `src/app/api/state/route.ts` + `src/lib/db.ts` — optional Postgres single-row sync. See [`architecture.md`](./architecture.md).
- **PWA**: `src/components/PWARegister.tsx` + `public/manifest.json` + `public/sw.js`.
- **Hydration**: every page body is wrapped in `src/components/HydrationGate.tsx`.
