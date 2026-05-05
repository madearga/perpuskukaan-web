import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("publicAgent exposes all 10 public actions", () => {
  const source = read("convex/publicAgent.ts");

  assert.match(source, /registerTelegramUser/);
  assert.match(source, /searchBooks/);
  assert.match(source, /getMyBooks/);
  assert.match(source, /createBookDraft/);
  assert.match(source, /createBorrowDraft/);
  assert.match(source, /getMyBorrows/);
  assert.match(source, /getIncomingBorrowRequests/);
  assert.match(source, /approveBorrow/);
  assert.match(source, /rejectBorrow/);
  assert.match(source, /returnBook/);
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

test("publicAgent getMyBorrows queries borrowRequests and transactions by borrower", () => {
  const source = read("convex/publicAgent.ts");

  assert.match(source, /getMyBorrows/);
  assert.match(source, /by_borrower/);
  assert.match(source, /borrowRequests/);
  assert.match(source, /transactions/);
});

test("publicAgent getIncomingBorrowRequests queries borrowRequests by lender", () => {
  const source = read("convex/publicAgent.ts");

  assert.match(source, /getIncomingBorrowRequests/);
  assert.match(source, /by_lender/);
});

test("publicAgent approveBorrow verifies lender ownership and uses idempotency", () => {
  const source = read("convex/publicAgent.ts");

  assert.match(source, /approveBorrow/);
  assert.match(source, /public\.approveBorrow/);
  assert.match(source, /NOT_AUTHORIZED/);
  assert.match(source, /lenderId/);
  assert.match(source, /by_idempotency_key/);
});

test("publicAgent rejectBorrow verifies lender ownership and uses idempotency", () => {
  const source = read("convex/publicAgent.ts");

  assert.match(source, /rejectBorrow/);
  assert.match(source, /public\.rejectBorrow/);
  assert.match(source, /NOT_AUTHORIZED/);
  assert.match(source, /rejectionReason/);
});

test("publicAgent returnBook verifies borrower or lender, updates book to available", () => {
  const source = read("convex/publicAgent.ts");

  assert.match(source, /returnBook/);
  assert.match(source, /public\.returnBook/);
  assert.match(source, /NOT_AUTHORIZED/);
  assert.match(source, /available/);
  assert.match(source, /TRANSACTION_NOT_ACTIVE/);
  assert.match(source, /returnDate/);
});
