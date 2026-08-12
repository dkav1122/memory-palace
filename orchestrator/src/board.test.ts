import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import {
  SCHEMA,
  addEvent,
  createRequestWithTicket,
  listBoard,
  listRecentEvents,
  setTicketPrReady,
  setTicketStatus,
} from "./db.js";

function openMemoryDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

function seed(
  db: Database.Database,
  id: string,
  title: string,
  status?: Parameters<typeof setTicketStatus>[2],
): void {
  createRequestWithTicket(db, {
    id,
    type: "bug",
    title,
    rawSubmission: `Body for ${title}`,
    submitterName: null,
    submitterContact: null,
    source: "portal",
    sourceRef: null,
  });
  if (status && status !== "submitted") {
    setTicketStatus(db, id, status);
  }
}

test("listBoard defaults to open statuses only", () => {
  const db = openMemoryDb();
  seed(db, "a", "Open submitted");
  seed(db, "b", "Open triaging", "triaging");
  seed(db, "c", "Done PR", "executing");
  setTicketPrReady(db, "c", "https://github.com/example/repo/pull/1");
  seed(db, "d", "Failed ticket", "failed");
  seed(db, "e", "Rejected", "rejected");

  const open = listBoard(db, false);
  assert.deepEqual(
    open.map((r) => r.request_id).sort(),
    ["a", "b"],
  );
  assert.ok(open.every((r) => !["pr_ready", "failed", "rejected"].includes(r.status)));
});

test("listBoard includeTerminal adds pr_ready and failed but not rejected", () => {
  const db = openMemoryDb();
  seed(db, "a", "Open");
  seed(db, "b", "Done", "executing");
  setTicketPrReady(db, "b", "https://github.com/example/repo/pull/2");
  seed(db, "c", "Failed", "failed");
  seed(db, "d", "Rejected", "rejected");

  const all = listBoard(db, true);
  assert.deepEqual(
    all.map((r) => r.request_id).sort(),
    ["a", "b", "c"],
  );
  assert.equal(all.find((r) => r.request_id === "b")?.pr_url, "https://github.com/example/repo/pull/2");
});

test("listBoard rows expose score, attempts, and source fields", () => {
  const db = openMemoryDb();
  seed(db, "a", "Scored", "ready");
  db.prepare(
    "UPDATE tickets SET score = ?, score_explanation = ?, attempts = ? WHERE request_id = ?",
  ).run(42, "incident + high severity", 2, "a");

  const rows = listBoard(db);
  assert.equal(rows.length, 1);
  const row = rows[0]!;
  assert.equal(row.request_id, "a");
  assert.equal(row.type, "bug");
  assert.equal(row.source, "portal");
  assert.equal(row.status, "ready");
  assert.equal(row.score, 42);
  assert.equal(row.score_explanation, "incident + high severity");
  assert.equal(row.attempts, 2);
  assert.ok(row.created_at);
  assert.ok(row.updated_at);
});

test("listRecentEvents returns newest first and respects limit", () => {
  const db = openMemoryDb();
  seed(db, "a", "Alpha");
  seed(db, "b", "Beta");
  addEvent(db, "a", "triaged", "Alpha triaged");
  addEvent(db, "b", "ready", "Beta ready");
  addEvent(db, "a", "error", "Alpha hiccup");

  const limited = listRecentEvents(db, 2);
  assert.equal(limited.length, 2);
  const first = limited[0]!;
  const second = limited[1]!;
  assert.equal(first.kind, "error");
  assert.equal(first.title, "Alpha");
  assert.equal(first.request_id, "a");
  assert.equal(second.kind, "ready");
  assert.equal(second.title, "Beta");

  const all = listRecentEvents(db, 50);
  // 2 submitted events from create + 3 added = 5
  assert.equal(all.length, 5);
  assert.ok(all[0]!.id > all[all.length - 1]!.id);
});

test("listRecentEvents clamps limit to a sane range", () => {
  const db = openMemoryDb();
  seed(db, "a", "Only");
  assert.equal(listRecentEvents(db, 0).length, 1);
  assert.equal(listRecentEvents(db, -5).length, 1);
});
