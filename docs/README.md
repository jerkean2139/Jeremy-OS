# The Jeremy OS Wiki Brain

> A markdown knowledge base that acts as the single source of shared context for any AI session — Claude Code, Cowork, ChatGPT, or a human.
>
> **Mission: Reduce noise. Increase clarity. Move the mountain.**

This `/docs` folder is the "wiki brain": durable, portable, model-agnostic memory for the Jeremy OS project. It lives in git next to the code it describes, so it travels with the repo and stays honest.

---

## The LLM wiki pattern

The "LLM wiki pattern" is a **practice**, not a tool: **markdown-in-git as portable, shared context across chat and code sessions.**

The idea is simple:

- LLM chats are ephemeral — context dies when the session ends.
- A markdown wiki in the repo is **persistent, versioned, and model-agnostic.**
- Any AI (or human) can read it at the start of a session and instantly share the same ground truth — no re-explaining, no drift.
- It's diffable: every change to the shared understanding shows up in git history.

**How to use it:**

1. **At the start of a session**, point your AI at the relevant doc(s). For broad work, start with [`/CLAUDE.md`](../CLAUDE.md) (the operating guide) then dive into the doc you need.
2. **While working**, treat these docs as the source of truth for *how things are*, and the code as the source of truth for *what is*. When they disagree, the code wins — then update the doc.
3. **When something meaningful changes** (a new feature, an architectural decision, a convention), update the wiki in the same change so the next session inherits it.

Keep entries calm, clear, and grounded in the actual code. This is a mentor's notebook, not marketing.

---

## Table of contents

| Doc | What it covers |
|-----|----------------|
| [`product-vision.md`](./product-vision.md) | The mission, philosophy, who it's for, and the success metric. |
| [`architecture.md`](./architecture.md) | The real system: App Router, Zustand + localStorage, optional Postgres JSONB sync, passcode middleware, PWA, the optional AI coach. |
| [`data-model.md`](./data-model.md) | Every type in `src/lib/types.ts`, documented as a clean reference. |
| [`features.md`](./features.md) | A per-feature reference: what it does, its route, the files that implement it. |
| [`conventions.md`](./conventions.md) | Coding conventions observed across the codebase. |
| [`roadmap.md`](./roadmap.md) | MVP (done) vs Phase 2, with status marks. |
| [`consolidation.md`](./consolidation.md) | The 360 repo-consolidation effort and where `jeremy-os` fits. |

**Also at the repo root (read but not part of this folder):**
[`README.md`](../README.md) (developer-facing), [`OVERVIEW.md`](../OVERVIEW.md) (vision), and [`GITHUB_REPO_LIST.md`](../GITHUB_REPO_LIST.md) (the consolidation inventory).

---

## A note on language

The two private habit trackers are referred to **discreetly** throughout these docs as **"key habits we're forming and nurturing."** The app's code words (Elevator/Floors, Theater/Acts, Pressure, Mountain, Noise) are the only language the product speaks. See [`product-vision.md`](./product-vision.md) and [`data-model.md`](./data-model.md) for details.
