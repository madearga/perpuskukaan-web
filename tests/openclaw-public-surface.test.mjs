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

// --- Task 3: Public persona, examples, and rollout scripts ---

test("OpenClaw public prompt forbids raw admin command leakage", () => {
  const prompt = read("ops/openclaw/public/system-prompt.md");

  // Must reference Convex as source of truth
  assert.match(prompt, /Convex is the source of truth/);

  // Must explicitly forbid raw gateway command exposure
  assert.match(prompt, /never expose raw gateway commands/i);

  // Must list all allowlisted public actions
  assert.match(prompt, /register/);
  assert.match(prompt, /search_books/);
  assert.match(prompt, /my_books/);
  assert.match(prompt, /add_book_draft/);
  assert.match(prompt, /borrow_draft/);

  // Must require Indonesian replies
  assert.match(prompt, /balas dalam Bahasa Indonesia/i);
});

test("OpenClaw public prompt requires idempotency keys for write actions", () => {
  const prompt = read("ops/openclaw/public/system-prompt.md");

  assert.match(prompt, /idempotencyKey/);
});

test("OpenClaw few-shot examples cover core public actions", () => {
  const examples = read("ops/openclaw/public/examples.md");

  // Must include examples for search, my_books, add_book_draft, borrow_draft, and register
  assert.match(examples, /search_books/);
  assert.match(examples, /my_books/);
  assert.match(examples, /add_book_draft/);
  assert.match(examples, /borrow_draft/);
  assert.match(examples, /register/);
});

test("OpenClaw enable script stops poller and starts openclaw", () => {
  const enable = read("ops/openclaw/scripts/enable-public-gateway.sh");

  assert.match(enable, /set -euo pipefail/);
  assert.match(enable, /systemctl stop perpuskukaan-telegram-poller/);
  assert.match(enable, /systemctl disable perpuskukaan-telegram-poller/);
  assert.match(enable, /systemctl enable --now openclaw/);
  assert.match(enable, /systemctl is-active openclaw/);

  // Safety: must not deploy or touch running services beyond this switch
  assert.doesNotMatch(enable, /npx convex deploy/);
  assert.doesNotMatch(enable, /git push/);
  assert.doesNotMatch(enable, /rsync/);
});

test("OpenClaw rollback script stops openclaw and restarts poller", () => {
  const rollback = read("ops/openclaw/scripts/rollback-to-bot-layer.sh");

  assert.match(rollback, /set -euo pipefail/);
  assert.match(rollback, /systemctl stop openclaw/);
  assert.match(rollback, /systemctl disable openclaw/);
  assert.match(rollback, /systemctl enable --now perpuskukaan-telegram-poller/);
  assert.match(rollback, /systemctl is-active perpuskukaan-telegram-poller/);

  // Safety: must not deploy or push
  assert.doesNotMatch(rollback, /npx convex deploy/);
  assert.doesNotMatch(rollback, /git push/);
  assert.doesNotMatch(rollback, /rsync/);
});

test("rollout scripts use bash shebang and are safe", () => {
  const enable = read("ops/openclaw/scripts/enable-public-gateway.sh");
  const rollback = read("ops/openclaw/scripts/rollback-to-bot-layer.sh");

  // Must have proper shebang
  assert.match(enable, /^#!/);
  assert.match(rollback, /^#!/);

  // Must use set -euo pipefail for safety
  assert.match(enable, /set -euo pipefail/);
  assert.match(rollback, /set -euo pipefail/);

  // Must not contain dangerous patterns
  assert.doesNotMatch(enable, /rm -rf \//);
  assert.doesNotMatch(rollback, /rm -rf \//);
});
