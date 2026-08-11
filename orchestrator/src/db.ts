import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import type { EventRecord, RequestRecord, TicketRecord } from "./types.js";

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "data");

const SCHEMA = `
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

export function setTicketJiraKey(db: Database.Database, requestId: string, issueKey: string): void {
  db.prepare(
    "UPDATE tickets SET jira_issue_key = ?, updated_at = datetime('now') WHERE request_id = ?",
  ).run(issueKey, requestId);
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
