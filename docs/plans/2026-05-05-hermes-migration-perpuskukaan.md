# Hermes Migration + Perpuskukaan Web Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Perpuskukaan from OpenClaw to Hermes, remove OpenClaw cleanly from the VM, and integrate Hermes with the Convex-backed Perpuskukaan web app through safe, audited administrative tools.

**Architecture:** Convex remains the source of truth. Hermes runs as the messaging/agent sidecar for Telegram now and WhatsApp later, calling narrow Convex-facing tools instead of writing data directly. OpenClaw is kept as rollback until Hermes passes channel tests, then stopped, disabled, backed up, and removed.

**Tech Stack:** Next.js 16, React 19, Convex, Better Auth, Hermes Agent, Telegram gateway, future WhatsApp/Baileys gateway, systemd, Node.js scripts, TypeScript, node:test.

---

## Current State

- Local app: `~/Desktop/perpuskukaan-web`
- Web backend: Convex with existing tables `users`, `books`, `borrowRequests`, `transactions`, `reviews`, `wishlist`
- Existing bot-compatible functions: `convex/botBooks.ts`
- OpenClaw VM: `perpuskukaan.exe.xyz`
- Existing OpenClaw state: `~/.openclaw/`
- Existing OpenClaw model: `nvidia/nvidia/nemotron-3-super-120b-a12b`
- Existing OpenClaw service: `openclaw.service`
- Hermes migration docs: `https://hermes-agent.nousresearch.com/docs/guides/migrate-from-openclaw`

## Target Runtime

```text
Telegram / WhatsApp
  -> Hermes gateway
  -> Perpuskukaan Hermes skill + tool contract
  -> Convex HTTP/tool bridge
  -> Convex queries/mutations/actions
  -> audited response
```

## Files and Responsibilities

### Create

- `docs/superpowers/plans/2026-05-05-hermes-migration-perpuskukaan.md`
  - This plan.
- `ops/hermes/skills/perpuskukaan-admin/SKILL.md`
  - Hermes skill that constrains administrative behavior: Convex source of truth, confirmation rules, idempotency, audit logging.
- `ops/hermes/README.md`
  - Operator runbook for installing, migrating, starting, verifying, rolling back, and removing OpenClaw.
- `ops/hermes/scripts/preflight.sh`
  - VM preflight: resource checks, service checks, config backup, Hermes/OpenClaw status.
- `ops/hermes/scripts/migrate-openclaw-to-hermes.sh`
  - Safe migration wrapper around `hermes claw migrate` with dry-run, backup, and explicit confirmation.
- `ops/hermes/scripts/cutover-to-hermes.sh`
  - Stops OpenClaw, starts Hermes, verifies Telegram, leaves OpenClaw files for rollback.
- `ops/hermes/scripts/remove-openclaw-after-cutover.sh`
  - Final cleanup only after verification window: disable service, archive state, remove binaries/runtime files.
- `ops/hermes/scripts/install-perpuskukaan-skill.sh`
  - Copies `ops/hermes/skills/perpuskukaan-admin` into `~/.hermes/skills/` on the VM.
- `convex/agentActions.ts`
  - Audit/idempotency table operations for agent-originated actions.
- `convex/agentBooks.ts`
  - Safe, idempotent, channel-aware book operations for Hermes.
- `convex/agentBorrowRequests.ts`
  - Safe, idempotent, channel-aware borrow request operations for Hermes.
- `tests/hermes-admin-skill.test.mjs`
  - Static tests enforcing skill guardrails.
- `tests/agent-contract-surface.test.mjs`
  - Static tests enforcing no direct table writes from agent bridge and presence of idempotency/audit rules.

### Modify

- `convex/schema.ts`
  - Add `userIdentities` and `agentActions` tables.
- `convex/users.ts`
  - Add channel identity lookup/link helpers or route through new dedicated identity functions.
- `convex/botBooks.ts`
  - Keep for compatibility or deprecate behind `agentBooks.ts` after tests pass.
- `.gitignore`
  - Ensure `.pi/`, local secrets, and generated archives are ignored.

---

## Task 1: Lock Down the Hermes Admin Skill

**Files:**
- Create/Modify: `ops/hermes/skills/perpuskukaan-admin/SKILL.md`
- Test: `tests/hermes-admin-skill.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `tests/hermes-admin-skill.test.mjs`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails before the skill exists or before required sections exist**

Run:

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
```

Expected before implementation: FAIL mentioning missing file or missing required text.

- [ ] **Step 3: Write the skill**

