import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import type { WorkflowConfig } from "./types.js";

const orchestratorDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const repoRootDir = resolve(orchestratorDir, "..");

// First value wins; later files never override earlier ones.
for (const envFile of [".env", "../.env.local", "../.env"]) {
  dotenv.config({ path: resolve(orchestratorDir, envFile), override: false, quiet: true });
}

const CONFIG_PATH = resolve(repoRootDir, "workflow.config.json");

function fail(message: string): never {
  throw new Error(`workflow.config.json: ${message} (${CONFIG_PATH})`);
}

export function loadConfig(): WorkflowConfig {
  let raw: string;
  try {
    raw = readFileSync(CONFIG_PATH, "utf8");
  } catch {
    fail("file not found — create it at the repo root");
  }
  const config = JSON.parse(raw) as WorkflowConfig;

  if (process.env.JIRA_BASE_URL) config.jira.baseUrl = process.env.JIRA_BASE_URL;

  if (!config.github?.repo) fail("github.repo is required");
  if (!config.jira?.baseUrl) fail("jira.baseUrl is required");
  if (!config.jira.projectKey) fail("jira.projectKey is required");
  if (!config.jira.issueType) fail("jira.issueType is required");
  for (const status of ["submitted", "triaged", "ready", "executing", "pr_ready"] as const) {
    const mapping = config.jira.statusMap?.[status];
    if (!mapping?.jiraStatus || !mapping.statusId || !mapping.transitionId) {
      fail(`jira.statusMap.${status} must define jiraStatus, statusId, transitionId`);
    }
  }
  if (
    !Number.isInteger(config.triage?.maxAttempts) ||
    config.triage.maxAttempts < 1 ||
    !(config.triage.stuckAfterMinutes > 0)
  ) {
    fail("triage.maxAttempts (integer >= 1) and triage.stuckAfterMinutes (> 0) are required");
  }
  if (
    !Number.isInteger(config.execution?.wipLimit) ||
    config.execution.wipLimit < 1 ||
    !Number.isInteger(config.execution.maxAttempts) ||
    config.execution.maxAttempts < 1 ||
    !(config.execution.stuckAfterMinutes > 0)
  ) {
    fail(
      "execution.wipLimit and execution.maxAttempts (integers >= 1) and execution.stuckAfterMinutes (> 0) are required",
    );
  }
  return config;
}

export interface JiraCredentials {
  email: string;
  apiToken: string;
}

/** Cursor API key comes from env only, never from workflow.config.json. */
export function loadCursorApiKey(): string {
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    throw new Error("CURSOR_API_KEY must be set (see .env.example) — required from Phase 2 on");
  }
  return apiKey;
}

/** Jira credentials come from env only, never from workflow.config.json. */
export function loadJiraCredentials(): JiraCredentials {
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  if (!email || !apiToken) {
    throw new Error("JIRA_EMAIL and JIRA_API_TOKEN must be set (see .env.example)");
  }
  return { email, apiToken };
}
