import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("public agent route requires local shared secret and allowlisted actions", () => {
  const source = read("src/app/api/public-agent/action/route.ts");

  // Must validate the shared secret header
  assert.match(source, /X-OpenClaw-Secret/i);

  // Must reference the env var for secret comparison
  assert.match(source, /OPENCLAW_PUBLIC_SECRET/);

  // Must include all allowlisted actions
  assert.match(source, /search_books/);
  assert.match(source, /my_books/);
  assert.match(source, /register/);
  assert.match(source, /add_book_draft/);
  assert.match(source, /borrow_draft/);

  // Must NOT contain any shell execution primitives
  assert.doesNotMatch(source, /eval\s*\(/);
  assert.doesNotMatch(source, /exec\s*\(/);
  assert.doesNotMatch(source, /spawn\s*\(/);
  assert.doesNotMatch(source, /system\s*\(/);
});

test("public agent route forwards to Convex publicAgent functions", () => {
  const source = read("src/app/api/public-agent/action/route.ts");

  // Must reference Convex publicAgent functions
  assert.match(source, /publicAgent/);
  assert.match(source, /registerTelegramUser/);
  assert.match(source, /searchBooks/);
  assert.match(source, /getMyBooks/);
  assert.match(source, /createBookDraft/);
  assert.match(source, /createBorrowDraft/);
});

test("public agent route rejects invalid or missing actions with 400", () => {
  const source = read("src/app/api/public-agent/action/route.ts");

  assert.match(source, /invalid_action/);
  assert.match(source, /400/);
});

test("public agent route rejects wrong secret with 403", () => {
  const source = read("src/app/api/public-agent/action/route.ts");

  assert.match(source, /forbidden/);
  assert.match(source, /403/);
});
