/**
 * Prioritization service (Phase 3): score triaged tickets deterministically and
 * promote the highest-ranked ones into Ready for Execution under the WIP limit.
 */

import type Database from "better-sqlite3";
import type { TriageAssessment } from "./assessment.js";
import {
  addEvent,
  claimTicket,
  countTicketsByStatus,
  getLastEventOfKind,
  listTriagedForPrioritization,
  setTicketScore,
} from "./db.js";
import type { JiraClient } from "./jira.js";
import { score } from "./score.js";
import type { WorkflowConfig } from "./types.js";

export interface PrioritizeService {
  reconcile(): Promise<void>;
}

export interface PrioritizeDeps {
  db: Database.Database;
  config: WorkflowConfig;
  jira: JiraClient;
}

function ageHoursFromCreatedAt(createdAt: string): number {
  // SQLite datetime('now') is UTC without timezone suffix; treat as UTC.
  const normalized = /Z$|[+-]\d{2}:?\d{2}$/.test(createdAt) ? createdAt : `${createdAt}Z`;
  const ms = Date.now() - new Date(normalized).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return ms / (1000 * 60 * 60);
}

function parseAssessment(raw: string): TriageAssessment | null {
  try {
    return JSON.parse(raw) as TriageAssessment;
  } catch {
    return null;
  }
}

function formatScoreComment(result: ReturnType<typeof score>): string {
  return [
    `Prioritization score: ${result.score}`,
    `Jira priority: ${result.priority}`,
    "",
    "How this score was derived:",
    result.explanation,
  ].join("\n");
}

export function createPrioritizeService({ db, config, jira }: PrioritizeDeps): PrioritizeService {
  let reconciling = false;

  async function reconcile(): Promise<void> {
    if (reconciling) return;
    reconciling = true;
    try {
      // Pass 1: score every triaged ticket with a parseable assessment.
      for (const row of listTriagedForPrioritization(db)) {
        const assessment = parseAssessment(row.triage_json);
        if (!assessment) {
          console.error(`[prioritize] unparseable triage_json for ${row.request_id}`);
          continue;
        }
        const result = score({
          assessment,
          type: row.type,
          ageHours: ageHoursFromCreatedAt(row.created_at),
        });
        setTicketScore(db, row.request_id, result.score, result.explanation);

        const alreadyPrioritized = getLastEventOfKind(db, row.request_id, "prioritized");
        if (alreadyPrioritized) continue;

        addEvent(
          db,
          row.request_id,
          "prioritized",
          `Scored ${result.score} (${result.priority}) — awaiting Ready slot under WIP limit`,
          { score: result.score, explanation: result.explanation, priority: result.priority },
        );

        if (!row.jira_issue_key) continue;
        try {
          await jira.addComment(row.jira_issue_key, formatScoreComment(result));
          await jira.setPriority(row.jira_issue_key, result.priority);
        } catch (err) {
          console.error(`[prioritize] Jira score sync failed for ${row.request_id}:`, err);
          addEvent(db, row.request_id, "error", "Jira sync failed after scoring — board may lag", {
            detail: String(err),
          });
        }
      }

      // Pass 2: promote highest-scored triaged tickets into ready while WIP allows.
      const counts = countTicketsByStatus(db);
      const inFlight = (counts.ready ?? 0) + (counts.executing ?? 0);
      let slots = config.execution.wipLimit - inFlight;
      if (slots <= 0) return;

      // Re-list after scoring so ORDER BY score DESC is current.
      const ranked = listTriagedForPrioritization(db).filter((r) => r.score != null);
      for (const row of ranked) {
        if (slots <= 0) break;
        if (!claimTicket(db, row.request_id, "triaged", "ready")) continue;
        slots -= 1;
        addEvent(
          db,
          row.request_id,
          "ready",
          `Promoted to Ready for Execution (score ${row.score})`,
          { score: row.score },
        );
        if (!row.jira_issue_key) continue;
        try {
          await jira.transitionToStatus(row.jira_issue_key, "ready");
        } catch (err) {
          console.error(`[prioritize] Jira ready transition failed for ${row.request_id}:`, err);
          addEvent(
            db,
            row.request_id,
            "error",
            "Jira sync failed after ready promotion — board may lag",
            { detail: String(err) },
          );
        }
      }
    } finally {
      reconciling = false;
    }
  }

  return { reconcile };
}
