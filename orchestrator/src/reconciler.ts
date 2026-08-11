import type Database from "better-sqlite3";
import { countTicketsByStatus } from "./db.js";
import type { TriageWorker } from "./triage.js";
import type { WorkflowConfig } from "./types.js";

const DEFAULT_INTERVAL_MS = 15_000;

/**
 * Reconciliation loop — the safety net behind the push-first triggers.
 * Phase 2 gates (via triage.reconcile): Jira-create backfill, re-triggering
 * triage for stranded 'submitted' tickets, and failing 'triaging' tickets
 * stuck past the timeout. The execution WIP gate arrives in Phases 3/4,
 * Reddit polling in Phase 5.
 */
export function startReconciler(
  db: Database.Database,
  _config: WorkflowConfig,
  triage: TriageWorker,
  intervalMs = DEFAULT_INTERVAL_MS,
): () => void {
  const tick = () => {
    const counts = countTicketsByStatus(db);
    const summary = Object.entries(counts)
      .map(([status, n]) => `${status}=${n}`)
      .join(" ");
    console.log(`[reconciler] tick ${new Date().toISOString()} tickets: ${summary || "none"}`);
    // reconcile() is self-guarded against overlapping runs and never rejects
    // in a way that should kill the loop.
    triage.reconcile().catch((err) => {
      console.error("[reconciler] reconcile failed:", err);
    });
  };

  tick();
  const timer = setInterval(tick, intervalMs);
  return () => clearInterval(timer);
}
