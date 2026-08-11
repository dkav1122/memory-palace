/**
 * Deterministic prioritization scorer (Phase 3).
 * Pure functions — no I/O — so the formula is unit-testable in isolation.
 */

import type { TriageAssessment } from "./assessment.js";
import type { RequestType } from "./types.js";

export type JiraPriorityName = "Highest" | "High" | "Medium" | "Low" | "Lowest";

export interface ScoreInput {
  assessment: TriageAssessment;
  type: RequestType;
  ageHours: number;
}

export interface ScoreResult {
  score: number;
  explanation: string;
  priority: JiraPriorityName;
}

const TYPE_WEIGHT: Record<RequestType, number> = {
  incident: 40,
  bug: 25,
  feature: 10,
};

const SEVERITY_WEIGHT: Record<TriageAssessment["severity"], number> = {
  critical: 40,
  high: 30,
  medium: 15,
  low: 5,
};

const AFFECTED_WEIGHT: Record<TriageAssessment["affected_users"], number> = {
  all: 20,
  many: 15,
  some: 8,
  few: 3,
  unknown: 5,
};

const COMPLEXITY_PENALTY: Record<TriageAssessment["complexity"], number> = {
  trivial: 0,
  small: 3,
  medium: 8,
  large: 15,
};

const AGE_POINTS_PER_DAY = 2;
const AGE_BOOST_CAP = 14;

function ageBoost(ageHours: number): number {
  const days = Math.max(0, Math.floor(ageHours / 24));
  return Math.min(days * AGE_POINTS_PER_DAY, AGE_BOOST_CAP);
}

/** Map numeric score to a standard Jira priority name. */
export function priorityForScore(score: number): JiraPriorityName {
  if (score >= 90) return "Highest";
  if (score >= 70) return "High";
  if (score >= 50) return "Medium";
  if (score >= 30) return "Low";
  return "Lowest";
}

export function formatExplanation(parts: {
  type: RequestType;
  typeWeight: number;
  severity: TriageAssessment["severity"];
  severityWeight: number;
  affected: TriageAssessment["affected_users"];
  affectedWeight: number;
  confidence: number;
  confidencePoints: number;
  complexity: TriageAssessment["complexity"];
  complexityPenalty: number;
  ageHours: number;
  ageBoostPoints: number;
  total: number;
}): string {
  return [
    `type=${parts.type} (+${parts.typeWeight})`,
    `severity=${parts.severity} (+${parts.severityWeight})`,
    `affected_users=${parts.affected} (+${parts.affectedWeight})`,
    `confidence=${parts.confidence} (+${parts.confidencePoints})`,
    `complexity=${parts.complexity} (-${parts.complexityPenalty})`,
    `age=${parts.ageHours.toFixed(1)}h (+${parts.ageBoostPoints})`,
    `total=${parts.total}`,
  ].join("\n");
}

/** Pure scoring function used by the prioritization reconciler gate. */
export function score(input: ScoreInput): ScoreResult {
  const { assessment, type, ageHours } = input;
  const typeWeight = TYPE_WEIGHT[type];
  const severityWeight = SEVERITY_WEIGHT[assessment.severity];
  const affectedWeight = AFFECTED_WEIGHT[assessment.affected_users];
  const confidencePoints = Math.round(assessment.confidence * 10);
  const complexityPenalty = COMPLEXITY_PENALTY[assessment.complexity];
  const ageBoostPoints = ageBoost(ageHours);

  const base =
    typeWeight +
    severityWeight +
    affectedWeight +
    confidencePoints -
    complexityPenalty +
    ageBoostPoints;
  const total = Math.max(0, base);

  return {
    score: total,
    explanation: formatExplanation({
      type,
      typeWeight,
      severity: assessment.severity,
      severityWeight,
      affected: assessment.affected_users,
      affectedWeight,
      confidence: assessment.confidence,
      confidencePoints,
      complexity: assessment.complexity,
      complexityPenalty,
      ageHours,
      ageBoostPoints,
      total,
    }),
    priority: priorityForScore(total),
  };
}
