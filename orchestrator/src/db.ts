import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import type { EventRecord, InternalStatus, RequestRecord, TicketRecord } from "./types.js";

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "data");

/** Exported for tests and validation scripts that build throwaway databases. */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS requests (
  id             TEXT PRIMARY KEY,
  type           TEXT NOT NULL CHECK (type IN ('bug','incident','feature')),
  title          TEXT NOT NULL,
  raw_submission TEXT NOT NULL,
  submitter_name TEXT,
  submitter_contact TEXT,
  source         TEXT NOT NULL DEFAULT 'portal' CHECK (source IN ('portal','reddit')),
  source_ref     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tickets (
  request_id     TEXT PRIMARY KEY REFERENCES requests(id),
  jira_issue_key TEXT,
  status         TEXT NOT NULL DEFAULT 'submitted',
  triage_json    TEXT,
  score          REAL,
  score_explanation TEXT,
  pr_url         TEXT,
  attempts       INTEGER NOT NULL DEFAULT 0,
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL REFERENCES requests(id),
  kind       TEXT NOT NULL,
  message    TEXT NOT NULL,
  data_json  TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_events_request ON events(request_id, id);
`;

export function openDb(): Database.Database {
  mkdirSync(dataDir, { recursive: true });
  const db = new Database(resolve(dataDir, "workflow.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

export function countTicketsByStatus(db: Database.Database): Record<string, number> {
  const rows = db
    .prepare("SELECT status, COUNT(*) AS n FROM tickets GROUP BY status")
    .all() as Array<{ status: string; n: number }>;
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

export interface NewRequestInput {
  id: string;
  type: RequestRecord["type"];
  title: string;
  rawSubmission: string;
  submitterName: string | null;
  submitterContact: string | null;
  source: RequestRecord["source"];
  sourceRef: string | null;
}

/** Insert request + ticket (status 'submitted') + 'submitted' event atomically. */
export function createRequestWithTicket(db: Database.Database, input: NewRequestInput): void {
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO requests (id, type, title, raw_submission, submitter_name, submitter_contact, source, source_ref)
       VALUES (@id, @type, @title, @rawSubmission, @submitterName, @submitterContact, @source, @sourceRef)`,
    ).run(input);
    db.prepare("INSERT INTO tickets (request_id, status) VALUES (?, 'submitted')").run(input.id);
    db.prepare(
      "INSERT INTO events (request_id, kind, message) VALUES (?, 'submitted', 'Request received — awaiting triage')",
    ).run(input.id);
  });
  tx();
}

/**
 * First-writer-wins: store the Jira key only when still null.
 * Returns true when this call set the key; false if another writer already won.
 */
export function setTicketJiraKey(db: Database.Database, requestId: string, issueKey: string): boolean {
  const result = db
    .prepare(
      `UPDATE tickets SET jira_issue_key = ?, updated_at = datetime('now')
       WHERE request_id = ? AND jira_issue_key IS NULL`,
    )
    .run(issueKey, requestId);
  return result.changes === 1;
}

export function getRequest(db: Database.Database, id: string): RequestRecord | undefined {
  return db.prepare("SELECT * FROM requests WHERE id = ?").get(id) as RequestRecord | undefined;
}

export function getTicket(db: Database.Database, requestId: string): TicketRecord | undefined {
  return db.prepare("SELECT * FROM tickets WHERE request_id = ?").get(requestId) as
    | TicketRecord
    | undefined;
}

export function addEvent(
  db: Database.Database,
  requestId: string,
  kind: string,
  message: string,
  data?: unknown,
): void {
  db.prepare("INSERT INTO events (request_id, kind, message, data_json) VALUES (?, ?, ?, ?)").run(
    requestId,
    kind,
    message,
    data === undefined ? null : JSON.stringify(data),
  );
}

export function listEvents(db: Database.Database, requestId: string): EventRecord[] {
  return db
    .prepare("SELECT * FROM events WHERE request_id = ? ORDER BY id ASC")
    .all(requestId) as EventRecord[];
}

export function getLastEventOfKind(
  db: Database.Database,
  requestId: string,
  kind: string,
): EventRecord | undefined {
  return db
    .prepare("SELECT * FROM events WHERE request_id = ? AND kind = ? ORDER BY id DESC LIMIT 1")
    .get(requestId, kind) as EventRecord | undefined;
}

/**
 * Atomically swap a ticket's status, guarded on the expected current status.
 * Returns false when another worker (or a previous crash) already moved it.
 */
export function claimTicket(
  db: Database.Database,
  requestId: string,
  from: InternalStatus,
  to: InternalStatus,
): boolean {
  const result = db
    .prepare(
      "UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE request_id = ? AND status = ?",
    )
    .run(to, requestId, from);
  return result.changes === 1;
}