Create `ops/hermes/skills/perpuskukaan-admin/SKILL.md`:

```markdown
---
name: perpuskukaan-admin
description: Use when operating Perpuskukaan library workflows from Hermes, Telegram, WhatsApp, or other chat channels, especially when reading or mutating Convex-backed books, users, borrow requests, transactions, or admin actions.
---

# Perpuskukaan Admin

## Core Rule

Convex is the source of truth. Hermes is only the natural-language operator. Never treat chat memory, session state, or agent reasoning as authoritative for books, users, borrow requests, or transactions.

## Allowed Flow

```text
Telegram / WhatsApp / Dashboard
  -> Hermes intent parsing
  -> narrow Perpuskukaan tool/API call
  -> Convex query/mutation/action
  -> audited response back to channel
```

## Never Do

- Do not write directly to Convex tables from shell scripts.
- Do not expose Hermes/OpenClaw gateway ports publicly without auth.
- Do not execute irreversible actions from a vague confirmation like “ya”.
- Do not create duplicate books or borrow requests without checking idempotency.
- Do not decide permissions inside the LLM prompt; enforce them in Convex.

## Identity Rules

Use channel identities only to look up verified app users:

- Telegram: `provider = "telegram"`, `providerUserId = telegram sender id`
- WhatsApp: `provider = "whatsapp"`, `providerUserId = WhatsApp JID or normalized phone`
- Web: Better Auth user email/session

If the channel identity is not linked, respond with a linking URL or instruction. Do not create transactional records for unlinked users except an explicit low-risk onboarding draft.

## Write Action Confirmation

For destructive or administrative writes, use a two-step confirmation:

1. Produce a concise summary and a nonce-based confirmation phrase.
2. Execute only when the user replies with the exact phrase.

Example:

```text
Saya akan approve permintaan pinjam “Atomic Habits” oleh Rina selama 7 hari.
Balas persis: KONFIRMASI APPROVE BR-8K2M
```

Low-risk writes that may execute immediately after parsing:

- search catalog
- list my books
- add a book owned by the requesting linked user, if arguments are complete
- create a borrow request for the requesting linked user, if book is available

High-risk writes that require exact confirmation:

- accept/reject borrow request
- mark returned/lost/damaged
- delete/archive book
- change another user’s role/status
- broadcast messages
- bulk import/update

## Idempotency

Every channel-originated write must include an idempotency key:

```text
channel:messageId:actionName
telegram:123456789:addBook
whatsapp:ABCD1234:createBorrowRequest
```

If a duplicate key is seen, return the previously recorded result.

## Audit Log Minimum

For every agent-originated Convex write, record:

- `channel`
- `providerUserId`
- `appUserId` when resolved
- `action`
- `idempotencyKey`
- sanitized `input`
- `status`: `drafted | confirmed | applied | rejected | failed`
- `resultSummary`
- `createdAt`

## Error Style

Return user-safe errors in Indonesian. Include what the user can do next.

```text
Aku belum bisa lanjut karena akun WhatsApp ini belum terhubung ke Perpuskukaan.
Buka dashboard lalu hubungkan WhatsApp, atau kirim /link untuk panduan.
```

## Verification Before Claiming Success

After changing production gateway or Convex integration:

```bash
pnpm test
pnpm lint
pnpm build
ssh perpuskukaan.exe.xyz 'systemctl --user status hermes-gateway --no-pager || systemctl status hermes-gateway --no-pager'
```

For channel cutover, verify one read and one safe write from the actual channel before removing the previous gateway.
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/perpuskukaan-web
git add ops/hermes/skills/perpuskukaan-admin/SKILL.md tests/hermes-admin-skill.test.mjs
git commit -m "docs: add Perpuskukaan Hermes admin skill"
```

---

## Task 2: Add Convex Agent Audit and Identity Schema

**Files:**
- Modify: `convex/schema.ts`
- Create: `tests/agent-contract-surface.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `tests/agent-contract-surface.test.mjs`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
```

Expected: FAIL because `userIdentities` and `agentActions` are not yet in `convex/schema.ts`.

- [ ] **Step 3: Modify `convex/schema.ts`**

Add these tables before the final closing `});`:

