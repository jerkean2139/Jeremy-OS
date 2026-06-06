# Consolidation

The 360 repo-consolidation effort: reviewing every rendition Jeremy has built, deciding **keep / merge / drop**, and ending with **one focused product — not redundancy, not bloat.**

> The working inventory lives in [`GITHUB_REPO_LIST.md`](../GITHUB_REPO_LIST.md) at the repo root. That file is the live source of truth for what exists, what's been seen, and what's in scope. This doc explains the *strategy*; that file holds the *list*.

---

## The problem

Focus scattered across many repos. Jeremy's GitHub profile reports ~279 repositories; a partial search surfaced ~129; the consolidation list tracks ~36 in two groups (Group A: built-by-Jeremy/paused; Group B: references and could-help). Several lineages re-implement the same vision under different names. The goal is to stop the redundancy and converge on a single home.

## The chosen home: `jeremy-os`

**`jeremy-os` (this repo) is the chosen "home" product.** It is the leading consolidation candidate because it is the most real:

- A deployed, single-user PWA on **Railway + Postgres**.
- A coherent, documented vision (see [`product-vision.md`](./product-vision.md)) and a calm, shipped UX.
- A clean architecture with graceful degradation (see [`architecture.md`](./architecture.md)).

Other renditions are evaluated against it: what, if anything, should merge *into* `jeremy-os`, and what should be archived.

## The lineages

- **The renditions / "Donna · Jeremy OS · Agent-Mob" lineage** — the core where keep/merge/drop decisions get made. Includes `DONNA5.0`, `Donnav3`, `jeremys-os`, the Agent-Mob family (`Agent-Mob`, `agent-mob-10`, `agentmob1229`, `agentmobv3`), `KOB-COMMAND-CENTER`, `godmode`, `content-creation-tool`, `pomo-buddy`. These are **merge candidates** — review deeply, absorb the one or two genuinely worth-keeping ideas, then archive the rest.
- **The `vybekoderz` line** — `VYBEKODERZ-OS`, `vybekoderz-platform`, `vibekoderz-command-center`, etc. Treated as vision/capability inputs and merge candidates where relevant.
- **Vision / capability inputs** — tools and experiments that might feed the final product or the workflow around it: `claude_life_assistant`, `Prometheus`, `hermes-agent`, `notebooklm-skill`, `claude-obsidian`, `gohighlevel-mcp`, `ai-agent-training-center`, `JKVAULTv2`, `BedStats-UI`, the `bc3-api` / `api-basecamp` pair, and more.
- **OSS forks — reference-only** — names matching well-known open-source projects (`karpathy`, `praisonai`, `memvid`, `vibevoice`, `open-coreui`, `awesome-agent-skills`, the ML-system-design list, `metaclaw`, `ruflo`, `openviking`, `agency-agents`, `VYBEKODERZ-BASEBALL-TEAM`). These are confirm-only: identify them, don't merge them.

## How to review (per repo, read-only)

Do **not** merge anything into a target repo without explicit approval. For each repo capture: **Purpose · State · Stack · Standout · Overlap · Verdict (KEEP / MERGE-INTO-[repo] / DROP)**. Then produce a single 360 synthesis: a comparison matrix, a recommended single home product (`jeremy-os`) with what to merge in and what to archive. Review in waves — quality drops if you try to review all at once.

## Special note: the "LLM wiki pattern"

One open question in the inventory is whether the repo `openviking` is the "LLM wiki / shared-context" tool Jeremy was hunting for. Important framing:

> The "LLM wiki pattern" is a **practice**, not necessarily a single tool — markdown-in-git as shared context across chat + code.

This very `/docs` folder is that practice in action: it is the portable, model-agnostic shared brain for `jeremy-os`. See [`docs/README.md`](./README.md) for how the pattern works and how to use it. If `openviking` (or anything else) turns out to be a dedicated tool for this, it's a *reference*, not a dependency — the pattern stands on its own.

## The goal, restated

**One focused product — not redundant, not bloated.** `jeremy-os` is the home. Everything else is reviewed, absorbed for its best ideas, and then archived. See [`GITHUB_REPO_LIST.md`](../GITHUB_REPO_LIST.md) for the current state of that work.