export function setTicketStatus(
  db: Database.Database,
  requestId: string,
  status: InternalStatus,
): void {
  db.prepare(
    "UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE request_id = ?",
  ).run(status, requestId);
}

export function setTicketTriaged(
  db: Database.Database,
  requestId: string,
  triageJson: string,
): void {
  db.prepare(
    "UPDATE tickets SET status = 'triaged', triage_json = ?, updated_at = datetime('now') WHERE request_id = ?",
  ).run(triageJson, requestId);
}

/** Zero the attempt counter — called when a ticket is promoted to 'ready' so execution retries start fresh. */
export function resetTicketAttempts(db: Database.Database, requestId: string): void {
  db.prepare(
    "UPDATE tickets SET attempts = 0, updated_at = datetime('now') WHERE request_id = ?",
  ).run(requestId);
}

/** Increment the attempt counter and return the new value. */
export function incrementTicketAttempts(db: Database.Database, requestId: string): number {
  db.prepare(
    "UPDATE tickets SET attempts = attempts + 1, updated_at = datetime('now') WHERE request_id = ?",
  ).run(requestId);
  const row = db.prepare("SELECT attempts FROM tickets WHERE request_id = ?").get(requestId) as
    | { attempts: number }
    | undefined;
  return row?.attempts ?? 0;
}

export function listTicketsByStatus(
  db: Database.Database,
  status: InternalStatus,
): TicketRecord[] {
  return db
    .prepare("SELECT * FROM tickets WHERE status = ? ORDER BY updated_at ASC")
    .all(status) as TicketRecord[];
}

/** Tickets sitting in `status` for longer than `minutes` (by updated_at, UTC). */
export function findStuckTickets(
  db: Database.Database,
  status: InternalStatus,
  minutes: number,
): TicketRecord[] {
  return db
    .prepare(
      "SELECT * FROM tickets WHERE status = ? AND updated_at < datetime('now', ?) ORDER BY updated_at ASC",
    )
    .all(status, `-${minutes} minutes`) as TicketRecord[];
}

export function setTicketScore(
  db: Database.Database,
  requestId: string,
  score: number,
  explanation: string,
): void {
  db.prepare(
    "UPDATE tickets SET score = ?, score_explanation = ?, updated_at = datetime('now') WHERE request_id = ?",
  ).run(score, explanation, requestId);
}

/** Triaged tickets with an assessment, joined to request type + created_at for scoring. */
export interface TriagedForPrioritization {
  request_id: string;
  jira_issue_key: string | null;
  triage_json: string;
  score: number | null;
  score_explanation: string | null;
  type: RequestRecord["type"];
  title: string;
  created_at: string;
}

export function listTriagedForPrioritization(db: Database.Database): TriagedForPrioritization[] {
  return db
    .prepare(
      `SELECT t.request_id, t.jira_issue_key, t.triage_json, t.score, t.score_explanation,
              r.type, r.title, r.created_at
       FROM tickets t
       JOIN requests r ON r.id = t.request_id
       WHERE t.status = 'triaged' AND t.triage_json IS NOT NULL
       ORDER BY (t.score IS NULL), t.score DESC, r.created_at ASC`,
    )
    .all() as TriagedForPrioritization[];
}

/** Terminal success for execution: PR opened, awaiting human review. */
export function setTicketPrReady(db: Database.Database, requestId: string, prUrl: string): void {
  db.prepare(
    "UPDATE tickets SET status = 'pr_ready', pr_url = ?, updated_at = datetime('now') WHERE request_id = ?",
  ).run(prUrl, requestId);
}

export interface ReadyForExecutionRow {
  request_id: string;
  jira_issue_key: string | null;
  triage_json: string | null;
  score: number | null;
}

/** Ready tickets, highest score first (nulls last), for the execution worker to claim. */
export function listReadyForExecution(db: Database.Database): ReadyForExecutionRow[] {
  return db
    .prepare(
      `SELECT request_id, jira_issue_key, triage_json, score
       FROM tickets
       WHERE status = 'ready'
       ORDER BY (score IS NULL), score DESC, updated_at ASC`,
    )
    .all() as ReadyForExecutionRow[];
}

export interface QueueRow {
  request_id: string;
  jira_issue_key: string | null;
  status: InternalStatus;
  score: number | null;
  score_explanation: string | null;
  type: RequestRecord["type"];
  title: string;
  created_at: string;
}

/** Ranked queue for demo: triaged + ready, highest score first. */
export function listQueue(db: Database.Database): QueueRow[] {
  return db
    .prepare(
      `SELECT t.request_id, t.jira_issue_key, t.status, t.score, t.score_explanation,
              r.type, r.title, r.created_at
       FROM tickets t
       JOIN requests r ON r.id = t.request_id
       WHERE t.status IN ('triaged', 'ready')
       ORDER BY (t.score IS NULL), t.score DESC, r.created_at ASC`,
    )
    .all() as QueueRow[];
}
