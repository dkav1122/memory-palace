/**
 * Phase 4 validation: seed ONE ticket directly into 'ready' in the LIVE
 * workflow.db, with a synthetic triage assessment and a real Jira issue in
 * Ready for Execution. The running orchestrator claims it on its next tick
 * and drives it to a PR — so the execution path is testable (and demoable)
 * without waiting on live triage.
 *
 * The owner picks the target change at run time; point it at something real
 * and trivial (a planted typo works). Requires JIRA_EMAIL + JIRA_API_TOKEN.
 *
 * Usage (from orchestrator/):
 *   npm run validate:execution -- \
 *     --title "Fix typo on the support page" \
 *     --description "The support form header says 'Reprot a problem'." \
 *     --fix "Correct the spelling to 'Report a problem'." \
 *     [--files "app/support/page.tsx"] \
 *     [--root-cause "Typo in the header copy."] \
 *     [--type bug] [--severity low]
 *
 * Note: seeding directly into 'ready' bypasses the WIP gate — it consumes one
 * execution slot immediately.
 */
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import type { TriageAssessment } from "../src/assessment.js";
import { loadConfig, loadJiraCredentials } from "../src/config.js";
import {
  addEvent,
  claimTicket,
  createRequestWithTicket,
  openDb,
  resetTicketAttempts,
  setTicketJiraKey,
  setTicketTriaged,
} from "../src/db.js";
import { JiraClient } from "../src/jira.js";
import type { RequestType } from "../src/types.js";

const SEVERITIES = ["critical", "high", "medium", "low"] as const;
const TYPES: RequestType[] = ["bug", "incident", "feature"];

function usageFail(message: string): never {
  console.error(`${message}\n`);
  console.error(
    'Usage: npm run validate:execution -- --title "..." --description "..." --fix "..." ' +
      '[--files "a.ts,b.ts"] [--root-cause "..."] [--type bug] [--severity low]',
  );
  process.exit(1);
}

async function main() {
  const { values } = parseArgs({
    options: {
      title: { type: "string" },
      description: { type: "string" },
      fix: { type: "string" },
      files: { type: "string", default: "" },
      "root-cause": { type: "string", default: "See the description." },
      type: { type: "string", default: "bug" },
      severity: { type: "string", default: "low" },
    },
  });

  if (!values.title?.trim()) usageFail("--title is required");
  if (!values.description?.trim()) usageFail("--description is required");
  if (!values.fix?.trim()) usageFail("--fix is required");
  const type = values.type as RequestType;
  if (!TYPES.includes(type)) usageFail(`--type must be one of: ${TYPES.join(", ")}`);
  const severity = values.severity as TriageAssessment["severity"];
  if (!SEVERITIES.includes(severity)) {
    usageFail(`--severity must be one of: ${SEVERITIES.join(", ")}`);
  }

  const assessment: TriageAssessment = {
    severity,
    confidence: 0.9,
    affected_users: "some",
    reproduction: "Seeded for Phase 4 execution validation — see the description.",
    suspected_root_cause: values["root-cause"]!,
    relevant_files: values
      .files!.split(",")
      .map((f) => f.trim())
      .filter(Boolean),
    complexity: "trivial",
    evidence: "Synthetic assessment seeded by validate-execution.",
    proposed_fix: values.fix,
  };

  const config = loadConfig();
  const jira = new JiraClient(config, loadJiraCredentials());
  // The LIVE db on purpose: the running orchestrator must pick this ticket up.
  const db = openDb();

  try {
    const id = randomUUID();
    createRequestWithTicket(db, {
      id,
      type,
      title: values.title,
      rawSubmission: values.description,
      submitterName: "phase-4-validator",
      submitterContact: null,
      source: "portal",
      sourceRef: null,
    });

    const created = await jira.createIssue({
      summary: `[${type}] ${values.title}`,
      description: `${values.description}\n\nPhase 4 execution validation seed. Request ID: ${id}`,
      labels: ["phase-4-validation", type, `severity-${severity}`],
    });
    setTicketJiraKey(db, id, created.key);
    addEvent(db, id, "jira_created", `Jira ticket ${created.key} created`, {
      key: created.key,
      url: created.url,
    });

    // Skip cloud triage: place the parsed assessment directly, then promote.
    setTicketTriaged(db, id, JSON.stringify(assessment));
    addEvent(db, id, "triaged", `Seeded as triaged (${severity}) — synthetic assessment`);
    if (!claimTicket(db, id, "triaged", "ready")) {
      throw new Error("Could not promote seeded ticket to ready");
    }
    resetTicketAttempts(db, id);
    addEvent(db, id, "ready", "Seeded directly into Ready for Execution (bypasses WIP gate)");

    await jira.addComment(
      created.key,
      `Phase 4 validation: seeded synthetic triage assessment (severity=${severity}) and promoted directly to Ready for Execution.\n\nProposed fix: ${values.fix}`,
    );
    await jira.transitionToStatus(created.key, "ready");

    console.log(`Seeded ready ticket: ${created.key} (${created.url})`);
    console.log(`Request ID: ${id}`);
    console.log(`Timeline:   http://localhost:3000/support/${id}`);
    console.log(
      "\nThe running orchestrator will claim it within one reconciler tick (~15s), " +
        "move it to In Progress, and drive it to a PR.",
    );
  } finally {
    db.close();
  }
}

main().catch((err) => {
  console.error(String(err));
  process.exit(1);
});
