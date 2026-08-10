# Handoff: Execute Phase 0 of the Enterprise Workflow Prototype

This document summarizes a planning conversation so a fresh agent session can execute **Phase 0** without any other context. Read `docs/workflow/MASTER-PLAN.md` first — it is the source of truth for scope. This file adds the context and decisions behind it.

## Project context

The owner (Dixon) is preparing a Cursor Field Engineer interview exercise: build a working prototype on the **Cursor SDK** (`@cursor/sdk`, TypeScript) that solves a non-trivial enterprise SDLC problem, demoed live in ~20 minutes with Q&A, including extending part of it live.

**The framing:** a successful online gaming enterprise (the existing Memory Palace game in this repo) streamlines bug fixes, incidents, and feature requests from thousands of customers. The pipeline: users submit @bug/@incident/@feature via a UI portal → a Cursor cloud agent triages against the codebase → a prioritization service scores and queues → another Cursor cloud agent implements the change and opens a GitHub PR for human review → the submitter gets status updates. A Reddit scanner feeds community posts into the same pipeline.

## Decisions already made (do not re-litigate)

1. **Real Jira Cloud integration** (REST v3, API-token basic auth). Local SQLite is the source of truth for the queue; Jira mirrors state for humans.
2. **One Jira ticket per request, created immediately at intake, enriched in place** — never a second ticket. The board's five columns are the visible state machine: New / Awaiting Triage → Triaged → Ready for Execution → In Progress → PR / Human Review.
3. **Real Reddit** (test subreddit, polled read-only via public `new.json`) — Phase 5, not now.
4. **Architecture:** thin portal pages inside the Next.js game app + a standalone TypeScript orchestrator service in `orchestrator/` (Hono HTTP API + better-sqlite3 + reconciliation loop). All settings come from `workflow.config.json` — no hardcoded repo/project values anywhere.
5. **Trigger model: push-first, loop as safety net.** No inbound webhooks. Intake triggers triage in-process; agent completion is observed via `await run.wait()`. The reconciliation loop handles only: the WIP-limited execution gate, recovery of stranded tickets, and (later) Reddit polling.
6. **Cursor SDK agents run in cloud runtime** against the GitHub repo `dkav1122/memory-palace` (triage: no PR; execution: `autoCreatePR: true`, `skipReviewerRequest: true`).
7. **No setup wizard** — it is a documented future extension only (design doc, Phase 6).
8. **Delivery model: one phase per PR.** For each phase: write `docs/phases/phase-N-<slug>.md` (file-by-file scope, contracts, prompts, validation checklist, non-goals) → owner approves → implement on branch `phase-N-<slug>` cut from latest `main` → open PR with validation results → owner reviews and merges before the next phase starts.

## Repo facts (verified during planning)

- Next.js 16.2.10 / React 19, App Router, Tailwind v4; game state is entirely client-side (IndexedDB via `idb-keyval`, localStorage, zustand). No server DB, no auth.
- Only existing API route: `app/api/generate-card-image/route.ts` (OpenAI image proxy) — follow its pattern for env handling.
- GitHub remote: `https://github.com/dkav1122/memory-palace.git`. Planning happened on branch `system_plan`.
- Existing root docs (`DESIGN.md`, `PLAN.md`, `HANDOFF.md`) describe the game — leave them alone; workflow docs live in `docs/workflow/` and `docs/phases/`.
- Repo rule: this Next.js version may differ from training data — read `node_modules/next/dist/docs/` before writing Next.js code.

## Cursor SDK notes (from the SDK skill)

- TypeScript package `@cursor/sdk`; auth via `CURSOR_API_KEY` (pass explicitly in service code).
- Cloud runtime: always set `cloud: { repos: [...] }` explicitly (omitting it silently falls back to local).
- Dispose agents (`await using`); always `await run.wait()`; log `agent.agentId` and `run.id` right after `send()`.
- Two failure kinds: thrown `CursorAgentError` = run never started (retry/env fix); `result.status === "error"` = ran and failed (mark failed, don't blind-retry).
- No JSON mode — demand fenced JSON in prompts, parse tolerantly, retry once on malformed output.
- Validate model IDs via `Cursor.models.list()`; `composer-2.5` is a sensible default.

## Phase 0 scope (what to execute now)

See "Phase 0 — Foundation" in `docs/workflow/MASTER-PLAN.md`. In short:

- `orchestrator/` package: Hono API, better-sqlite3, `@cursor/sdk`, tsx; `orchestrator dev` script running API + reconciliation loop.
- SQLite schema: `requests` (with immutable `raw_submission`), `tickets`, `events`; shared types in `orchestrator/src/types.ts`.
- Jira client module: create issue, add comment, discover + execute transitions (REST v3, basic auth with email + API token).
- `workflow.config.json` + `.env.example` (`CURSOR_API_KEY`, `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`).
- One-time Jira setup: board with the five columns and matching statuses; discover transition IDs via the transitions endpoint and cache in config.
- **Validation:** service boots, health endpoint responds, DB file created, Jira client can create and transition a test issue across all five columns.

**Process reminder:** per the delivery model, the first deliverable is the phase plan doc `docs/phases/phase-0-foundation.md` for the owner's approval — then implement on branch `phase-0-foundation`.

## Blocking inputs needed from the owner

- `CURSOR_API_KEY` (personal account) and confirmation the Cursor GitHub app is installed on `dkav1122/memory-palace`.
- Jira site URL, project key, and API token; the five-column board must exist (or be created during Phase 0 setup).

## Remaining artifacts (later phases)

Design doc (`docs/WORKFLOW-DESIGN.md`), mermaid diagrams (system, sequences, state machine), and a 20-minute demo runbook (`docs/DEMO.md`) with pre-seeded fallback data — Phase 6. Future extensions to document, not build: plug-and-play setup wizard CLI, inbound webhooks (Jira approval gate, GitHub PR feedback loop), auth, email/Slack notifications.
