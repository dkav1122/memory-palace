/** Internal pipeline states. Jira board columns mirror these via config.jira.statusMap. */
export type InternalStatus =
  | "submitted"
  | "triaging"
  | "triaged"
  | "ready"
  | "executing"
  | "pr_ready"
  | "rejected"
  | "failed";

export type RequestType = "bug" | "incident" | "feature";
export type RequestSource = "portal" | "reddit";

export interface RequestRecord {
  id: string;
  type: RequestType;
  title: string;
  /** Verbatim user submission. Immutable — enrichment lives on the ticket. */
  raw_submission: string;
  submitter_name: string | null;
  submitter_contact: string | null;
  source: RequestSource;
  source_ref: string | null;
  created_at: string;
}

export interface TicketRecord {
  request_id: string;
  jira_issue_key: string | null;
  status: InternalStatus;
  triage_json: string | null;
  score: number | null;
  score_explanation: string | null;
  pr_url: string | null;
  attempts: number;
  updated_at: string;
}

export interface EventRecord {
  id: number;
  request_id: string;
  kind: string;
  message: string;
  data_json: string | null;
  created_at: string;
}

export interface JiraStatusMapping {
  jiraStatus: string;
  statusId: string;
  transitionId: string;
}

export interface WorkflowConfig {
  github: { repo: string };
  cursor: { model: string };
  jira: {
    baseUrl: string;
    projectKey: string;
    boardId: number;
    issueType: string;
    statusMap: Partial<Record<InternalStatus, JiraStatusMapping>>;
  };
  reddit: { subreddit: string | null };
  execution: { wipLimit: number };
  triage: {
    /** Startup failures (CursorAgentError) are retried up to this many times. */
    maxAttempts: number;
    /** Tickets stuck in 'triaging' longer than this are marked failed by the reconciler. */
    stuckAfterMinutes: number;
  };
}
