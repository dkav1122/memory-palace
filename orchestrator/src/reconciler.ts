import type Database from "better-sqlite3";
import { countTicketsByStatus } from "./db.js";
import type { ExecutionWorker } from "./execute.js";
import type { PrioritizeService } from "./prioritize.js";
import type { TriageWorker } from "./triage.js";
import type { WorkflowConfig } from "./types.js";

const DEFAULT_INTERVAL_MS = 15_000;

/**
 * Reconciliation loop — the safety net behind the push-first triggers.
 * Phase 2 gates (via triage.reconcile): Jira-create backfill, re-triggering
 * triage for stranded 'submitted' tickets, and failing 'triaging' tickets
 * stuck past the timeout. Phase 3 (via prioritize.reconcile): score triaged
 * tickets and promote within the execution WIP limit. Phase 4 (via
 * execute.reconcile): claim ready tickets, launch cloud executions, and
 * recover orphaned 'executing' runs. Reddit polling in Phase 5.
 */
export function startReconciler(
  db: Database.Database,
  _config: WorkflowConfig,
  triage: TriageWorker,
  prioritize: PrioritizeService,
  execute: ExecutionWorker,
  intervalMs = DEFAULT_INTERVAL_MS,
): () => void {
  const tick = async () => {
    const counts = countTicketsByStatus(db);
    const summary = Object.entries(counts)
      .map(([status, n]) => `${status}=${n}`)
      .join(" ");
    console.log(`[reconciler] tick ${new Date().toISOString()} tickets: ${summary || "none"}`);
    try {
      await triage.reconcile();
    } catch (err) {
      console.error("[reconciler] triage reconcile failed:", err);
    }
    try {
      await prioritize.reconcile();
    } catch (err) {
      console.error("[reconciler] prioritize reconcile failed:", err);
    }
    try {
      await execute.reconcile();
    } catch (err) {
      console.error("[reconciler] execute reconcile failed:", err);
    }
  };

  void tick();
  const timer = setInterval(() => {
    void tick();
  }, intervalMs);
  return () => clearInterval(timer);
}
