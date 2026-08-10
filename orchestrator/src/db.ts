import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

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
