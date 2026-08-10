# Phase 0 — Foundation

Execution contract for Phase 0 of [`docs/workflow/MASTER-PLAN.md`](../workflow/MASTER-PLAN.md). Scope: orchestrator scaffold, SQLite schema, Jira REST client, config plumbing, and live validation against the real KAN board. No portal pages, no Cursor agent runs.

## Verified Jira facts (discovered via the Atlassian integration, 2026-08-10)

- Site: `https://dixonsworkspace-13267887.atlassian.net` (cloudId `d7acc9bb-a75f-4fe4-9683-55842a64cdb9`)
- Project: **KAN** ("Dixons Demo Project", id `10000`, team-managed). Issue types: Epic, Task, Story, Subtask — **no Bug type**, so all workflow tickets are created as **Task** with a `type` label (`bug` / `incident` / `feature`).
- Board statuses and transition IDs (all transitions are **global**, any status can reach any other):

| Internal status          | Jira status | Status ID | Transition ID |
| ------------------------ | ----------- | --------- | ------------- |
| `submitted` / `triaging` | To Do       | `10000`   | `11`          |
| `triaged`                | Triaged     | `10001`   | `21`          |
| `ready`                  | Ready       | `10002`   | `31`          |
| `executing`              | Executing   | `10003`   | `41`          |
| `pr_ready`               | PR Ready    | `10036`   | `2`           |

- Caveat: the transition **names** are stale Jira defaults (e.g. transition `21` is named "In Progress" but lands on **Triaged**; `41` is named "Done" but lands on **Executing**). The Jira client therefore always resolves transitions by **target status ID**, never by name.
- Discovery/test issue: `KAN-2` (`[setup] Phase 0 workflow discovery — safe to delete`) — reused by the validation script, deletable afterward.

## File-by-file scope

```
orchestrator/
  package.json          # own package: hono, @hono/node-server, better-sqlite3, @cursor/sdk, dotenv; dev: tsx
  tsconfig.json
  .gitignore            # data/ (SQLite files)
  src/
    types.ts            # RequestRecord, TicketRecord, EventRecord, InternalStatus union, config types
    config.ts           # loads + validates ../workflow.config.json and env vars; single source of settings
    db.ts               # opens SQLite at orchestrator/data/workflow.db, creates schema, typed helpers
    jira.ts             # REST v3 client (basic auth): createIssue, addComment, listTransitions, transitionToStatus
    reconciler.ts       # interval loop skeleton: tick() logs + runs no-op gates (real gates arrive in Phases 2-4)
    index.ts            # boots Hono API (GET /health) + reconciler; graceful shutdown
  scripts/
    validate-jira.ts    # creates/reuses a test issue and drives it across all five statuses via jira.ts
workflow.config.json    # repo root — all environment-specific settings (see contract below)
.env.example            # repo root — CURSOR_API_KEY, JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN
```

The game app is untouched. Root `.gitignore` gains nothing (orchestrator has its own for `data/`); `.env.example` documents variables read by the orchestrator via `dotenv` from the repo root `.env.local` or `orchestrator/.env`.

## Contracts

### SQLite schema (`db.ts`)