```ts
  userIdentities: defineTable({
    userId: v.id("users"),
    provider: v.union(
      v.literal("telegram"),
      v.literal("whatsapp"),
      v.literal("web")
    ),
    providerUserId: v.string(),
    username: v.optional(v.string()),
    displayName: v.optional(v.string()),
    verifiedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_provider_user", ["provider", "providerUserId"]),

  agentActions: defineTable({
    channel: v.string(),
    providerUserId: v.string(),
    appUserId: v.optional(v.id("users")),
    action: v.string(),
    idempotencyKey: v.string(),
    input: v.string(),
    status: v.union(
      v.literal("drafted"),
      v.literal("confirmed"),
      v.literal("applied"),
      v.literal("rejected"),
      v.literal("failed")
    ),
    resultSummary: v.optional(v.string()),
    resultJson: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_idempotency_key", ["idempotencyKey"])
    .index("by_channel_user", ["channel", "providerUserId"])
    .index("by_app_user", ["appUserId"]),
```

- [ ] **Step 4: Run tests and Convex typecheck**

Run:

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
npx convex codegen
pnpm build
```

Expected: tests PASS, codegen succeeds, build succeeds.

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/perpuskukaan-web
git add convex/schema.ts tests/agent-contract-surface.test.mjs convex/_generated
git commit -m "feat: add agent identity and audit schema"
```

---

## Task 3: Implement Idempotent Agent Action Helpers

**Files:**
- Create: `convex/agentActions.ts`
- Modify: `tests/agent-contract-surface.test.mjs`

- [ ] **Step 1: Extend the failing test**

Append to `tests/agent-contract-surface.test.mjs`:

```js
test("agent action helpers enforce idempotency before writes", () => {
  const source = read("convex/agentActions.ts");

  assert.match(source, /getExistingAction/);
  assert.match(source, /by_idempotency_key/);
  assert.match(source, /createAgentAction/);
  assert.match(source, /completeAgentAction/);
  assert.match(source, /failAgentAction/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
```

Expected: FAIL because `convex/agentActions.ts` does not exist.

- [ ] **Step 3: Create `convex/agentActions.ts`**

```ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getExistingAction = query({
  args: { idempotencyKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentActions")
      .withIndex("by_idempotency_key", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey)
      )
      .first();
  },
});

export const createAgentAction = mutation({
  args: {
    channel: v.string(),
    providerUserId: v.string(),
    appUserId: v.optional(v.id("users")),
    action: v.string(),
    idempotencyKey: v.string(),
    input: v.string(),
    status: v.union(v.literal("drafted"), v.literal("confirmed")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agentActions")
      .withIndex("by_idempotency_key", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey)
      )
      .first();

    if (existing) {
      return { success: true, duplicate: true, actionId: existing._id, existing };
    }

    const now = Date.now();
    const actionId = await ctx.db.insert("agentActions", {
      channel: args.channel,
      providerUserId: args.providerUserId,
      appUserId: args.appUserId,
      action: args.action,
      idempotencyKey: args.idempotencyKey,
      input: args.input,
      status: args.status,
      resultSummary: undefined,
      resultJson: undefined,
      error: undefined,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, duplicate: false, actionId };
  },
});

export const completeAgentAction = mutation({
  args: {
    actionId: v.id("agentActions"),
    resultSummary: v.string(),
    resultJson: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.actionId, {
      status: "applied",
      resultSummary: args.resultSummary,
      resultJson: args.resultJson,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const failAgentAction = mutation({
  args: {
    actionId: v.id("agentActions"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.actionId, {
      status: "failed",
      error: args.error,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
```

- [ ] **Step 4: Run tests and build**

Run:

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
npx convex codegen
pnpm build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/perpuskukaan-web
git add convex/agentActions.ts tests/agent-contract-surface.test.mjs convex/_generated
git commit -m "feat: add idempotent agent action audit helpers"
```

---

## Task 4: Add Safe Agent Book Contract

**Files:**
- Create: `convex/agentBooks.ts`
- Modify: `tests/agent-contract-surface.test.mjs`

- [ ] **Step 1: Extend failing test**

Append:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
```

Expected: FAIL because `convex/agentBooks.ts` does not exist.

- [ ] **Step 3: Create `convex/agentBooks.ts`**

```ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const channelValidator = v.union(v.literal("telegram"), v.literal("whatsapp"));

async function resolveChannelUser(
  ctx: any,
  provider: "telegram" | "whatsapp",
  providerUserId: string
) {
  const identity = await ctx.db
    .query("userIdentities")
    .withIndex("by_provider_user", (q: any) =>
      q.eq("provider", provider).eq("providerUserId", providerUserId)
    )
    .first();

  if (!identity) return null;
  const user = await ctx.db.get(identity.userId);
  if (!user || user.isActive === false) return null;
  return user;
}

export const searchBooksForAgent = query({
  args: {
    channel: channelValidator,
    providerUserId: v.string(),
    query: v.string(),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await resolveChannelUser(ctx, args.channel, args.providerUserId);
    if (!user) {
      return { success: false, error: "Akun channel belum terhubung ke Perpuskukaan." };
    }

    const limit = Math.min(args.limit ?? 10, 20);
    const results = await ctx.db
      .query("books")
      .withSearchIndex("search_books", (q) => {
        let search = q.search("title", args.query);
        if (args.category) search = search.eq("category", args.category);
        return search.eq("status", "available");
      })
      .take(limit);

    return { success: true, results };
  },
});

export const addBookFromAgent = mutation({
  args: {
    channel: channelValidator,
    providerUserId: v.string(),
    idempotencyKey: v.string(),
    title: v.string(),
    author: v.string(),
    isbn: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.string(),
    condition: v.string(),
    mode: v.string(),
    language: v.optional(v.string()),
    fictionType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingAction = await ctx.db
      .query("agentActions")
      .withIndex("by_idempotency_key", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey)
      )
      .first();

    if (existingAction?.status === "applied") {
      return {
        success: true,
        duplicate: true,
        message: existingAction.resultSummary ?? "Aksi ini sudah pernah diproses.",
      };
    }

    const user = await resolveChannelUser(ctx, args.channel, args.providerUserId);
    if (!user) {
      return { success: false, error: "Akun channel belum terhubung ke Perpuskukaan." };
    }

    const now = Date.now();
    const actionId = existingAction?._id ?? await ctx.db.insert("agentActions", {
      channel: args.channel,
      providerUserId: args.providerUserId,
      appUserId: user._id,
      action: "addBookFromAgent",
      idempotencyKey: args.idempotencyKey,
      input: JSON.stringify({
        title: args.title,
        author: args.author,
        isbn: args.isbn,
        category: args.category,
        condition: args.condition,
        mode: args.mode,
      }),
      status: "confirmed",
      resultSummary: undefined,
      resultJson: undefined,
      error: undefined,
      createdAt: now,
      updatedAt: now,
    });

    const bookId = await ctx.db.insert("books", {
      ownerId: user._id,
      title: args.title,
      author: args.author,
      isbn: args.isbn,
      description: args.description,
      category: args.category,
      condition: args.condition,
      status: "available",
      mode: args.mode,
      language: args.language,
      fictionType: args.fictionType,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(actionId, {
      status: "applied",
      resultSummary: `Buku ditambahkan: ${args.title}`,
      resultJson: JSON.stringify({ bookId }),
      updatedAt: now,
    });

    await ctx.db.patch(user._id, {
      totalBooksShared: (user.totalBooksShared ?? 0) + 1,
      updatedAt: now,
    });

    return { success: true, duplicate: false, bookId };
  },
});
```

- [ ] **Step 4: Run tests/build**

Run:

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
npx convex codegen
pnpm build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/perpuskukaan-web
git add convex/agentBooks.ts tests/agent-contract-surface.test.mjs convex/_generated
git commit -m "feat: add safe agent book contract"
```

---

## Task 5: Write VM Operator Scripts for Migration and Cleanup

**Files:**
- Create: `ops/hermes/README.md`
- Create: `ops/hermes/scripts/preflight.sh`
- Create: `ops/hermes/scripts/migrate-openclaw-to-hermes.sh`
- Create: `ops/hermes/scripts/cutover-to-hermes.sh`
- Create: `ops/hermes/scripts/remove-openclaw-after-cutover.sh`
- Create: `ops/hermes/scripts/install-perpuskukaan-skill.sh`
- Test: `tests/hermes-ops-scripts.test.mjs`

- [ ] **Step 1: Write failing tests**

Create `tests/hermes-ops-scripts.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, statSync } from "node:fs";

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const executable = (relativePath) => {
  const mode = statSync(new URL(`../${relativePath}`, import.meta.url)).mode;
  return (mode & 0o111) !== 0;
};

test("migration scripts use dry-run and backups before mutating services", () => {
  const migrate = read("ops/hermes/scripts/migrate-openclaw-to-hermes.sh");
  const cutover = read("ops/hermes/scripts/cutover-to-hermes.sh");

  assert.match(migrate, /hermes claw migrate --dry-run/);
  assert.match(migrate, /tar .*\.openclaw/);
  assert.match(migrate, /--preset full --migrate-secrets/);
  assert.match(cutover, /systemctl stop openclaw/);
  assert.match(cutover, /hermes gateway start|systemctl --user start hermes-gateway/);
});

