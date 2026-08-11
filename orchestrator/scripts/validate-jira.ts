/**
 * Phase 0 validation: drive one issue across all five board columns via the
 * REST client. Requires JIRA_EMAIL + JIRA_API_TOKEN in env.
 *
 * Usage:
 *   npm run validate:jira                       # creates a fresh test issue
 *   VALIDATE_ISSUE_KEY=KAN-2 npm run validate:jira   # reuses an existing issue
 */
import { loadConfig, loadJiraCredentials } from "../src/config.js";
import { JiraClient } from "../src/jira.js";
import type { InternalStatus } from "../src/types.js";

const PATH_THROUGH_BOARD: InternalStatus[] = ["triaged", "ready", "executing", "pr_ready", "submitted"];

async function main() {
  const config = loadConfig();
  const jira = new JiraClient(config, loadJiraCredentials());

  let issueKey = process.env.VALIDATE_ISSUE_KEY;
  if (issueKey) {
    console.log(`Reusing existing issue ${issueKey}`);
  } else {
    const issue = await jira.createIssue({
      summary: "[setup] Phase 0 validation — safe to delete",
      description:
        "Automated Phase 0 validation issue. The orchestrator's Jira client drives this across all five board columns, then returns it to the first column.",
      labels: ["workflow-setup"],
    });
    issueKey = issue.key;
    console.log(`Created ${issue.key}: ${issue.url}`);
  }

  const initial = await jira.getIssueStatus(issueKey);
  console.log(`Starting status: ${initial.name} (${initial.id})`);

  for (const internalStatus of PATH_THROUGH_BOARD) {
    const target = config.jira.statusMap[internalStatus]!;
    await jira.transitionToStatus(issueKey, internalStatus);
    const now = await jira.getIssueStatus(issueKey);
    const ok = now.id === target.statusId;
    console.log(
      `${ok ? "OK " : "FAIL"} ${internalStatus} -> "${now.name}" (${now.id})` +
        (ok ? "" : ` expected "${target.jiraStatus}" (${target.statusId})`),
    );
    if (!ok) process.exit(1);
    await jira.addComment(issueKey, `Phase 0 validation: transitioned to "${target.jiraStatus}" for internal status "${internalStatus}".`);
  }

  console.log(`\nAll five columns reached and issue returned to first column. Validation passed for ${issueKey}.`);
}

main().catch((err) => {
  console.error(String(err));
  process.exit(1);
});
