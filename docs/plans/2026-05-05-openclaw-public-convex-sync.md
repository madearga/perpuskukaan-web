# OpenClaw Public Convex Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put public Telegram chat back on OpenClaw while keeping all library administration data flowing through Convex so the Vercel web UI stays in sync.

**Architecture:** OpenClaw becomes the only public Telegram gateway again. Instead of a keyword-based bot brain, OpenClaw talks naturally and calls a narrow local HTTP action route that proxies into allowlisted Convex queries and mutations. Convex remains the only source of truth, and the web UI reads the same Convex tables for profile, dashboard, and activity state.

**Tech Stack:** OpenClaw gateway, Next.js 16 route handlers, TypeScript, Convex, Better Auth, Node shell scripts, systemd on `perpuskukaan.exe.xyz`.

---

## Why the previous direction failed

- Public path moved from `OpenClaw -> natural chat` to `Telegram poller -> intent parser -> rule fallback`.
- Z.AI `glm-5.1` was intended as primary parser, but production returned `429` / insufficient package, so traffic silently fell back to deterministic rules.
- Hermes direct gateway was unsafe for public use because raw gateway command surface leaked into user UX.
- Result: public bot became rigid, while Convex sync logic lived in a path that no longer felt like a real chatbot.

This plan restores the public conversational layer to OpenClaw and keeps Convex-backed administration in a narrow, testable adapter.

---

## Scope boundary

This plan covers:

- OpenClaw as public Telegram owner
- a local signed HTTP adapter from OpenClaw into Convex-safe actions
- public library actions: register, search books, list my books, add book draft, borrow request draft
- web UI visibility into linked Telegram status and recent agent actions
- cutover / rollback scripts

This plan does **not** cover:

- WhatsApp production pairing
- Hermes public runtime
- deleting existing Bot Layer code from the repo
- replacing Convex auth model

---

## File structure and responsibilities

### Create

- `convex/publicAgent.ts`
  - Public-safe Convex entry points for OpenClaw-facing actions.
- `src/app/api/public-agent/action/route.ts`
  - Local signed action route. Accepts structured action JSON from OpenClaw and forwards to Convex.
- `ops/openclaw/public/system-prompt.md`
  - Public-facing OpenClaw persona and rules.
- `ops/openclaw/public/examples.md`
  - Few-shot examples for Indonesian public chat behavior.
- `ops/openclaw/scripts/enable-public-gateway.sh`
  - Cutover script: disable poller, enable OpenClaw, verify service state.
- `ops/openclaw/scripts/rollback-to-bot-layer.sh`
  - Rollback script: disable OpenClaw, enable poller, verify state.
- `tests/public-agent-contract.test.mjs`
  - Static contract tests for the Convex public-agent surface.
- `tests/openclaw-public-surface.test.mjs`
  - Static tests for prompt rules, route security, and rollout scripts.

### Modify

- `convex/schema.ts`
  - Add only indexes/fields needed by new public-agent queries or drafts.
- `convex/users.ts`
  - Reuse and extend Telegram linking / registration behavior where needed.
- `convex/borrowRequests.ts`
  - Add safe draft/create helper if missing.
- `src/app/(auth)/profile/page.tsx`
  - Show Telegram/OpenClaw link status and operator-safe guidance.
- `src/app/(auth)/dashboard/client.tsx`
  - Show recent public agent actions from Convex.
- `tests/agent-contract-surface.test.mjs`
  - Extend assertions for OpenClaw-facing public-agent surface.
- `tests/auth-surface.test.mjs`
  - Extend assertions for profile linking/status UI if needed.

---

## Task 1: Build Convex public-agent contract

**Files:**
- Create: `convex/publicAgent.ts`
- Modify: `convex/users.ts`
- Modify: `convex/borrowRequests.ts`
- Test: `tests/public-agent-contract.test.mjs`
- Test: `tests/agent-contract-surface.test.mjs`

- [ ] **Step 1: Write the failing tests for the public-agent surface**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/public-agent-contract.test.mjs`
Expected: FAIL because `convex/publicAgent.ts` does not exist yet.

- [ ] **Step 3: Write minimal Convex public-agent implementation**

```ts
// convex/publicAgent.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const channelValidator = v.union(v.literal("telegram"), v.literal("whatsapp"));