test("remove script archives OpenClaw before disabling and deleting", () => {
  const source = read("ops/hermes/scripts/remove-openclaw-after-cutover.sh");

  assert.match(source, /tar .*openclaw-final/);
  assert.match(source, /systemctl disable openclaw/);
  assert.match(source, /rm -rf .*\.openclaw/);
  assert.match(source, /I_UNDERSTAND_OPENCLAW_REMOVAL/);
});

test("operator scripts are executable", () => {
  for (const script of [
    "ops/hermes/scripts/preflight.sh",
    "ops/hermes/scripts/migrate-openclaw-to-hermes.sh",
    "ops/hermes/scripts/cutover-to-hermes.sh",
    "ops/hermes/scripts/remove-openclaw-after-cutover.sh",
    "ops/hermes/scripts/install-perpuskukaan-skill.sh",
  ]) {
    assert.equal(executable(script), true, `${script} should be executable`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
```

Expected: FAIL because scripts do not exist.

- [ ] **Step 3: Create `ops/hermes/scripts/preflight.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "== Perpuskukaan Hermes preflight =="
echo "host=$(hostname)"
echo "date=$(date -Is)"
echo

echo "== resources =="
uptime
free -h
df -h /
echo

echo "== services =="
systemctl status openclaw --no-pager -l | sed -n '1,35p' || true
systemctl --user status hermes-gateway --no-pager -l | sed -n '1,35p' || true
echo

echo "== config dirs =="
ls -ld "$HOME/.openclaw" "$HOME/.hermes" 2>/dev/null || true
du -sh "$HOME/.openclaw" "$HOME/.hermes" 2>/dev/null || true
echo

echo "== hermes status =="
export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"
if command -v hermes >/dev/null 2>&1; then
  hermes status | sed -E 's/(sk-|nvapi-|tvly-|gsk_|ntn_)[A-Za-z0-9_.-]+/\1…/g'
else
  echo "Hermes is not installed"
fi
```

- [ ] **Step 4: Create `ops/hermes/scripts/migrate-openclaw-to-hermes.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"
BACKUP_DIR="$HOME/backups/perpuskukaan-hermes"
STAMP="$(date +%Y%m%d%H%M%S)"
mkdir -p "$BACKUP_DIR"

if ! command -v hermes >/dev/null 2>&1; then
  echo "Hermes is not installed. Install first:"
  echo "curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash"
  exit 1
fi

if [ ! -d "$HOME/.openclaw" ]; then
  echo "No ~/.openclaw directory found; nothing to migrate."
  exit 1
fi

echo "Creating OpenClaw backup..."
tar -C "$HOME" -czf "$BACKUP_DIR/openclaw-pre-hermes-$STAMP.tgz" .openclaw

echo "Creating Hermes backup if present..."
if [ -d "$HOME/.hermes" ]; then
  tar -C "$HOME" -czf "$BACKUP_DIR/hermes-pre-migration-$STAMP.tgz" .hermes
fi

echo "Running dry-run preview..."
hermes claw migrate --source "$HOME/.openclaw" --dry-run

read -r -p "Apply full migration with secrets? Type MIGRATE_HERMES: " answer
if [ "$answer" != "MIGRATE_HERMES" ]; then
  echo "Cancelled."
  exit 1
fi

hermes claw migrate --source "$HOME/.openclaw" --preset full --migrate-secrets

echo "Migration complete. Run: hermes status"
```

- [ ] **Step 5: Create `ops/hermes/scripts/cutover-to-hermes.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"
export XDG_RUNTIME_DIR="/run/user/$(id -u)"

if ! command -v hermes >/dev/null 2>&1; then
  echo "Hermes is not installed."
  exit 1
fi

echo "Stopping OpenClaw to avoid Telegram polling conflict..."
sudo systemctl stop openclaw || true
sleep 5

echo "Starting Hermes gateway..."
hermes gateway start || systemctl --user start hermes-gateway
sleep 15

echo "Hermes gateway status:"
hermes gateway status || systemctl --user status hermes-gateway --no-pager -l

echo "Verify in Telegram now: send a safe read-only message like 'status perpuskukaan'."
echo "Rollback if needed: sudo systemctl stop hermes-gateway || hermes gateway stop; sudo systemctl start openclaw"
```

- [ ] **Step 6: Create `ops/hermes/scripts/remove-openclaw-after-cutover.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="$HOME/backups/perpuskukaan-hermes"
STAMP="$(date +%Y%m%d%H%M%S)"
mkdir -p "$BACKUP_DIR"

read -r -p "Only run after Hermes has been stable for 48h. Type I_UNDERSTAND_OPENCLAW_REMOVAL: " answer
if [ "$answer" != "I_UNDERSTAND_OPENCLAW_REMOVAL" ]; then
  echo "Cancelled."
  exit 1
fi

echo "Archiving final OpenClaw state..."
if [ -d "$HOME/.openclaw" ]; then
  tar -C "$HOME" -czf "$BACKUP_DIR/openclaw-final-$STAMP.tgz" .openclaw
fi

echo "Stopping and disabling OpenClaw..."
sudo systemctl stop openclaw || true
sudo systemctl disable openclaw || true
sudo rm -f /etc/systemd/system/openclaw.service
sudo rm -rf /etc/systemd/system/openclaw.service.d
sudo systemctl daemon-reload

echo "Removing OpenClaw user state and binaries..."
rm -rf "$HOME/.openclaw"
sudo rm -f /bin/openclaw /usr/local/bin/openclaw /usr/bin/openclaw || true

echo "OpenClaw removed. Backup stored in $BACKUP_DIR"
```

- [ ] **Step 7: Create `ops/hermes/scripts/install-perpuskukaan-skill.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:-ops/hermes/skills/perpuskukaan-admin}"
TARGET_DIR="$HOME/.hermes/skills/perpuskukaan-admin"

if [ ! -f "$SOURCE_DIR/SKILL.md" ]; then
  echo "Skill source not found: $SOURCE_DIR/SKILL.md"
  exit 1
fi

mkdir -p "$HOME/.hermes/skills"
rm -rf "$TARGET_DIR"
cp -R "$SOURCE_DIR" "$TARGET_DIR"
chmod -R go-rwx "$TARGET_DIR"

echo "Installed Perpuskukaan Hermes skill to $TARGET_DIR"
```

- [ ] **Step 8: Create `ops/hermes/README.md`**

```markdown
# Perpuskukaan Hermes Operations

## Preflight

```bash
ssh perpuskukaan.exe.xyz
bash ~/perpuskukaan-web/ops/hermes/scripts/preflight.sh
```

## Install Hermes

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"
hermes status
```

## Migrate OpenClaw Config

```bash
bash ~/perpuskukaan-web/ops/hermes/scripts/migrate-openclaw-to-hermes.sh
```

## Install Perpuskukaan Skill

```bash
cd ~/perpuskukaan-web
bash ops/hermes/scripts/install-perpuskukaan-skill.sh
```

## Cut Over Telegram

Do not run OpenClaw and Hermes with the same Telegram token at the same time.

```bash
bash ~/perpuskukaan-web/ops/hermes/scripts/cutover-to-hermes.sh
```

## Rollback

```bash
sudo systemctl stop hermes-gateway || hermes gateway stop || true
sudo systemctl start openclaw
systemctl status openclaw --no-pager -l
```

## Final OpenClaw Removal

Only after Hermes has been stable for 48 hours:

```bash
bash ~/perpuskukaan-web/ops/hermes/scripts/remove-openclaw-after-cutover.sh
```
```

- [ ] **Step 9: Mark scripts executable and run tests**

Run:

```bash
cd ~/Desktop/perpuskukaan-web
chmod +x ops/hermes/scripts/*.sh
pnpm test
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
cd ~/Desktop/perpuskukaan-web
git add ops/hermes tests/hermes-ops-scripts.test.mjs
git commit -m "ops: add Hermes migration and OpenClaw cleanup runbooks"
```

---

## Task 6: Staging Migration on `perpuskukaan.exe.xyz`

**Files:**
- No repo code changes required unless script fixes are needed.

- [ ] **Step 1: Copy repo or ops folder to VM**

Run from local machine:

```bash
rsync -av --delete \
  ~/Desktop/perpuskukaan-web/ops/hermes/ \
  perpuskukaan.exe.xyz:~/perpuskukaan-web/ops/hermes/
```

Expected: files copied.

- [ ] **Step 2: Run preflight**

```bash
ssh perpuskukaan.exe.xyz 'bash ~/perpuskukaan-web/ops/hermes/scripts/preflight.sh'
```

Expected:

- OpenClaw active
- Hermes either absent or installed
- RAM available > 1GB
- disk available > 2GB

- [ ] **Step 3: Install Hermes if missing**

```bash
ssh perpuskukaan.exe.xyz 'curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash'
```

Expected: install completes.

- [ ] **Step 4: Run migration dry-run and full migration**

```bash
ssh -t perpuskukaan.exe.xyz 'bash ~/perpuskukaan-web/ops/hermes/scripts/migrate-openclaw-to-hermes.sh'
```

Expected:

- Backup archive under `~/backups/perpuskukaan-hermes/`
- `hermes claw migrate --dry-run` preview shown
- Full migration applies only after typing `MIGRATE_HERMES`

- [ ] **Step 5: Install Perpuskukaan skill on VM**

```bash
ssh perpuskukaan.exe.xyz 'cd ~/perpuskukaan-web && bash ops/hermes/scripts/install-perpuskukaan-skill.sh'
```

Expected: `~/.hermes/skills/perpuskukaan-admin/SKILL.md` exists.

- [ ] **Step 6: Verify Hermes config before cutover**

```bash
ssh perpuskukaan.exe.xyz 'export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"; hermes status'
```

Expected:

- Telegram token present
- desired model configured
- allowed users present
- no secrets printed in shared notes

- [ ] **Step 7: Commit any ops script fixes discovered during staging**

```bash
cd ~/Desktop/perpuskukaan-web
git status --short
git add ops/hermes tests
git commit -m "fix: harden Hermes migration scripts from staging"
```

Expected: commit only if local scripts were changed.

---

## Task 7: Telegram Cutover and Rollback Window

**Files:**
- No repo code changes required unless runbook changes are discovered.

- [ ] **Step 1: Start a terminal monitoring OpenClaw/Hermes logs**

```bash
ssh perpuskukaan.exe.xyz 'journalctl -u openclaw -f'
```

In another terminal after Hermes starts:

```bash
ssh perpuskukaan.exe.xyz 'tail -f ~/.hermes/logs/gateway.log'
```

Expected: logs visible.

- [ ] **Step 2: Cut over**

```bash
ssh -t perpuskukaan.exe.xyz 'bash ~/perpuskukaan-web/ops/hermes/scripts/cutover-to-hermes.sh'
```

Expected:

- OpenClaw stopped
- Hermes gateway started
- Telegram polling conflict avoided

- [ ] **Step 3: Verify Telegram read-only flow**

Send to `@Perpuskukaanbot`:

```text
Cari buku Atomic Habits
```

Expected:

- Hermes replies in Indonesian
- It does not mutate Convex
- Logs show inbound message and response

- [ ] **Step 4: Verify safe write flow**

Send a linked-user low-risk add-book request:

```text
Tambahkan buku test: Judul Smoke Test Hermes, penulis QA, kategori Nonfiction, kondisi good, mode lend
```

Expected:

- Hermes uses Perpuskukaan admin skill
- Convex write goes through agent tool contract
- Audit row created in `agentActions`
- Duplicate retry does not create a second book

- [ ] **Step 5: Rollback if either verification fails**

```bash
ssh perpuskukaan.exe.xyz 'sudo systemctl stop hermes-gateway || hermes gateway stop || true; sudo systemctl start openclaw; systemctl status openclaw --no-pager -l'
```

Expected: OpenClaw restored.

- [ ] **Step 6: Keep rollback window for 48 hours**

During the window:

```bash
ssh perpuskukaan.exe.xyz 'systemctl status openclaw --no-pager -l || true; hermes gateway status || true; free -h; df -h /'
```

Expected: Hermes stable, OpenClaw stopped, resources safe.

---

## Task 8: Remove OpenClaw Cleanly After Verification Window

**Files:**
- No repo code changes required unless runbook changes are discovered.

- [ ] **Step 1: Confirm 48h Hermes stability**

Check:

```bash
ssh perpuskukaan.exe.xyz 'journalctl --user -u hermes-gateway --since "48 hours ago" --no-pager | grep -Ei "failed|traceback|oom|killed" || true'
```

Expected: no critical recurring failures.

- [ ] **Step 2: Archive and remove OpenClaw**

```bash
ssh -t perpuskukaan.exe.xyz 'bash ~/perpuskukaan-web/ops/hermes/scripts/remove-openclaw-after-cutover.sh'
```

When prompted, type:

```text
I_UNDERSTAND_OPENCLAW_REMOVAL
```

Expected:

- Final OpenClaw tarball under `~/backups/perpuskukaan-hermes/`
- `openclaw.service` stopped/disabled/removed
- `~/.openclaw` removed
- OpenClaw binaries removed if present

- [ ] **Step 3: Verify VM is clean**

```bash
ssh perpuskukaan.exe.xyz 'systemctl status openclaw --no-pager || true; ls -ld ~/.openclaw || true; command -v openclaw || true; free -h; df -h /'
```

Expected:

- No active OpenClaw service
- No `~/.openclaw`
- Hermes still active
- disk usage improved

- [ ] **Step 4: Document final state**

Append to `ops/hermes/README.md` a dated note with:

```markdown
## Cutover Record

- Cutover date:
- Verified Telegram read:
- Verified Telegram safe write:
- OpenClaw final backup path:
- Hermes service name:
- Rollback deadline passed:
```

- [ ] **Step 5: Commit final ops docs**

```bash
cd ~/Desktop/perpuskukaan-web
git add ops/hermes/README.md
git commit -m "docs: record Hermes cutover state"
```

---

## Task 9: WhatsApp/Baileys Preparation

**Files:**
- Modify: `convex/schema.ts` if Task 2 was not completed
- Create/Modify: `ops/hermes/README.md`
- Test: `tests/agent-contract-surface.test.mjs`

- [ ] **Step 1: Add test for WhatsApp readiness**

Append:

```js
test("agent identity model supports WhatsApp migration", () => {
  const schema = read("convex/schema.ts");
  const runbook = read("ops/hermes/README.md");

  assert.match(schema, /v\.literal\("whatsapp"\)/);
  assert.match(runbook, /WhatsApp\/Baileys/i);
  assert.match(runbook, /QR/i);
  assert.match(runbook, /re-pair/i);
});
```

- [ ] **Step 2: Run test to verify it fails if runbook lacks WhatsApp section**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
```

Expected: FAIL until README has WhatsApp/Baileys section.

- [ ] **Step 3: Add WhatsApp section to `ops/hermes/README.md`**

```markdown
## Future WhatsApp/Baileys Migration

Hermes supports WhatsApp via Baileys-style QR pairing. Do not assume OpenClaw WhatsApp session state is portable. Plan to re-pair WhatsApp after Hermes is stable on Telegram.

Checklist:

1. Keep Telegram stable on Hermes first.
2. Add/link WhatsApp identity in Convex using `userIdentities.provider = "whatsapp"`.
3. Pair WhatsApp through Hermes using the current Hermes WhatsApp setup command.
4. Test read-only catalog search from WhatsApp.
5. Test one safe low-risk write with idempotency.
6. Require exact confirmation for high-risk admin actions.
7. Keep WhatsApp and Telegram identities mapped to the same app user where appropriate.
```

- [ ] **Step 4: Run tests**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/perpuskukaan-web
git add ops/hermes/README.md tests/agent-contract-surface.test.mjs
git commit -m "docs: prepare Hermes WhatsApp migration path"
```

---

## Risk Controls

- Do not run Hermes and OpenClaw simultaneously with the same Telegram token.
- Do not delete `~/.openclaw` until Hermes has passed a 48h stability window.
- Do not expose Hermes dashboard/gateway publicly without auth or Tailscale.
- Do not migrate WhatsApp in the same deployment as Telegram cutover.
- Do not allow LLM-only authorization; Convex must enforce permissions.
- Do not skip idempotency for chat-originated writes.

## Verification Matrix

| Area | Command / Test | Expected |
|---|---|---|
| Unit/static tests | `pnpm test` | PASS |
| Lint | `pnpm lint` | PASS |
| Build | `pnpm build` | PASS |
| Convex codegen | `npx convex codegen` | PASS |
| VM preflight | `preflight.sh` | RAM/disk safe |
| Migration preview | `hermes claw migrate --dry-run` | shows plan, no write |
| Telegram read | user searches catalog | response, no mutation |
| Telegram safe write | add smoke-test book | one book + one audit row |
| Duplicate retry | resend same message/idempotency key | no duplicate |
| OpenClaw cleanup | final remove script | no service/state remains |

## Self-Review

### Spec Coverage

- Migration OpenClaw → Hermes: Tasks 5-7.
- Remove OpenClaw and clean VM: Task 8.
- Integrate with Perpuskukaan web/Convex: Tasks 2-4.
- Use writing skill: Task 1 creates a reusable Hermes skill and tests it with static pressure checks.
- WhatsApp/Baileys future migration: Task 9.

### Placeholder Scan

No task uses TBD/TODO/fill-later placeholders. Every created file has concrete content.

### Type Consistency

- `userIdentities.provider` supports `telegram`, `whatsapp`, `web`.
- Agent operation functions use `channel` as `telegram | whatsapp` for chat channels.
- Audit status literals match the skill: `drafted`, `confirmed`, `applied`, `rejected`, `failed`.
- Idempotency key naming is consistent: `idempotencyKey`.

---

Plan complete and saved to `docs/superpowers/plans/2026-05-05-hermes-migration-perpuskukaan.md`.
