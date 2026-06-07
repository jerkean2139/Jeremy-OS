# Product Vision

> **Reduce noise. Increase clarity. Move the mountain.**

Jeremy OS is a personal operating system for **focus, identity, and recovery** — not a habit tracker, not a sobriety app, not a productivity dashboard. It is built to feel like a trusted mentor: calm, premium, dark-mode-first, voice-friendly, fast, and private.

---

## The mission

The mission statement lives in code as the single source of truth (`MISSION_STATEMENT` in `src/lib/codewords.ts`) and appears across the app — on the dashboard, the lock screen, and the launch command center:

> **Reduce noise. Increase clarity. Move the mountain.**

Everything in the product bends toward those three moves. One mountain at a time. Everything else is noise.

---

## Who it's for

One person, by design. Jeremy: a high-performing entrepreneur with ADHD, navigating overwhelm, anxiety, distraction, and two private habits he is working to understand — while building the **Manumation** movement and preparing for its launch.

This is a **single-user product**. No accounts, no multi-tenant, no social layer. It's his.

---

## The philosophy

### A calm mentor, not a compliance officer
The product never scolds. **No guilt. No shame. No red warnings. Only awareness.** The UI is dark, premium, and quiet on purpose — large type, soft motion, voice-first input. The feeling should be *being met*, not *being measured*.

### Awareness over compliance
The purpose is **not** to white-knuckle anything away overnight. It is to *notice*. Patterns are signals, not verdicts. The "streak" (consecutive days with zero Elevator floors) is framed in code as "a quiet signal of calm, not a scoreboard" (`calcElevatorFreeStreak` in `analytics.ts`). The habit trackers carry copy like *"No judgment, only patterns"* and *"We log to understand, never to punish."*

### Understanding over punishment
The two **key habits we're forming and nurturing** are logged discreetly and stored privately, never with shame or streak-pressure. Each log captures the surrounding context — the pressure level, the trigger, what happened in the last 15 minutes — because the goal is to learn what the habit is *for*, not to score it.

### Singular focus
**Today's Mountain** is exactly one goal. No lists, no competing priorities. The dashboard refuses to offer multiple "top priorities" because the whole thesis is that clarity comes from choosing one thing.

### Honest, gentle daily rhythm
- **Morning** sets the tone before the noise begins: what's true, the mountain, the pressure, the win.
- **Pulse** asks one honest question every 15 minutes: *Mountain or Noise?*
- **Evening reflection** closes the day "with honesty, not a scorecard": the win, the heaviest pressure, whether the mountain moved, and what was learned.

### Private by default
Data lives on-device first (localStorage). Optional Postgres sync is single-row and single-user. An optional passcode lock sits in front of the whole app. The private habits never surface clinical terms — only the calm code words.

---

## The point

From the project's own words:

> The purpose isn't to white-knuckle anything away overnight. It's to **reduce noise, build awareness, create singular focus, and launch Manumation** — becoming the person capable of sustaining success once it arrives.

Manumation is the summit. The product exists to help Jeremy become the person capable of reaching it *and* of sustaining the success that follows.

---

## Success metric

Two ways to read "is this working":

1. **The headline number — Distance to Launch.** The Manumation Command Center rolls funnel, content, outbound, summit planning, and team readiness into one number: **Distance to Launch** (`100 − average readiness`). That is the mountain made measurable.

2. **The deeper metric — awareness.** Success is not zero Floors or zero Acts. Success is *seeing the pattern*: understanding the link between pressure, sleep, focus, and the key habits, and reliably pointing back at the one next move. Calm clarity that compounds. The product is winning when noise is down, focus (pulses on the Mountain) is up, and the next move is obvious.