async function resolveIdentity(ctx: any, channel: "telegram" | "whatsapp", providerUserId: string) {
  const identity = await ctx.db
    .query("userIdentities")
    .withIndex("by_provider_user", (q: any) =>
      q.eq("provider", channel).eq("providerUserId", providerUserId),
    )
    .first();

  if (!identity) return null;
  return await ctx.db.get(identity.userId);
}

export const registerTelegramUser = mutation({
  args: {
    providerUserId: v.string(),
    username: v.optional(v.string()),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existingIdentity = await ctx.db
      .query("userIdentities")
      .withIndex("by_provider_user", (q: any) =>
        q.eq("provider", "telegram").eq("providerUserId", args.providerUserId),
      )
      .first();

    if (existingIdentity) return { success: true, alreadyRegistered: true, userId: existingIdentity.userId };

    const userId = await ctx.db.insert("users", {
      email: undefined,
      telegramId: args.providerUserId,
      username: args.username,
      firstName: args.displayName,
      lastName: undefined,
      reputation: 100,
      totalBooksShared: 0,
      totalBorrows: 0,
      totalLends: 0,
      isVerified: false,
      isActive: true,
      role: "user",
      linkedUserIds: [],
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("userIdentities", {
      userId,
      provider: "telegram",
      providerUserId: args.providerUserId,
      username: args.username,
      displayName: args.displayName,
      verifiedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, alreadyRegistered: false, userId };
  },
});
```

- [ ] **Step 4: Extend the file with safe read/write operations**

```ts
export const searchBooks = query({
  args: {
    channel: channelValidator,
    providerUserId: v.string(),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await resolveIdentity(ctx, args.channel, args.providerUserId);
    if (!user) return { success: false, error: "NOT_LINKED" };

    const results = await ctx.db
      .query("books")
      .withSearchIndex("search_books", (q) => q.search("title", args.query).eq("status", "available"))
      .take(5);

    return { success: true, results };
  },
});

export const getMyBooks = query({
  args: {
    channel: channelValidator,
    providerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await resolveIdentity(ctx, args.channel, args.providerUserId);
    if (!user) return { success: false, error: "NOT_LINKED" };

    const books = await ctx.db
      .query("books")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    return { success: true, books };
  },
});

export const createBookDraft = mutation({
  args: {
    channel: channelValidator,
    providerUserId: v.string(),
    idempotencyKey: v.string(),
    title: v.string(),
    author: v.string(),
    category: v.string(),
    condition: v.string(),
    mode: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await resolveIdentity(ctx, args.channel, args.providerUserId);
    if (!user) return { success: false, error: "NOT_LINKED" };

    const existing = await ctx.db
      .query("agentActions")
      .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .first();

    if (existing) return { success: true, duplicate: true, actionId: existing._id };

    const actionId = await ctx.db.insert("agentActions", {
      channel: args.channel,
      providerUserId: args.providerUserId,
      appUserId: user._id,
      action: "public.createBookDraft",
      idempotencyKey: args.idempotencyKey,
      input: JSON.stringify(args),
      status: "drafted",
      resultSummary: `Draft tambah buku: ${args.title}`,
      resultJson: undefined,
      error: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, duplicate: false, actionId };
  },
});
```

- [ ] **Step 5: Add borrow-request draft support and run tests**

```ts
export const createBorrowDraft = mutation({
  args: {
    channel: channelValidator,
    providerUserId: v.string(),
    idempotencyKey: v.string(),
    bookId: v.id("books"),
    durationDays: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await resolveIdentity(ctx, args.channel, args.providerUserId);
    if (!user) return { success: false, error: "NOT_LINKED" };

    const existing = await ctx.db
      .query("agentActions")
      .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .first();

    if (existing) return { success: true, duplicate: true, actionId: existing._id };

    const actionId = await ctx.db.insert("agentActions", {
      channel: args.channel,
      providerUserId: args.providerUserId,
      appUserId: user._id,
      action: "public.createBorrowDraft",
      idempotencyKey: args.idempotencyKey,
      input: JSON.stringify(args),
      status: "drafted",
      resultSummary: `Draft pinjam buku selama ${args.durationDays} hari`,
      resultJson: undefined,
      error: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, duplicate: false, actionId };
  },
});
```

Run: `pnpm test -- tests/public-agent-contract.test.mjs tests/agent-contract-surface.test.mjs`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add convex/publicAgent.ts convex/users.ts convex/borrowRequests.ts tests/public-agent-contract.test.mjs tests/agent-contract-surface.test.mjs
git commit -m "feat: add Convex public agent contract"
```

### Task 2: Add a signed local action route for OpenClaw

**Files:**
- Create: `src/app/api/public-agent/action/route.ts`
- Test: `tests/openclaw-public-surface.test.mjs`

- [ ] **Step 1: Write failing route security tests**

```js
test("public agent route requires local shared secret and allowlisted actions", () => {
  const source = read("src/app/api/public-agent/action/route.ts");

  assert.match(source, /X-OpenClaw-Secret/i);
  assert.match(source, /search_books/);
  assert.match(source, /my_books/);
  assert.match(source, /register/);
  assert.match(source, /add_book_draft/);
  assert.match(source, /borrow_draft/);
  assert.doesNotMatch(source, /eval|exec|spawn|system\(/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/openclaw-public-surface.test.mjs`
Expected: FAIL because the route file does not exist.

- [ ] **Step 3: Create the signed action route**

```ts
// src/app/api/public-agent/action/route.ts
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const SHARED_SECRET = process.env.OPENCLAW_PUBLIC_SECRET!;

const handlers = {
  register: async (body: any) =>
    client.mutation(api.publicAgent.registerTelegramUser, {
      providerUserId: body.providerUserId,
      username: body.username,
      displayName: body.displayName,
    }),
  search_books: async (body: any) =>
    client.query(api.publicAgent.searchBooks, {
      channel: "telegram",
      providerUserId: body.providerUserId,
      query: body.query,
    }),
  my_books: async (body: any) =>
    client.query(api.publicAgent.getMyBooks, {
      channel: "telegram",
      providerUserId: body.providerUserId,
    }),
  add_book_draft: async (body: any) =>
    client.mutation(api.publicAgent.createBookDraft, {
      channel: "telegram",
      providerUserId: body.providerUserId,
      idempotencyKey: body.idempotencyKey,
      title: body.title,
      author: body.author,
      category: body.category,
      condition: body.condition,
      mode: body.mode,
    }),
  borrow_draft: async (body: any) =>
    client.mutation(api.publicAgent.createBorrowDraft, {
      channel: "telegram",
      providerUserId: body.providerUserId,
      idempotencyKey: body.idempotencyKey,
      bookId: body.bookId,
      durationDays: body.durationDays,
    }),
} as const;

export async function POST(request: Request) {
  const secret = request.headers.get("X-OpenClaw-Secret");
  if (!SHARED_SECRET || secret !== SHARED_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action as keyof typeof handlers | undefined;

  if (!action || !(action in handlers)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const result = await handlers[action](body);
  return NextResponse.json({ ok: true, action, result });
}
```

- [ ] **Step 4: Run tests and route build verification**

Run: `pnpm test -- tests/openclaw-public-surface.test.mjs`
Expected: PASS

Run: `pnpm build`
Expected: PASS with route `/api/public-agent/action` present.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/public-agent/action/route.ts tests/openclaw-public-surface.test.mjs
git commit -m "feat: add signed OpenClaw public action route"
```

### Task 3: Define OpenClaw public persona and rollout scripts

**Files:**
- Create: `ops/openclaw/public/system-prompt.md`
- Create: `ops/openclaw/public/examples.md`
- Create: `ops/openclaw/scripts/enable-public-gateway.sh`
- Create: `ops/openclaw/scripts/rollback-to-bot-layer.sh`
- Test: `tests/openclaw-public-surface.test.mjs`

- [ ] **Step 1: Write failing tests for prompt rules and scripts**

```js
test("OpenClaw public prompt forbids raw admin command leakage", () => {
  const prompt = read("ops/openclaw/public/system-prompt.md");

  assert.match(prompt, /Convex is the source of truth/);
  assert.match(prompt, /never expose raw gateway commands/i);
  assert.match(prompt, /register, search, my books, add draft, borrow draft/i);
  assert.match(prompt, /balas dalam Bahasa Indonesia/i);
});

test("OpenClaw rollout scripts switch one Telegram owner at a time", () => {
  const enable = read("ops/openclaw/scripts/enable-public-gateway.sh");
  const rollback = read("ops/openclaw/scripts/rollback-to-bot-layer.sh");

  assert.match(enable, /systemctl stop perpuskukaan-telegram-poller/);
  assert.match(enable, /systemctl enable --now openclaw/);
  assert.match(rollback, /systemctl stop openclaw/);
  assert.match(rollback, /systemctl enable --now perpuskukaan-telegram-poller/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/openclaw-public-surface.test.mjs`
Expected: FAIL because files do not exist yet.

- [ ] **Step 3: Write the OpenClaw public persona**

```md
<!-- ops/openclaw/public/system-prompt.md -->
# Perpuskukaan Public Agent

Kamu adalah chatbot publik Perpuskukaan untuk Telegram.

Aturan utama:
- Balas dalam Bahasa Indonesia yang natural, singkat, dan ramah.
- Convex adalah source of truth. Jangan mengarang status buku, user, atau transaksi.
- Jangan pernah menampilkan command internal OpenClaw/Hermes ke user.
- Untuk aksi data, gunakan hanya action berikut: `register`, `search_books`, `my_books`, `add_book_draft`, `borrow_draft`.
- Jika data belum cukup, tanya follow-up secara natural.
- Untuk aksi tulis, selalu kirim `idempotencyKey = telegram:<messageId>:<action>`.
- Jika akun belum terdaftar, arahkan user untuk kirim `daftar` atau jalankan `register` sendiri bila konteksnya jelas.
```

- [ ] **Step 4: Write examples and operator scripts**

```md
<!-- ops/openclaw/public/examples.md -->
User: eh ada ga ya buku tentang filsafat?
Agent: cari dulu ya.
Action: {"action":"search_books","providerUserId":"<telegram-id>","query":"buku tentang filsafat"}

User: buku aku apa aja ya?
Agent: cek koleksi kamu dulu ya.
Action: {"action":"my_books","providerUserId":"<telegram-id>"}
```

```bash
#!/usr/bin/env bash
# ops/openclaw/scripts/enable-public-gateway.sh
set -euo pipefail
sudo systemctl stop perpuskukaan-telegram-poller
sudo systemctl disable perpuskukaan-telegram-poller
sudo systemctl enable --now openclaw
sudo systemctl is-active openclaw
```

```bash
#!/usr/bin/env bash
# ops/openclaw/scripts/rollback-to-bot-layer.sh
set -euo pipefail
sudo systemctl stop openclaw
sudo systemctl disable openclaw
sudo systemctl enable --now perpuskukaan-telegram-poller
sudo systemctl is-active perpuskukaan-telegram-poller
```

- [ ] **Step 5: Run tests and make scripts executable**

Run:

```bash
chmod +x ops/openclaw/scripts/enable-public-gateway.sh ops/openclaw/scripts/rollback-to-bot-layer.sh
pnpm test -- tests/openclaw-public-surface.test.mjs
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add ops/openclaw/public/system-prompt.md ops/openclaw/public/examples.md ops/openclaw/scripts/enable-public-gateway.sh ops/openclaw/scripts/rollback-to-bot-layer.sh tests/openclaw-public-surface.test.mjs
git commit -m "feat: add OpenClaw public persona and rollout scripts"
```

### Task 4: Surface OpenClaw + Convex state in the web UI

**Files:**
- Modify: `src/app/(auth)/profile/page.tsx`
- Modify: `src/app/(auth)/dashboard/client.tsx`
- Create: `convex/publicAgentQueries.ts`
- Test: `tests/auth-surface.test.mjs`

- [ ] **Step 1: Write failing UI visibility tests**

```js
test("profile page explains Telegram/OpenClaw linking state", () => {
  const source = read("src/app/(auth)/profile/page.tsx");

  assert.match(source, /Telegram/);
  assert.match(source, /OpenClaw/);
  assert.match(source, /Hubungkan/);
  assert.match(source, /Terhubung/);
});

test("dashboard shows recent public agent actions", () => {
  const source = read("src/app/(auth)/dashboard/client.tsx");

  assert.match(source, /agentActions|publicAgentActions|recent public/i);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- tests/auth-surface.test.mjs`
Expected: FAIL because the new strings/queries are not present.

- [ ] **Step 3: Add Convex query for recent public actions**

```ts
// convex/publicAgentQueries.ts
import { query } from "./_generated/server";

export const getRecentPublicActions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("agentActions")
      .withIndex("by_channel_user", (q) => q.eq("channel", "telegram"))
      .order("desc")
      .take(10);
  },
});
```

- [ ] **Step 4: Add profile and dashboard UI snippets**

```tsx
// add to src/app/(auth)/profile/page.tsx
<div className="rounded-lg border p-6 space-y-3">
  <h3 className="font-semibold">Telegram Public Chat</h3>
  <p className="text-sm text-muted-foreground">
    Public Telegram dijalankan oleh OpenClaw. Data buku, status akun, dan aktivitas tetap sinkron lewat Convex.
  </p>
</div>
```

```tsx
// add to src/app/(auth)/dashboard/client.tsx
const recentPublicActions = useQuery(api.publicAgentQueries.getRecentPublicActions);

<section className="rounded-lg border p-4 space-y-2">
  <h3 className="font-semibold">Aktivitas Chat Publik Terbaru</h3>
  {(recentPublicActions ?? []).map((item) => (
    <div key={item._id} className="text-sm text-muted-foreground">
      {item.action} — {item.resultSummary ?? item.status}
    </div>
  ))}
</section>
```

- [ ] **Step 5: Run tests and build**

Run:

```bash
pnpm test -- tests/auth-surface.test.mjs
pnpm build
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add convex/publicAgentQueries.ts src/app/\(auth\)/profile/page.tsx src/app/\(auth\)/dashboard/client.tsx tests/auth-surface.test.mjs
git commit -m "feat: show public OpenClaw sync state in web UI"
```

### Task 5: Cut over safely and verify end-to-end

**Files:**
- Modify: `ops/openclaw/scripts/enable-public-gateway.sh`
- Modify: `ops/openclaw/scripts/rollback-to-bot-layer.sh`
- Test: `tests/openclaw-public-surface.test.mjs`

- [ ] **Step 1: Run full local verification before touching VM**

Run:

```bash
pnpm test
pnpm lint
pnpm build
```

Expected:

```text
All tests pass
ESLint: 0 errors
Next.js build succeeds
```

- [ ] **Step 2: Push Convex and app code**

Run:

```bash
git push origin main
npx convex deploy --yes
```

Expected:

```text
Deployed Convex functions
```

- [ ] **Step 3: Sync app code to VM and restart only web service first**

Run:

```bash
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.env.local' \
  --exclude '.env.production' \
  --exclude '.pi' \
  --exclude 'docs' \
  ./ perpuskukaan.exe.xyz:/opt/perpuskukaan-web/

ssh perpuskukaan.exe.xyz 'sudo systemctl restart perpuskukaan-web && sudo systemctl is-active perpuskukaan-web'
```

Expected: `active`

- [ ] **Step 4: Enable OpenClaw as the only public Telegram owner**

Run:

```bash
ssh perpuskukaan.exe.xyz 'bash /opt/perpuskukaan-web/ops/openclaw/scripts/enable-public-gateway.sh'
```

Expected:

```text
openclaw active
perpuskukaan-telegram-poller inactive
```

- [ ] **Step 5: Verify one read and one write-safe path from live channel and UI**

Run:

```bash
ssh perpuskukaan.exe.xyz 'sudo systemctl is-active openclaw && systemctl is-active perpuskukaan-telegram-poller || true'
```

Then manually verify in Telegram:

```text
1. "daftar"
2. "buku aku apa aja ya?"
3. "aku mau masukin buku Laskar Pelangi, kondisi bagus"
```

Then verify in web UI:

```text
- Profile shows Telegram/OpenClaw state
- Dashboard shows recent public agent action summary
```

- [ ] **Step 6: Commit final operator adjustments**

```bash
git add ops/openclaw/scripts/enable-public-gateway.sh ops/openclaw/scripts/rollback-to-bot-layer.sh
git commit -m "chore: finalize OpenClaw public cutover workflow"
```

---

## Self-review

### Spec coverage

- Public users talk to OpenClaw again: covered by Tasks 2, 3, and 5.
- Administration and library actions flow through Convex: covered by Task 1.
- Web UI stays synced to Convex state: covered by Task 4.
- Single Telegram owner and rollback: covered by Task 3 and Task 5.

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” markers remain.
- Every task names exact files and commands.
- Every code step contains concrete code.

### Type consistency

- Public route action names match Convex public-agent exports.
- `providerUserId`, `idempotencyKey`, and channel names are consistent across tasks.
- OpenClaw public route only uses allowlisted action names defined in Task 2.

---

**Plan complete and saved to `docs/plans/2026-05-05-openclaw-public-convex-sync.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
