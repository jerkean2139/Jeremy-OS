# Conventions

Patterns observed across the codebase. Follow them so new work feels like it belongs.

---

## Code words are the only language

- The product never shows clinical or addiction terms. It speaks in **code words**, and the single source of truth is `src/lib/codewords.ts` (`CODE_WORDS`, `MISSION_STATEMENT`, `DEFAULT_IDENTITY`, `MOUNTAIN_EXAMPLES`).
- Never hardcode the private language in a component. Pull labels from `codewords.ts`.
- The **data model uses neutral internal names** (`elevatorLogs`, `theaterLogs`, `floors`, `acts`, `pressureLevel`) so meaning stays private and consistent; the UI translates.
- In docs and conversation, refer to the two habit trackers **discreetly** as "key habits we're forming and nurturing." Even the AI coach's system prompt avoids clinical labels.

## Tone & copy

- Calm mentor, never compliance officer. **No guilt, no shame, no red warnings — only awareness.** Microcopy reflects this: "No judgment, only patterns", "We log to understand, never to punish", "Awareness is the work."
- Keep copy short, warm, and direct. Mobile-readable.

## `"use client"` + `HydrationGate`

- Feature pages are client components (`"use client"`) because they read the persisted Zustand store.
- Persisted state hydrates on the client only. Each page renders its body inside `HydrationGate` (`src/components/HydrationGate.tsx`), which shows a calm spinner until `_hydrated` is true — preventing SSR/client mismatch flashes. The standard shape:
  ```tsx
  export default function FooPage() {
    return (
      <HydrationGate>
        <Foo />
      </HydrationGate>
    );
  }
  ```

## State access

- Read the store with selectors: `useStore((s) => s.something)` — not the whole store — to keep re-renders tight.
- Mutations go through store actions (`updateDay`, `addElevatorLog`, `saveMorning`, `setManumation`, etc.), never by mutating state directly. New logs prepend (newest first) and get an `id` + `timestamp` from the store.
- Derived numbers come from pure functions in `src/lib/analytics.ts` (`buildSeries`, `correlations`, `floorsOn`, `actsOn`, `calcElevatorFreeStreak`, `summarizePulses`) — reuse them rather than recomputing inline.
- Days are keyed by `todayKey()` (`YYYY-MM-DD`); generate ids with `uid()`. Both live in `src/lib/utils.ts`.

## UI primitives

- Compose the handcrafted shadcn-style primitives in `src/components/ui/`: `Card` (`CardContent`, `CardHeader`, `CardTitle`), `Button`, `Slider`, `Chip`, `Progress`. Don't reinvent them inline.
- Shared building blocks live one level up: `PageHeader` (title/subtitle/back), `PressureMeter`, `StatTile`, `VoiceField`, `BottomNav`.
- Merge class names with `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge).

## Styling — calm, dark, mobile-first

- Dark mode is the only mode (`<html class="dark">`, `darkMode: "class"`). Layout is centered and mobile-first: `max-w-lg`, `100dvh`, `viewportFit: cover`, safe-area-aware padding.
- Soft motion only: `animate-fade-in`, `animate-pulse-soft` (defined in `tailwind.config.ts`). No alarms, no flashing.
- Use the custom palette names (from `tailwind.config.ts`):
  | Name | Role | Notes |
  |------|------|-------|
  | `ink` (950–600) | Backgrounds, borders | Deep neutral dark. |
  | `mist` (50–500) | Text | 50 = brightest, 500 = muted. |
  | `sage` (400–600) | Positive / focus / "on Mountain" | The calm green. |
  | `ember` (400–500) | Warm caution | Used gently — never as a red alarm. |
  | `sky` (400–500) | Accent / admin / Summit | The cool blue. |
- Prefer `tabular-nums` for figures, generous radii (`rounded-2xl`/`3xl`), and subtle gradients (`from-sage-500/10 to-sky-500/5`).

## Voice-first input

- Text entry that benefits from speech uses `VoiceField` + the `useVoice` hook (Web Speech API, `src/hooks/useVoice.ts`). It degrades gracefully when the API is unavailable.

## API routes & graceful degradation

- API routes set `runtime = "nodejs"`; state routes are `force-dynamic`.
- Every optional integration degrades gracefully: no `DATABASE_URL` → localStorage-only (`configured:false`); no `OPENAI_API_KEY` → local coach engine; no `APP_PASSCODE` → no gate. Server reads `process.env` directly; secrets have **no** `NEXT_PUBLIC_` prefix.
- Client fetches always wrap in try/catch with a calm fallback (e.g. the coach's offline reply, the morning local summary).

## TypeScript

- The domain model is centralized in `src/lib/types.ts`; exported const arrays (`PRESSURE_SOURCES`, `ELEVATOR_TRIGGERS`, `PULSE_TAGS`) pair with their union types. Import types with `import { type Foo }`.
- Run `npm run typecheck` and `npm run lint` before considering work done.
