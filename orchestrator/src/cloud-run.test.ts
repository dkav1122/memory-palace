import assert from "node:assert/strict";
import { test } from "node:test";
import { isStreamLossError } from "./cloud-run.js";

test("isStreamLossError matches known stream-loss messages", () => {
  assert.equal(isStreamLossError("Run stream is no longer available"), true);
  assert.equal(isStreamLossError("run run-abc ended with status \"error\": Run stream is no longer available"), true);
  assert.equal(isStreamLossError("STREAM_EXPIRED"), true);
  assert.equal(isStreamLossError("The stream expired after retention"), true);
});

test("isStreamLossError rejects unrelated failures", () => {
  assert.equal(isStreamLossError(undefined), false);
  assert.equal(isStreamLossError(null), false);
  assert.equal(isStreamLossError(""), false);
  assert.equal(isStreamLossError("Model refused the request"), false);
  assert.equal(isStreamLossError("Agent cancelled by user"), false);
  assert.equal(isStreamLossError("Internal server error"), false);
});
