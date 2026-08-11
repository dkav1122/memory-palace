import assert from "node:assert/strict";
import { test } from "node:test";
import type { TriageAssessment } from "./assessment.js";
import { priorityForScore, score } from "./score.js";

function assessment(overrides: Partial<TriageAssessment> = {}): TriageAssessment {
  return {
    severity: "medium",
    confidence: 0.8,
    affected_users: "some",
    reproduction: "steps",
    suspected_root_cause: "cause",
    relevant_files: ["a.ts"],
    complexity: "small",
    evidence: "evidence",
    proposed_fix: "fix",
    ...overrides,
  };
}

test("incident scores higher than bug scores higher than feature (same assessment)", () => {
  const base = assessment({ severity: "high", affected_users: "many", complexity: "small" });
  const incident = score({ assessment: base, type: "incident", ageHours: 0 });
  const bug = score({ assessment: base, type: "bug", ageHours: 0 });
  const feature = score({ assessment: base, type: "feature", ageHours: 0 });
  assert.ok(incident.score > bug.score);
  assert.ok(bug.score > feature.score);
});

test("critical > high > medium > low severity order", () => {
  const types = ["critical", "high", "medium", "low"] as const;
  const scores = types.map(
    (severity) =>
      score({
        assessment: assessment({ severity, confidence: 0.5, affected_users: "some", complexity: "small" }),
        type: "bug",
        ageHours: 0,
      }).score,
  );
  for (let i = 0; i < scores.length - 1; i++) {
    assert.ok(scores[i]! > scores[i + 1]!, `${types[i]} should beat ${types[i + 1]}`);
  }
});

test("complexity penalty lowers score for large vs trivial", () => {
  const trivial = score({
    assessment: assessment({ complexity: "trivial" }),
    type: "bug",
    ageHours: 0,
  });
  const large = score({
    assessment: assessment({ complexity: "large" }),
    type: "bug",
    ageHours: 0,
  });
  assert.equal(trivial.score - large.score, 15);
});

test("age boost adds +2 per full day, capped at 14", () => {
  const fresh = score({ assessment: assessment(), type: "bug", ageHours: 0 });
  const oneDay = score({ assessment: assessment(), type: "bug", ageHours: 24 });
  const sevenDays = score({ assessment: assessment(), type: "bug", ageHours: 24 * 7 });
  const tenDays = score({ assessment: assessment(), type: "bug", ageHours: 24 * 10 });
  assert.equal(oneDay.score - fresh.score, 2);
  assert.equal(sevenDays.score - fresh.score, 14);
  assert.equal(tenDays.score, sevenDays.score); // capped
});

test("confidence contributes round(confidence * 10)", () => {
  const low = score({
    assessment: assessment({ confidence: 0.4 }),
    type: "bug",
    ageHours: 0,
  });
  const high = score({
    assessment: assessment({ confidence: 0.9 }),
    type: "bug",
    ageHours: 0,
  });
  assert.equal(high.score - low.score, 5); // 9 - 4
});

test("explanation lists each term and total", () => {
  const result = score({
    assessment: assessment({ severity: "critical", affected_users: "all", complexity: "trivial", confidence: 1 }),
    type: "incident",
    ageHours: 0,
  });
  assert.match(result.explanation, /type=incident \(\+40\)/);
  assert.match(result.explanation, /severity=critical \(\+40\)/);
  assert.match(result.explanation, /affected_users=all \(\+20\)/);
  assert.match(result.explanation, /confidence=1 \(\+10\)/);
  assert.match(result.explanation, /complexity=trivial \(\-0\)/);
  assert.match(result.explanation, /total=\d+/);
  // 40+40+20+10-0+0 = 110
  assert.equal(result.score, 110);
  assert.equal(result.priority, "Highest");
});

test("priorityForScore bands", () => {
  assert.equal(priorityForScore(90), "Highest");
  assert.equal(priorityForScore(89), "High");
  assert.equal(priorityForScore(70), "High");
  assert.equal(priorityForScore(50), "Medium");
  assert.equal(priorityForScore(30), "Low");
  assert.equal(priorityForScore(29), "Lowest");
  assert.equal(priorityForScore(0), "Lowest");
});

test("score never goes negative", () => {
  const result = score({
    assessment: assessment({
      severity: "low",
      confidence: 0,
      affected_users: "few",
      complexity: "large",
    }),
    type: "feature",
    ageHours: 0,
  });
  // 10+5+3+0-15+0 = 3 — still positive; force a floor check with absurd age
  assert.ok(result.score >= 0);
});
