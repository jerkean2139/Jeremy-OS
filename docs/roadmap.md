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

---

## Phase 2 — next

Reliability and intelligence improvements. None of these are built yet unless marked.

- [ ] **Reliable iOS voice via Whisper** — server-side transcription as a fallback for the Web Speech API, which is unreliable on iOS. Current voice input is browser-native (`useVoice` / Web Speech API).
- [ ] **Apple Health integration** — pull sleep, weight, and activity automatically instead of manual entry into `DayEntry`.
- [ ] **Journal search** — full-text search across morning check-ins, reflections, pulse notes, and habit-log notes.
- [ ] **AI-generated insights** — proactive, periodic pattern write-ups (not just on-demand chat), surfaced as gentle nudges.
- [ ] **Custom GPT memory** — persistent, evolving coach memory across sessions beyond the current `coachHistory` window.
- [ ] **Data export** — export the full state document (it's already a single JSON object) to a portable file for backup/portability.

---

## Guiding principle for Phase 2

Every addition must hold the line on the philosophy: **reduce noise, increase clarity, awareness over compliance.** New intelligence should make the next move more obvious, not add more to track. If a feature would introduce guilt, shame, or scoreboard pressure, it doesn't belong here.
