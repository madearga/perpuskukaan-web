import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const skill = () =>
  readFileSync(
    new URL("../ops/hermes/skills/perpuskukaan-admin/SKILL.md", import.meta.url),
    "utf8"
  );

test("perpuskukaan admin skill forces Convex as source of truth", () => {
  const source = skill();

  assert.match(source, /Convex is the source of truth/i);
  assert.match(source, /Hermes is only the natural-language operator/i);
  assert.match(source, /Do not write directly to Convex tables from shell scripts/i);
});

test("perpuskukaan admin skill requires exact confirmation for high-risk writes", () => {
  const source = skill();

  assert.match(source, /exact phrase/i);
  assert.match(source, /High-risk writes/i);
  assert.match(source, /accept\/reject borrow request/i);
  assert.match(source, /broadcast messages/i);
});

test("perpuskukaan admin skill requires idempotency and audit logging", () => {
  const source = skill();

  assert.match(source, /idempotency key/i);
  assert.match(source, /channel:messageId:actionName/i);
  assert.match(source, /Audit Log Minimum/i);
  assert.match(source, /providerUserId/i);
  assert.match(source, /resultSummary/i);
});
