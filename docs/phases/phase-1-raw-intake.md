# Phase 1 — Raw intake + immediate Jira ticket

Execution contract for Phase 1 of [`docs/workflow/MASTER-PLAN.md`](../workflow/MASTER-PLAN.md). Scope: the intake API on the orchestrator (`POST /api/requests`, `GET /api/requests/:id`), a minimal Jira ticket created at submit time in Column 1, and the portal pages `/support` and `/support/[id]` in the game app. No agent runs, no triage worker.

Branch: `phase-1-raw-intake` cut from `main` (Phase 0 merged as `d1725aa`).

## Design decisions (proposed, approve or veto)

1. **Browser → orchestrator directly, with CORS.** The portal pages call `http://localhost:4100` straight from the browser; the orchestrator enables `hono/cors` (permissive — no auth, no credentials, demo scope). This keeps the game app untouched except for the two new pages (no `next.config.ts` proxy/rewrites). Portal reads the base URL from `NEXT_PUBLIC_ORCH_URL`, defaulting to `http://localhost:4100`.
2. **The submission is never lost, even if Jira is down.** Intake writes the request + ticket + `submitted` event in one SQLite transaction *first*, then creates the Jira issue. If Jira creation fails, the API still returns `201` with `jira: null`, and an `error` event lands on the timeline ("Jira sync failed — will be retried"). Backfilling stranded tickets is the reconciler's job and arrives with recovery logic in Phase 2 — in Phase 1 a failed Jira create is visible but not auto-retried.
3. **No triage trigger yet.** Per the master plan, Phase 1 only marks the request eligible for triage: ticket status stays `submitted`, which is exactly what the Phase 2 worker will claim. The in-process "intake POST triggers triage" hook is added in Phase 2 where the worker exists; adding a no-op hook now would be dead code.
4. **Portal styling follows the home page** (sky gradient, `bg-white/70` cards, sky borders, emerald accents) — the support portal is user-facing like the landing page, not a dark utility screen. One `Support` link is added to the home page nav cards so the portal is reachable in the demo; this is the only touch to an existing game file.
5. **No shared types package.** The portal duplicates the tiny request/response types in `lib/support.ts` rather than importing from `orchestrator/src/` — the orchestrator is a separate package and cross-importing would tangle the Next build.

## File-by-file scope

```
orchestrator/src/routes.ts     # NEW — registerRoutes(app, {db, config, jira}): POST /api/requests, GET /api/requests/:id
orchestrator/src/db.ts         # ADD helpers: createRequestWithTicket (tx), setTicketJiraKey, getRequest, getTicket, addEvent, listEvents
orchestrator/src/index.ts      # WIRE — cors middleware, JiraClient construction (loadJiraCredentials), registerRoutes
app/support/page.tsx           # NEW — client form: type (@bug/@incident/@feature), title, description, name/contact (optional)
app/support/[id]/page.tsx      # NEW — client polling timeline (useParams, 4s interval): status, events, Jira link
lib/support.ts                 # NEW — typed fetch helpers (submitRequest, getRequest) + API types; reads NEXT_PUBLIC_ORCH_URL
app/page.tsx                   # EDIT — add one Support link card (only existing-file change)
.env.example                   # ADD NEXT_PUBLIC_ORCH_URL (optional, defaults to http://localhost:4100)
docs/phases/phase-1-raw-intake.md  # this doc
```

Everything else in the game app, `workflow.config.json`, the schema, and the Jira client is untouched (the schema from Phase 0 already has every column Phase 1 needs).

## Contracts

### `POST /api/requests`

Request body (JSON):

```json
{
  "type": "bug | incident | feature",
  "title": "string, 1–200 chars",
  "description": "string, 1–5000 chars — stored verbatim as raw_submission",
  "submitterName": "string, optional",
  "submitterContact": "string, optional",
  "source": "portal (default) | reddit",
  "sourceRef": "string, optional (e.g. reddit permalink, Phase 5)"
}
```

Behavior, in order:

1. Validate (`400` with `{ error }` on bad type/missing/oversized fields).
2. One transaction: insert `requests` row (uuid id), insert `tickets` row (`status='submitted'`), insert `events` row (`kind='submitted'`, message "Request received — awaiting triage").
3. Create the Jira issue: summary `[<type>] <title>`, description = raw submission verbatim followed by a metadata paragraph (submitter, source, request id), labels `["intake", <type>, "source-<source>"]`. New issues land in **To Do (Column 1)** by default — no transition call needed.
4. On success: store the issue key on the ticket, add event `kind='jira_created'` ("Jira ticket KAN-n created in New / Awaiting Triage").
   On failure: add event `kind='error'` ("Jira sync failed..."), request survives.
5. Respond `201`:

```json
{ "id": "uuid", "status": "submitted", "jira": { "key": "KAN-7", "url": "https://.../browse/KAN-7" }, "createdAt": "..." }
```

(`jira` is `null` if step 4 failed.) The endpoint never blocks on anything slower than one Jira REST call.

### `GET /api/requests/:id`

`200`:

```json
{
  "request": { "id": "...", "type": "bug", "title": "...", "rawSubmission": "...", "submitterName": null, "submitterContact": null, "source": "portal", "sourceRef": null, "createdAt": "..." },
  "ticket": { "status": "submitted", "jiraIssueKey": "KAN-7", "jiraUrl": "https://.../browse/KAN-7", "updatedAt": "..." },
  "events": [ { "id": 1, "kind": "submitted", "message": "...", "createdAt": "..." } ]
}
```

`404` with `{ error }` for unknown ids. Events are ordered oldest-first (insertion order) and power the portal timeline; later phases only append new event kinds — this response shape does not change.

### Portal pages

- **`app/support/page.tsx`** (`"use client"`): segmented type picker rendered as `@bug` / `@incident` / `@feature`, title input, description textarea, optional name + contact inputs. Submit disables the button, calls `submitRequest()` from `lib/support.ts`, then `router.push(/support/${id})`. Errors render inline (`{ error }` body or network failure). No auth — submitter fields are self-reported, matching the app.
- **`app/support/[id]/page.tsx`** (`"use client"`): reads `id` via `useParams()` (Next 16 — `params` prop is a Promise, `useParams` avoids that entirely). Fetches on mount and every 4s via `setInterval` (cleared on unmount). Renders: title + type badge, current status ("Submitted — awaiting triage" for Phase 1), a link to the Jira ticket when present, and the event timeline (message + timestamp per row). Unknown id renders a not-found state with a link back to `/support`.
- Both styled like the home page: fixed sky gradient backdrop, `max-w` centered column, `rounded-2xl border border-sky-200 bg-white/70` cards, emerald primary button.

## Validation checklist (run on the PR, results in description)

1. `npm run typecheck` in `orchestrator/` passes; `npm run dev` boots with the new routes and CORS enabled.
2. `curl -X POST localhost:4100/api/requests` with a valid body → `201` with a `jira.key`; rows exist in `requests`, `tickets` (issue key set), `events` (2 events); the issue is visible in **To Do** on the [KAN board](https://dixonsworkspace-13267887.atlassian.net/jira/software/projects/KAN/boards/1) with the raw description and labels.
3. Same curl with a bad `type` → `400 { error }`; nothing written.
4. `curl localhost:4100/api/requests/<id>` → full timeline payload; unknown id → `404`.
5. Browser end-to-end: game app (`npm run dev`) + orchestrator running → fill the form at `/support` → redirected to `/support/<id>` → timeline shows "submitted, awaiting triage" + Jira link → ticket visible in Column 1 within seconds of submit.
6. Game app `npm run build` succeeds (new pages compile; no other pages affected).

## Non-goals

- No triage worker or agent runs (`@cursor/sdk` stays unused) — Phase 2.
- No Jira-create retry/backfill in the reconciler (recovery lands with Phase 2's stranded-ticket logic); no scoring (Phase 3), no execution (Phase 4), no Reddit (Phase 5).
- No auth, no rate limiting, no admin/list endpoint (`GET /api/requests` index), no email/Slack notifications — timeline only.
- No changes to game logic, stores, or existing docs; the only existing file touched is `app/page.tsx` (one link).