```sql
CREATE TABLE IF NOT EXISTS requests (
  id             TEXT PRIMARY KEY,          -- uuid
  type           TEXT NOT NULL,             -- 'bug' | 'incident' | 'feature'
  title          TEXT NOT NULL,
  raw_submission TEXT NOT NULL,             -- verbatim user input, never mutated
  submitter_name TEXT,
  submitter_contact TEXT,
  source         TEXT NOT NULL DEFAULT 'portal',  -- 'portal' | 'reddit'
  source_ref     TEXT,                      -- e.g. reddit permalink
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tickets (
  request_id     TEXT PRIMARY KEY REFERENCES requests(id),
  jira_issue_key TEXT,                      -- e.g. KAN-7
  status         TEXT NOT NULL DEFAULT 'submitted',  -- InternalStatus
  triage_json    TEXT,                      -- Phase 2
  score          REAL,                      -- Phase 3
  score_explanation TEXT,                   -- Phase 3
  pr_url         TEXT,                      -- Phase 4
  attempts       INTEGER NOT NULL DEFAULT 0,
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL REFERENCES requests(id),
  kind       TEXT NOT NULL,                 -- e.g. 'submitted', 'jira_created', 'status_changed', 'error'
  message    TEXT NOT NULL,                 -- human-readable, powers the user timeline
  data_json  TEXT,                          -- optional structured payload
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

`InternalStatus = 'submitted' | 'triaging' | 'triaged' | 'ready' | 'executing' | 'pr_ready' | 'rejected' | 'failed'`.

### `workflow.config.json`

```json
{
  "github": { "repo": "dkav1122/memory-palace" },
  "cursor": { "model": "composer-2.5" },
  "jira": {
    "baseUrl": "https://dixonsworkspace-13267887.atlassian.net",
    "projectKey": "KAN",
    "boardId": 1,
    "issueType": "Task",
    "statusMap": {
      "submitted": { "jiraStatus": "To Do", "statusId": "10000", "transitionId": "11" },
      "triaging":  { "jiraStatus": "To Do", "statusId": "10000", "transitionId": "11" },
      "triaged":   { "jiraStatus": "Triaged", "statusId": "10001", "transitionId": "21" },
      "ready":     { "jiraStatus": "Ready", "statusId": "10002", "transitionId": "31" },
      "executing": { "jiraStatus": "Executing", "statusId": "10003", "transitionId": "41" },
      "pr_ready":  { "jiraStatus": "PR Ready", "statusId": "10036", "transitionId": "2" }
    }
  },
  "reddit": { "subreddit": null },
  "execution": { "wipLimit": 1 }
}
```

Secrets never live in this file — only in env (`JIRA_EMAIL`, `JIRA_API_TOKEN`, `CURSOR_API_KEY`).

### Jira client (`jira.ts`)

- `createIssue({ summary, description, labels }): Promise<{ key, id, url }>` — `POST /rest/api/3/issue`, ADF description.
- `addComment(issueKey, markdownish): Promise<void>` — `POST /rest/api/3/issue/{key}/comment`, ADF body.
- `listTransitions(issueKey): Promise<Transition[]>` — `GET /rest/api/3/issue/{key}/transitions`.
- `transitionToStatus(issueKey, internalStatus): Promise<void>` — uses the cached `transitionId` from config; on failure re-discovers via `listTransitions` matching `to.id === statusId` and retries once.
- Auth: `Authorization: Basic base64(email:apiToken)`; errors surface Jira's response body.

### HTTP API (`index.ts`)

- `GET /health` → `{ ok: true, db: true, uptimeSec }` — Phase 0's only route. Port from `ORCH_PORT` (default `4100`).
- Reconciler: `setInterval` tick (default 15s) that currently only logs a heartbeat and counts tickets per status — the WIP gate/recovery logic lands in Phases 2–4.

## Validation checklist

1. `npm install` inside `orchestrator/` succeeds; `npm run dev` boots API + reconciler with no errors.
2. `curl localhost:4100/health` returns `{ ok: true, ... }`.
3. `orchestrator/data/workflow.db` is created with the three tables.
4. `npm run validate:jira` (requires `JIRA_EMAIL` + `JIRA_API_TOKEN` in env): creates or reuses a test issue and drives it To Do → Triaged → Ready → Executing → PR Ready → back to To Do, adding a comment at each hop; prints each transition result.
5. Board at [KAN board](https://dixonsworkspace-13267887.atlassian.net/jira/software/projects/KAN/boards/1) visibly shows the issue moving (spot-check).

## Non-goals

- No portal pages or intake endpoint (Phase 1), no Cursor agent runs (Phases 2/4) — `@cursor/sdk` is installed but unused.
- No Reddit (Phase 5), no scoring (Phase 3), no webhooks, no auth, no setup wizard (documented future extension only).
- No changes to the game app or its docs.
