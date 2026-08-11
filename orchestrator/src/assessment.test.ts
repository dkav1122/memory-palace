import assert from "node:assert/strict";
import { test } from "node:test";
import { extractAssessment } from "./assessment.js";

const VALID = {
  severity: "high",
  confidence: 0.85,
  affected_users: "many",
  reproduction: "Open /play and flip two cards quickly.",
  suspected_root_cause: "Race in store/gameStore.ts flip handler.",
  relevant_files: ["store/gameStore.ts", "app/play/page.tsx"],
  complexity: "small",
  evidence: "flipCard mutates state without checking isResolving.",
  proposed_fix: "Guard flipCard while a pair is resolving.",
};

function expectValid(text: string) {
  const result = extractAssessment(text);
  assert.equal(result.ok, true, `expected ok, got: ${!result.ok ? result.error : ""}`);
  if (result.ok) {
    assert.equal(result.value.severity, "high");
    assert.equal(result.value.confidence, 0.85);
    assert.deepEqual(result.value.relevant_files, VALID.relevant_files);
  }
}

test("clean fenced json block", () => {
  expectValid("Here is my assessment.\n\n```json\n" + JSON.stringify(VALID, null, 2) + "\n```\n");
});

test("prose before and after the fence", () => {
  expectValid(
    "I investigated the flip handler.\n\n```json\n" +
      JSON.stringify(VALID) +
      "\n```\n\nLet me know if you need more detail.",
  );
});

test("fence without json language tag", () => {
  expectValid("```\n" + JSON.stringify(VALID) + "\n```");
});

test("unfenced bare json amid prose", () => {
  expectValid("Assessment follows:\n" + JSON.stringify(VALID) + "\nDone.");
});

test("braces inside string values do not break the scan", () => {
  const withBraces = { ...VALID, evidence: "code does `if (x) { y() }` with {nested} braces" };
  expectValid(
    "Result: " +
      JSON.stringify({ ...withBraces, severity: "high", confidence: 0.85 }) +
      " — end.",
  );
});

test("last json fence wins (retry replies may quote the broken one)", () => {
  const broken = "```json\n{ not valid json\n```";
  const good = "```json\n" + JSON.stringify(VALID) + "\n```";
  expectValid(`${broken}\nCorrected:\n${good}`);
});

test("enum values are normalized from mixed case/whitespace", () => {
  const messy = { ...VALID, severity: " High ", affected_users: "MANY", complexity: "Small" };
  const result = extractAssessment("```json\n" + JSON.stringify(messy) + "\n```");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.severity, "high");
    assert.equal(result.value.affected_users, "many");
    assert.equal(result.value.complexity, "small");
  }
});

test("confidence accepts numeric strings and clamps to 0..1", () => {
  const messy = { ...VALID, confidence: "1.4" };
  const result = extractAssessment("```json\n" + JSON.stringify(messy) + "\n```");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.confidence, 1);
});

test("relevant_files coerces a single string to a one-element array", () => {
  const messy = { ...VALID, relevant_files: "store/gameStore.ts" };
  const result = extractAssessment("```json\n" + JSON.stringify(messy) + "\n```");
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value.relevant_files, ["store/gameStore.ts"]);
});

test("rejects unknown severity", () => {
  const bad = { ...VALID, severity: "catastrophic" };
  const result = extractAssessment("```json\n" + JSON.stringify(bad) + "\n```");
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /severity/);
});

test("rejects missing required text field", () => {
  const { proposed_fix: _omitted, ...bad } = VALID;
  const result = extractAssessment("```json\n" + JSON.stringify(bad) + "\n```");
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /proposed_fix/);
});

test("rejects non-numeric confidence", () => {
  const bad = { ...VALID, confidence: "quite sure" };
  const result = extractAssessment("```json\n" + JSON.stringify(bad) + "\n```");
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /confidence/);
});

test("rejects malformed json with a parse error", () => {
  const result = extractAssessment('```json\n{ "severity": "high", \n```');
  assert.equal(result.ok, false);
});

test("rejects empty output", () => {
  const result = extractAssessment("");
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /empty/);
});

test("rejects output with no json at all", () => {
  const result = extractAssessment("I could not complete the investigation.");
  assert.equal(result.ok, false);
});
