import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("schema has channel identities for Telegram and WhatsApp", () => {
  const schema = read("convex/schema.ts");

  assert.match(schema, /userIdentities:\s*defineTable/);
  assert.match(schema, /provider:\s*v\.union\(/);
  assert.match(schema, /v\.literal\("telegram"\)/);
  assert.match(schema, /v\.literal\("whatsapp"\)/);
  assert.match(schema, /providerUserId:\s*v\.string\(\)/);
  assert.match(schema, /\.index\("by_provider_user"/);
  assert.match(schema, /\.index\("by_user"/);
});

test("schema has agent action audit log with idempotency", () => {
  const schema = read("convex/schema.ts");

  assert.match(schema, /agentActions:\s*defineTable/);
  assert.match(schema, /idempotencyKey:\s*v\.string\(\)/);
  assert.match(schema, /channel:\s*v\.string\(\)/);
  assert.match(schema, /providerUserId:\s*v\.string\(\)/);
  assert.match(schema, /status:\s*v\.union\(/);
  assert.match(schema, /v\.literal\("applied"\)/);
  assert.match(schema, /resultSummary:\s*v\.optional\(v\.string\(\)\)/);
  assert.match(schema, /\.index\("by_idempotency_key"/);
});

test("agent action helpers enforce idempotency before writes", () => {
  const source = read("convex/agentActions.ts");

  assert.match(source, /getExistingAction/);
  assert.match(source, /by_idempotency_key/);
  assert.match(source, /createAgentAction/);
  assert.match(source, /completeAgentAction/);
  assert.match(source, /failAgentAction/);
});

test("agent book operations require linked channel identity and audit action", () => {
  const source = read("convex/agentBooks.ts");

  assert.match(source, /resolveChannelUser/);
  assert.match(source, /by_provider_user/);
  assert.match(source, /addBookFromAgent/);
  assert.match(source, /searchBooksForAgent/);
  assert.match(source, /idempotencyKey/);
  assert.match(source, /agentActions/);
  assert.doesNotMatch(source, /process\.env\.CONVEX_DEPLOY/);
});

test("agent identity model supports WhatsApp migration", () => {
  const schema = read("convex/schema.ts");
  const runbook = read("ops/hermes/README.md");

  assert.match(schema, /v\.literal\("whatsapp"\)/);
  assert.match(runbook, /WhatsApp\/Baileys/i);
  assert.match(runbook, /QR/i);
  assert.match(runbook, /re-pair/i);
});
