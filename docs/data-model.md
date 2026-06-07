# Data Model

The complete domain model, documented from `src/lib/types.ts`. The model uses **neutral, internal names** on purpose, so the private meaning of the key habits stays consistent and discreet. The UI translates these into code words via `src/lib/codewords.ts`.

> Two of the logs below — `ElevatorLog` and `TheaterLog` — track the **key habits we're forming and nurturing**. They are stored privately and framed without judgment everywhere.

---

## Top-level state: `JeremyState`

The entire persisted app state. This is exactly what `localStorage` holds (key `jeremy-os-v1`) and what syncs to Postgres as one JSONB document.

| Field | Type | Meaning |
|-------|------|---------|
| `identity` | `IdentityStatement` | The "Who am I becoming?" lines. |
| `days` | `Record<string, DayEntry>` | One entry per calendar day, keyed by `YYYY-MM-DD`. |
| `elevatorLogs` | `ElevatorLog[]` | Timestamped logs for the first key habit (newest first). |
| `theaterLogs` | `TheaterLog[]` | Timestamped logs for the second key habit (newest first). |
| `pulseLogs` | `PulseEntry[]` | 15-minute awareness checks (newest first). |
| `manumation` | `ManumationState` | Launch readiness sliders. |
| `coachHistory` | `CoachMessage[]` | The AI coach conversation. |
| `coachMemory` | `string[]` | Durable facts the coach carries between sessions (editable; fed into every reply). |

---

## `DayEntry`

A single day's snapshot, keyed by ISO date.

Recovery metrics are entered by hand from Oura / Apple Health (no live integration by design): `weight` (lbs), `sleepHours`, `readiness` (Oura score 0–100), `sleepScore` (Oura score 0–100), `hrv` (overnight HRV, ms), `restingHr` (bpm), `steps` (walking steps). All optional. They flow into `buildSeries` → the correlation engine and the Weekly Review.

`routine?: RoutineLog` records a completed **Morning Ritual** (`completedAt`, `totalSec`, `stretchSec`, `walkSec`). Ritual completions drive `calcRoutineStreak` (in `lib/routine.ts`) and the dashboard streak; walking steps from the ritual are written to `steps`.

| Field | Type | Notes |
|-------|------|-------|
| `date` | `string` | `YYYY-MM-DD`. |
| `mountain` | `string` | Today's single primary goal. |
| `pressureLevel` | `number` | Anxiety level, 1–10. Defaults to 5 for an empty day. |
| `pressureSources` | `PressureSource[]` | What's driving the pressure. |
| `weight` | `number?` | Optional, lbs. |
| `sleepHours` | `number?` | Optional. |
| `movedMountain` | `boolean \| null?` | Set during reflection: `true` / `false` / `null` (partly). |
| `morning` | `MorningCheckIn?` | The morning check-in, if completed. |
| `reflection` | `DailyReflection?` | The evening reflection, if completed. |

## `MorningCheckIn`

| Field | Type | Notes |
|-------|------|-------|
| `whatIsTrue` | `string` | What's real right now. |
| `mountain` | `string` | The day's one goal (seeds `DayEntry.mountain`). |
| `pressure` | `string` | What's creating pressure. |
| `win` | `string` | What would make today a win. |
| `voiceTranscript` | `string?` | The combined text (voice or typed). |
| `aiSummary` | `string?` | The reflected-back summary (AI or local fallback). |
| `completedAt` | `string` | ISO timestamp. |

## `DailyReflection`

| Field | Type | Notes |
|-------|------|-------|
| `win` | `string` | Today's win — even a small one. |
| `mostPressure` | `string` | What created the most pressure. |
| `movedMountain` | `boolean \| null` | `true` (Yes) / `false` (Not today) / `null` (Partly). |
| `learned` | `string` | One insight to carry forward. |
| `voiceTranscript` | `string?` | Combined text. |
| `completedAt` | `string` | ISO timestamp. |

---

## `ElevatorLog` — first key habit

A discreet, private log for one of the key habits we're forming and nurturing. Logged without judgment.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Generated via `uid()`. |
| `timestamp` | `string` | ISO. |
| `floors` | `number` | The count for this log (the UI calls these **Floors**). |
| `pressureLevel` | `number` | 1–10, captured at the moment. |
| `triggers` | `ElevatorTrigger[]` | What happened in the last 15 minutes. |
| `note` | `string?` | Optional free note. |

**`ElevatorTrigger`** (also exported as `ELEVATOR_TRIGGERS`): `Overwhelm`, `Avoiding task`, `Financial fear`, `Client issue`, `Team issue`, `Boredom`, `Habit`, `Fatigue`, `Other`.

## `TheaterLog` — second key habit

A discreet, private log for the other key habit. Stored privately; no streaks, no shame.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Generated via `uid()`. |
| `timestamp` | `string` | ISO. |
| `acts` | `number` | The count for this log (the UI calls these **Acts**). |
| `pressureLevel` | `number` | 1–10. |
| `trigger` | `string` | Free text — e.g. stress, boredom, loneliness, habit. |

---

## `PulseEntry`

A 15-minute awareness check: *"Am I on the Mountain or in the Noise?"*

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Generated via `uid()`. |
| `timestamp` | `string` | ISO. |
| `activity` | `string` | What you were doing. |
| `tag` | `PulseTag` | `"mountain"` \| `"noise"` \| `"admin"`. |

**`PULSE_TAGS`** maps values to labels: Mountain, Admin, Noise.

## `ManumationState`

The launch command center. Each metric is 0–100. **Distance to Launch** = `100 − average(metrics)`.

| Field | Type | Notes |
|-------|------|-------|
| `funnelCompletion` | `number` | 0–100. |
| `contentLoaded` | `number` | 0–100. |
| `outboundStatus` | `number` | 0–100. |
| `summitPlanning` | `number` | 0–100. |
| `teamReadiness` | `number` | 0–100. |
| `launchDate` | `string?` | `YYYY-MM-DD` target. |

## `CoachMessage`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Generated via `uid()`. |
| `role` | `"user" \| "assistant"` | Speaker. |
| `content` | `string` | Message text. |
| `timestamp` | `string` | ISO. |

## `IdentityStatement`

| Field | Type | Notes |
|-------|------|-------|
| `lines` | `string[]` | The "Who am I becoming?" lines. Defaults from `DEFAULT_IDENTITY` in `codewords.ts`. |

---

## Supporting type: `PressureSource`

Exported as `PRESSURE_SOURCES`: `Financial`, `Health`, `Client`, `Team`, `Marriage`, `Future`, `Unknown`.

---

## Derived (not stored) — from `src/lib/analytics.ts`

These are computed on the fly, never persisted:

- **`DailyPoint`** — one day in a series: `date`, `label`, `pressure`, `floors`, `acts`, `sleep`, `weight`, `movedMountain` (1/0/null), `pulseMountain`, `pulseNoise`, `focusPct`.
- **`PulseSummary`** — `{ total, byTag, focusRatio }` for a set of pulses.
- **`Correlation`** — `{ label, value (Pearson r, −1..1), insight }`.
