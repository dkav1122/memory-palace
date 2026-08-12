/**
 * Phase 3 validation: seed three triaged tickets of differing severity, run
 * prioritization once, and assert queue order + WIP hold (wipLimit=1 → one
 * Ready, two stay Triaged). Requires JIRA_EMAIL + JIRA_API_TOKEN.
 *
 * Usage (from orchestrator/):
 *   npm run validate:prioritization
 *
 * Uses a separate SQLite file so it does not disturb the live workflow.db.
 */
import { randomUUID } from "node:crypto";
import { mkdirSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import type { TriageAssessment } from "../src/assessment.js";
import { loadConfig, loadJiraCredentials } from "../src/config.js";
import {
  addEvent,
  createRequestWithTicket,
  getTicket,
  listQueue,
  setTicketJiraKey,
  setTicketTriaged,
} from "../src/db.js";
import { JiraClient } from "../src/jira.js";
import { createPrioritizeService } from "../src/prioritize.js";
import type { RequestType, WorkflowConfig } from "../src/types.js";

const SEEDS: Array<{
  type: RequestType;
  title: string;
  severity: TriageAssessment["severity"];
  label: string;
}> = [
  {
    type: "incident",
    title: "[phase-3] Critical — game crashes on flip",
    severity: "critical",
    label: "critical",
  },
  {
    type: "bug",
    title: "[phase-3] Medium — score display off by one",
    severity: "medium",
    label: "medium",
  },
  {
    type: "feature",
    title: "[phase-3] Low — darker theme preference",
    severity: "low",
    label: "low",
  },
];

function assessment(severity: TriageAssessment["severity"]): TriageAssessment {
  return {
    severity,
    confidence: 0.8,
    affected_users: severity === "critical" ? "all" : severity === "medium" ? "some" : "few",
    reproduction: "Seeded for Phase 3 prioritization validation.",
    suspected_root_cause: "N/A — validation seed.",
    relevant_files: ["store/gameStore.ts"],
    complexity: "small",
    evidence: "Synthetic assessment for scoring validation.",
    proposed_fix: "N/A — do not implement.",
  };
}

function openTempDb(): { db: Database.Database; path: string } {
  const dataDir = resolve(process.cwd(), "data");
  mkdirSync(dataDir, { recursive: true });
  const path = resolve(dataDir, `validate-prio-${Date.now()}.db`);
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
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
`);
  return { db, path };
}

async function main() {
  const baseConfig = loadConfig();
  // Force WIP=1 for the validation assertion regardless of local config edits.
  const config: WorkflowConfig = {
    ...baseConfig,
    execution: { ...baseConfig.execution, wipLimit: 1 },
  };
  const jira = new JiraClient(config, loadJiraCredentials());
  const { db, path: dbPath } = openTempDb();

  const seeded: Array<{ id: string; key: string; label: string }> = [];

  try {
    for (const seed of SEEDS) {
      const id = randomUUID();
      createRequestWithTicket(db, {
        id,
        type: seed.type,
        title: seed.title,
        rawSubmission: `Phase 3 validation seed (${seed.label}). Safe to delete.`,
        submitterName: "phase-3-validator",
        submitterContact: null,
        source: "portal",
        sourceRef: null,
      });
      const created = await jira.createIssue({
        summary: seed.title,
        description: `Phase 3 prioritization validation seed (${seed.label}). Safe to delete.`,
        labels: ["phase-3-validation", `severity-${seed.severity}`, seed.type],
      });
      setTicketJiraKey(db, id, created.key);
      addEvent(db, id, "jira_created", `Jira ticket ${created.key} created`, {
        key: created.key,
        url: created.url,
      });
      // Place on Triaged column with a parsed assessment (skip cloud triage).
      setTicketTriaged(db, id, JSON.stringify(assessment(seed.severity)));
      addEvent(db, id, "triaged", `Seeded as triaged (${seed.severity})`);
      await jira.addComment(
        created.key,
        `Phase 3 validation: seeded triage assessment (severity=${seed.severity}).`,
      );
      await jira.addLabels(created.key, ["triaged", `severity-${seed.severity}`]);
      await jira.transitionToStatus(created.key, "triaged");
      seeded.push({ id, key: created.key, label: seed.label });
      console.log(`Seeded ${seed.label}: ${created.key} (${created.url})`);
    }

    const prioritize = createPrioritizeService({ db, config, jira });
    await prioritize.reconcile();

    const queue = listQueue(db);
    console.log("\nQueue after prioritization:");
    for (const row of queue) {
      console.log(
        `  ${row.status.padEnd(8)} score=${String(row.score).padStart(3)}  ${row.jira_issue_key}  ${row.title}`,
      );
    }

    if (queue.length !== 3) {
      throw new Error(`Expected 3 queue items, got ${queue.length}`);
    }
    // Scores must be strictly descending: critical > medium > low
    const scores = queue.map((q) => q.score ?? -1);
    if (!(scores[0]! > scores[1]! && scores[1]! > scores[2]!)) {
      throw new Error(`Scores not strictly descending: ${scores.join(", ")}`);
    }
    // Labels by seed order of severity should match queue order
    const byId = Object.fromEntries(seeded.map((s) => [s.id, s.label]));
    const labels = queue.map((q) => byId[q.request_id]);
    if (labels.join(",") !== "critical,medium,low") {
      throw new Error(`Expected order critical,medium,low — got ${labels.join(",")}`);
    }

    const ready = queue.filter((q) => q.status === "ready");
    const triaged = queue.filter((q) => q.status === "triaged");
    if (ready.length !== 1) {
      throw new Error(`WIP limit 1: expected exactly 1 ready, got ${ready.length}`);
    }
    if (triaged.length !== 2) {
      throw new Error(`WIP limit 1: expected 2 held in triaged, got ${triaged.length}`);
    }
    if (ready[0]!.request_id !== seeded[0]!.id) {
      throw new Error(`Expected critical ticket to be promoted, got ${ready[0]!.jira_issue_key}`);
    }

    // Confirm Jira columns
    for (const row of queue) {
      const key = row.jira_issue_key!;
      const status = await jira.getIssueStatus(key);
      const expected =
        row.status === "ready"
          ? config.jira.statusMap.ready!.statusId
          : config.jira.statusMap.triaged!.statusId;
      if (status.id !== expected) {
        throw new Error(
          `${key}: Jira status ${status.name} (${status.id}) != expected for ${row.status} (${expected})`,
        );
      }
      console.log(`OK  ${key} Jira="${status.name}" local=${row.status} score=${row.score}`);
    }

    // Spot-check score explanation persisted
    const top = getTicket(db, seeded[0]!.id)!;
    if (!top.score_explanation?.includes("total=")) {
      throw new Error("Missing score explanation on promoted ticket");
    }

    console.log(
      `\nValidation passed: order critical > medium > low; WIP held 2 in Triaged; promoted ${ready[0]!.jira_issue_key}.`,
    );
  } finally {
    db.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      try {
        unlinkSync(`${dbPath}${suffix}`);
      } catch {
        // ignore cleanup errors
      }
    }
  }
}

main().catch((err) => {
  console.error(String(err));
  process.exit(1);
});
