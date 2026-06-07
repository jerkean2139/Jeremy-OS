# Roadmap

Where Jeremy OS is and where it's going. The MVP is built and deployable; Phase 2 deepens reliability and intelligence. Status reflects what exists in the codebase today.

---

## MVP — done

The core single-user PWA is complete and shipping.

- [x] **Dashboard ("Today")** — date/greeting/mission, Mission Control identity, Today's Mountain (one goal), Pressure meter + sources, Vitals, snapshot tiles, quick actions.
- [x] **Morning Check-In** — voice-first; AI summary with offline fallback.
- [x] **Pulse** — 15-min ring timer, capture sheet, Mountain/Admin/Noise tagging, daily summary + timeline, in-app reminders + vibration.
- [x] **Key habit trackers** — Elevator (Floors) and Theater (Acts), logged discreetly with pressure + triggers, no shame, no streak-pressure.
- [x] **AI Recovery Coach** — pattern-aware chat over the last ~2 weeks; OpenAI when configured, rule-based offline engine otherwise.
- [x] **Evening Reflection** — win, biggest pressure, "moved the mountain?", learning.
- [x] **Manumation Command Center ("Summit")** — five readiness sliders → Distance to Launch.
- [x] **Analytics ("Patterns")** — trend charts + auto-detected correlations, Week/Month/Quarter.
- [x] **Passcode lock** — middleware gate, `/unlock`, HttpOnly cookie (optional).
- [x] **PWA** — installable, offline-capable (manifest + service worker + icons), mobile-first safe-area layout.
- [x] **Persistence & sync** — Zustand + localStorage; optional single-row Postgres JSONB sync; Railway deploy config.
- [x] **Background Web Push** — VAPID Web Push for morning, reflection, and Pulse reminders that fire when the app is closed. Subscriptions stored in Postgres (`push_subscriptions`); a secret-gated cron endpoint (`/api/push/cron`) sweeps reminder prefs and sends due notifications (de-duped via `push_sent`). Driven by `.github/workflows/reminders-cron.yml`. Configured on `/reminders`. Requires VAPID keys + `CRON_SECRET` + `REMINDER_TZ`.
- [x] **Reliable iOS voice via Whisper** — server-side transcription (`/api/transcribe`, default `gpt-4o-mini-transcribe`) as the voice path where the Web Speech API fails (notably installed iOS PWAs). `VoiceField` auto-selects: Web Speech on desktop/Android, record→Whisper on iOS (`useRecorder`), type-only fallback otherwise.
- [x] **AI-generated insights** — proactive pattern write-ups surfaced unprompted on the dashboard (`InsightCard`). A deterministic engine (`lib/insights.ts`) always produces one calm observation + one small action; the coach (`mode:"insight"`) refines the wording once per day when an AI key is configured (cached in localStorage). Tone-aware (lift / calm / watch), never shame.
- [x] **History & edit past days** — `/history` lists every day with data; `/history/[date]` edits the day's mountain, pressure + sources, sleep, weight, and "moved the mountain?", links to date-scoped morning/reflection editing (`?date=`), and lets you delete stray habit/pulse logs.
- [x] **Data export & backup** — `/backup` exports a full JSON snapshot (re-importable to restore/move devices) and a daily-series CSV; restore validates the file and confirms before replacing local state (syncs up if cloud sync is on).
- [x] **Journal search** — `/search`: instant on-device full-text search across morning check-ins, reflections, pulse notes, habit-log notes, and each day's mountain (`lib/search.ts`), with match highlighting and deep links to the right editor.
- [x] **Coach memory** — persistent, editable facts the coach carries across sessions (`coachMemory`), injected into every reply. Managed from a "Coach remembers" panel on `/coach`; "Learn from this chat" distills durable notes via the coach (`mode:"memory"`, AI-only).
- [x] **Weekly Review** — `/review`: a calm auto-generated digest of the last 7 days (`lib/review.ts`) — Elevator-free days, mountain progress, avg pressure/sleep, focus %, the week's strongest pattern, a named win, and one move for next week. Optional AI narrative (`mode:"review"`), cached per week.

---

## Phase 2 — next

Reliability and intelligence improvements. None of these are built yet unless marked.

- [ ] **Apple Health integration** — pull sleep, weight, and activity automatically instead of manual entry into `DayEntry`.

---

## Guiding principle for Phase 2

Every addition must hold the line on the philosophy: **reduce noise, increase clarity, awareness over compliance.** New intelligence should make the next move more obvious, not add more to track. If a feature would introduce guilt, shame, or scoreboard pressure, it doesn't belong here.
