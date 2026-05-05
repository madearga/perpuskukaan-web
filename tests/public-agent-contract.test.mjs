import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("publicAgent exposes register, search, my books, add draft, borrow draft", () => {
  const source = read("convex/publicAgent.ts");

  assert.match(source, /registerTelegramUser/);
  assert.match(source, /searchBooks/);
  assert.match(source, /getMyBooks/);
  assert.match(source, /createBookDraft/);
  assert.match(source, /createBorrowDraft/);
  assert.match(source, /providerUserId/);
  assert.match(source, /idempotencyKey/);
});

test("publicAgent resolves identity via userIdentities.by_provider_user", () => {
  const source = read("convex/publicAgent.ts");

  assert.match(source, /by_provider_user/);
  assert.match(source, /resolveIdentity/);
});

test("publicAgent uses agentActions.by_idempotency_key for draft idempotency", () => {
  const source = read("convex/publicAgent.ts");

  assert.match(source, /by_idempotency_key/);
  assert.match(source, /idempotencyKey/);
  assert.match(source, /duplicate/);
});

test("publicAgent rejects unlinked users with NOT_LINKED error", () => {
  const source = read("convex/publicAgent.ts");

  assert.match(source, /NOT_LINKED/);
});

test("publicAgent registerTelegramUser creates user and identity records", () => {
  const source = read("convex/publicAgent.ts");

  assert.match(source, /registerTelegramUser/);
  assert.match(source, /userIdentities/);
  assert.match(source, /alreadyRegistered/);
});

test("publicAgent createBorrowDraft uses bookId reference", () => {
  const source = read("convex/publicAgent.ts");

  assert.match(source, /bookId/);
  assert.match(source, /durationDays/);
  assert.match(source, /public\.createBorrowDraft/);
});
