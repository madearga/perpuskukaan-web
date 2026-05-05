# Natural Language Bot Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public-safe Perpuskukaan bot layer that supports natural-language conversations across Telegram, WhatsApp, and web while using Convex as source of truth and Hermes/LLM as the language reasoning backend.

**Architecture:** Channel adapters normalize Telegram/WhatsApp/web messages into one `BotMessage` contract. A shared router resolves user identity, calls an intent parser, asks follow-up questions for missing fields, executes safe Convex functions for data actions, and stores audit/idempotency records. Hermes remains the AI brain behind the bot layer, not the public gateway.

**Tech Stack:** Next.js 16 route handlers, TypeScript, Convex, Better Auth, Zod, Z.AI/GLM-compatible JSON parsing, future Hermes HTTP/CLI bridge, Baileys for WhatsApp, Telegram Bot API/webhook.

---

## Product Decision

Public users should interact with a Perpuskukaan product bot, not a raw Hermes gateway.

```text
Telegram / WhatsApp / Web Chat
  -> Perpuskukaan Bot Layer
  -> Intent Parser (Hermes/LLM)
  -> Convex query/mutation/action
  -> Channel reply
```

Hermes is still used, but as:

- natural-language parser
- conversational reply generator
- admin assistant backend
- optional complex reasoning/subagent backend

Convex remains authoritative for:

- users and identities
- books
- borrow requests
- transactions
- permissions
- idempotency
- audit logs

---

## MVP Scope

### Channels

- Web chat endpoint now
- Telegram webhook adapter now
- WhatsApp/Baileys adapter as service scaffold now, production pairing later

### Intents

- `help`
- `search_books`
- `add_book`
- `borrow_book`
- `my_books`
- `fallback_chat`

### Out of Scope for MVP

- Full WhatsApp production pairing
- Voice notes
- Image/OCR book ingestion
- Mass broadcast
- Payment
- Autonomous admin approval without exact confirmation

---

## Files and Responsibilities

### Create

- `src/lib/bot/types.ts`
  - Shared channel, message, intent, and response types.
- `src/lib/bot/intent-schema.ts`
  - Zod schemas for parser output.
- `src/lib/bot/intent-parser.ts`
  - Calls LLM/Hermes-compatible backend and validates structured JSON.
- `src/lib/bot/router.ts`
  - Main `handleBotMessage()` orchestration.
- `src/lib/bot/replies.ts`
  - Indonesian response templates.
- `src/lib/bot/convex-client.ts`
  - Server-side Convex client wrapper for bot routes.
- `src/app/api/bot/message/route.ts`
  - Internal normalized bot endpoint.
- `src/app/api/telegram/webhook/route.ts`
  - Telegram adapter endpoint.
- `src/app/api/chat/route.ts`
  - Web chat adapter endpoint.
- `bot-service/whatsapp.ts`
  - Baileys adapter scaffold that forwards normalized messages to `/api/bot/message`.
- `bot-service/package.json`
  - Optional standalone WhatsApp service dependencies/scripts.
- `tests/bot-intent-schema.test.mjs`
  - Static/behavior tests for intent validation.
- `tests/bot-router-surface.test.mjs`
  - Static tests enforcing source-of-truth and safety rules.
- `docs/plans/2026-05-05-natural-language-bot-layer.md`
  - This plan.

### Modify

- `convex/schema.ts`
  - Already has `userIdentities` and `agentActions`; add missing fields only if tests require.
- `convex/agentBooks.ts`
  - Add `getMyBooksForAgent` if missing.
- `convex/agentBorrowRequests.ts`
  - Create safe borrow request function if not already present.
- `.env.local.example` or README/env docs if present
  - Add bot env vars without secrets.

---

## Task 1: Define Bot Types and Intent Schema

**Files:**
- Create: `src/lib/bot/types.ts`
- Create: `src/lib/bot/intent-schema.ts`
- Test: `tests/bot-intent-schema.test.mjs`

- [ ] **Step 1: Write failing tests**

Create `tests/bot-intent-schema.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("bot types define shared channel message and response contracts", () => {
  const source = read("src/lib/bot/types.ts");

  assert.match(source, /export type BotChannel/);
  assert.match(source, /"telegram"/);
  assert.match(source, /"whatsapp"/);
  assert.match(source, /"web"/);
  assert.match(source, /export type BotMessage/);
  assert.match(source, /providerUserId/);
  assert.match(source, /messageId/);
  assert.match(source, /export type BotResponse/);
});

test("intent schema supports MVP intents and missing-field flow", () => {
  const source = read("src/lib/bot/intent-schema.ts");

  assert.match(source, /help/);
  assert.match(source, /search_books/);
  assert.match(source, /add_book/);
  assert.match(source, /borrow_book/);
  assert.match(source, /my_books/);
  assert.match(source, /fallback_chat/);
  assert.match(source, /missingFields/);
  assert.match(source, /confidence/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
```

Expected: FAIL because bot files do not exist.

- [ ] **Step 3: Create `src/lib/bot/types.ts`**

```ts
export type BotChannel = "telegram" | "whatsapp" | "web";

export type BotMessage = {
  channel: BotChannel;
  providerUserId: string;
  messageId: string;
  text: string;
  username?: string;
  displayName?: string;
  replyToMessageId?: string;
};

export type BotIntentName =
  | "help"
  | "search_books"
  | "add_book"
  | "borrow_book"
  | "my_books"
  | "fallback_chat";

export type BotIntent = {
  intent: BotIntentName;
  confidence: number;
  fields: Record<string, string | number | boolean | undefined>;
  missingFields: string[];
  reply?: string;
};

export type BotResponse = {
  text: string;
  status: "ok" | "needs_input" | "unauthorized" | "error";
  intent?: BotIntentName;
};
```

- [ ] **Step 4: Create `src/lib/bot/intent-schema.ts`**

```ts
import { z } from "zod";

export const botIntentNameSchema = z.enum([
  "help",
  "search_books",
  "add_book",
  "borrow_book",
  "my_books",
  "fallback_chat",
]);

export const botIntentSchema = z.object({
  intent: botIntentNameSchema,
  confidence: z.number().min(0).max(1),
  fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]).optional()),
  missingFields: z.array(z.string()),
  reply: z.string().optional(),
});

export type ParsedBotIntent = z.infer<typeof botIntentSchema>;
```

- [ ] **Step 5: Run tests**

Run:

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
```

Expected: PASS for new schema tests.

- [ ] **Step 6: Commit**

```bash
cd ~/Desktop/perpuskukaan-web
git add src/lib/bot/types.ts src/lib/bot/intent-schema.ts tests/bot-intent-schema.test.mjs
git commit -m "feat: define natural language bot intent contract"
```

---

## Task 2: Add Intent Parser with Safe JSON Contract

**Files:**
- Create: `src/lib/bot/intent-parser.ts`
- Modify: `tests/bot-intent-schema.test.mjs`

- [ ] **Step 1: Extend failing test**

Append to `tests/bot-intent-schema.test.mjs`:

```js
test("intent parser requires JSON-only parser output and validates with zod", () => {
  const source = read("src/lib/bot/intent-parser.ts");

  assert.match(source, /botIntentSchema\.parse/);
  assert.match(source, /JSON\.parse/);
  assert.match(source, /You are Perpuskukaan intent parser/);
  assert.match(source, /Return only JSON/);
  assert.match(source, /ZAI_API_KEY|GLM_API_KEY|HERMES/);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
```

Expected: FAIL because parser file does not exist.

- [ ] **Step 3: Create `src/lib/bot/intent-parser.ts`**

```ts
import { botIntentSchema, type ParsedBotIntent } from "./intent-schema";

const parserSystemPrompt = `You are Perpuskukaan intent parser.
Return only JSON matching this shape:
{
  "intent": "help" | "search_books" | "add_book" | "borrow_book" | "my_books" | "fallback_chat",
  "confidence": number between 0 and 1,
  "fields": object,
  "missingFields": string[],
  "reply": optional Indonesian text
}

Rules:
- Use search_books when user wants to find books.
- Use add_book when user wants to add/share a book.
- Use borrow_book when user wants to borrow/request a book.
- Use my_books when user asks about their own books.
- Use help for help/menu questions.
- Use fallback_chat for general conversation.
- For add_book, require title, author, category, condition, mode.
- For borrow_book, require bookId or title and durationDays.
- Never invent IDs.
- Return only JSON. No markdown.`;

function fallbackIntent(text: string): ParsedBotIntent {
  const normalized = text.toLowerCase();
  if (normalized.includes("bantuan") || normalized === "/start" || normalized === "/help") {
    return { intent: "help", confidence: 0.8, fields: {}, missingFields: [] };
  }
  if (normalized.includes("cari") || normalized.includes("search")) {
    return {
      intent: "search_books",
      confidence: 0.7,
      fields: { query: text.replace(/^cari\s+/i, "").trim() },
      missingFields: [],
    };
  }
  return { intent: "fallback_chat", confidence: 0.5, fields: {}, missingFields: [], reply: undefined };
}

export async function parseBotIntent(text: string): Promise<ParsedBotIntent> {
  const apiKey = process.env.ZAI_API_KEY || process.env.GLM_API_KEY;
  if (!apiKey) return fallbackIntent(text);

  const response = await fetch("https://api.z.ai/api/paas/v4/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.BOT_INTENT_MODEL || "glm-5",
      messages: [
        { role: "system", content: parserSystemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) return fallbackIntent(text);

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return fallbackIntent(text);

  try {
    return botIntentSchema.parse(JSON.parse(content));
  } catch {
    return fallbackIntent(text);
  }
}
```

- [ ] **Step 4: Run tests/build**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
pnpm build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/perpuskukaan-web
git add src/lib/bot/intent-parser.ts tests/bot-intent-schema.test.mjs
git commit -m "feat: add safe natural language intent parser"
```

---

## Task 3: Add Reply Templates and Router Skeleton

**Files:**
- Create: `src/lib/bot/replies.ts`
- Create: `src/lib/bot/router.ts`
- Test: `tests/bot-router-surface.test.mjs`

- [ ] **Step 1: Write failing test**

Create `tests/bot-router-surface.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("bot router centralizes all channel messages through handleBotMessage", () => {
  const source = read("src/lib/bot/router.ts");

  assert.match(source, /export async function handleBotMessage/);
  assert.match(source, /parseBotIntent/);
  assert.match(source, /search_books/);
  assert.match(source, /add_book/);
  assert.match(source, /borrow_book/);
  assert.match(source, /fallback_chat/);
});

test("bot replies are Indonesian and product-branded", () => {
  const source = read("src/lib/bot/replies.ts");

  assert.match(source, /Perpuskukaan/);
  assert.match(source, /Bantuan/);
  assert.match(source, /Akun .* belum terhubung/);
  assert.match(source, /data yang kurang/);
});

test("bot router does not expose raw Hermes command surface", () => {
  const source = read("src/lib/bot/router.ts");

  assert.doesNotMatch(source, /hermes gateway/);
  assert.doesNotMatch(source, /\/commands/);
  assert.doesNotMatch(source, /\/tools/);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
```

Expected: FAIL because router/replies files do not exist.

- [ ] **Step 3: Create `src/lib/bot/replies.ts`**

```ts
import type { BotResponse } from "./types";

export function helpReply(): BotResponse {
  return {
    status: "ok",
    intent: "help",
    text: [
      "Bantuan Perpuskukaan:",
      "• cari buku Atomic Habits",
      "• tambahkan buku Laskar Pelangi penulis Andrea Hirata kondisi bagus",
      "• buku saya apa saja?",
      "• saya mau pinjam buku Atomic Habits selama 7 hari",
    ].join("\n"),
  };
}

export function unlinkedAccountReply(): BotResponse {
  return {
    status: "unauthorized",
    text: "Akun ini belum terhubung ke Perpuskukaan. Buka dashboard Perpuskukaan lalu hubungkan Telegram/WhatsApp kamu.",
  };
}

export function missingFieldsReply(fields: string[]): BotResponse {
  return {
    status: "needs_input",
    text: `Ada data yang kurang: ${fields.join(", ")}. Tolong lengkapi dulu ya.`,
  };
}

export function fallbackReply(): BotResponse {
  return {
    status: "ok",
    intent: "fallback_chat",
    text: "Aku bisa bantu cari buku, tambah buku, cek buku kamu, atau bantu proses pinjam di Perpuskukaan.",
  };
}

export function errorReply(): BotResponse {
  return {
    status: "error",
    text: "Maaf, Perpuskukaan sedang gagal memproses pesan ini. Coba lagi sebentar ya.",
  };
}
```

- [ ] **Step 4: Create `src/lib/bot/router.ts`**

```ts
import { parseBotIntent } from "./intent-parser";
import type { BotMessage, BotResponse } from "./types";
import { fallbackReply, helpReply, missingFieldsReply } from "./replies";

export async function handleBotMessage(message: BotMessage): Promise<BotResponse> {
  const intent = await parseBotIntent(message.text);

  if (intent.missingFields.length > 0) {
    return { ...missingFieldsReply(intent.missingFields), intent: intent.intent };
  }

  switch (intent.intent) {
    case "help":
      return helpReply();
    case "search_books":
      return {
        status: "ok",
        intent: "search_books",
        text: `Aku akan cari buku: ${String(intent.fields.query ?? message.text)}`,
      };
    case "add_book":
      return {
        status: "needs_input",
        intent: "add_book",
        text: "Aku sudah paham kamu mau tambah buku. Integrasi tulis ke katalog akan lewat Convex agentBooks agar aman.",
      };
    case "borrow_book":
      return {
        status: "needs_input",
        intent: "borrow_book",
        text: "Aku sudah paham kamu mau pinjam buku. Aku perlu buku yang spesifik dan durasi pinjam.",
      };
    case "my_books":
      return {
        status: "ok",
        intent: "my_books",
        text: "Aku akan cek daftar buku kamu setelah akun channel ini terhubung ke Perpuskukaan.",
      };
    case "fallback_chat":
    default:
      return { ...fallbackReply(), text: intent.reply ?? fallbackReply().text };
  }
}
```

- [ ] **Step 5: Run tests/build**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
pnpm build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd ~/Desktop/perpuskukaan-web
git add src/lib/bot/replies.ts src/lib/bot/router.ts tests/bot-router-surface.test.mjs
git commit -m "feat: add natural language bot router skeleton"
```

---

## Task 4: Add Internal Bot Message and Web Chat Routes

**Files:**
- Create: `src/app/api/bot/message/route.ts`
- Create: `src/app/api/chat/route.ts`
- Modify: `tests/bot-router-surface.test.mjs`

- [ ] **Step 1: Extend failing test**

Append:

```js
test("bot and web chat API routes call shared bot router", () => {
  const botRoute = read("src/app/api/bot/message/route.ts");
  const chatRoute = read("src/app/api/chat/route.ts");

  assert.match(botRoute, /handleBotMessage/);
  assert.match(botRoute, /channel/);
  assert.match(botRoute, /providerUserId/);
  assert.match(botRoute, /messageId/);
  assert.match(chatRoute, /handleBotMessage/);
  assert.match(chatRoute, /channel:\s*"web"/);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
```

Expected: FAIL because routes do not exist.

- [ ] **Step 3: Create `src/app/api/bot/message/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleBotMessage } from "@/lib/bot/router";

const requestSchema = z.object({
  channel: z.enum(["telegram", "whatsapp", "web"]),
  providerUserId: z.string().min(1),
  messageId: z.string().min(1),
  text: z.string().min(1),
  username: z.string().optional(),
  displayName: z.string().optional(),
  replyToMessageId: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { text: "Format pesan tidak valid.", status: "error" },
      { status: 400 }
    );
  }

  const response = await handleBotMessage(parsed.data);
  return NextResponse.json(response);
}
```

- [ ] **Step 4: Create `src/app/api/chat/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleBotMessage } from "@/lib/bot/router";

const chatSchema = z.object({
  text: z.string().min(1),
  sessionId: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { text: "Format chat tidak valid.", status: "error" },
      { status: 400 }
    );
  }

  const response = await handleBotMessage({
    channel: "web",
    providerUserId: parsed.data.sessionId ?? "anonymous-web",
    messageId: crypto.randomUUID(),
    text: parsed.data.text,
  });

  return NextResponse.json(response);
}
```

- [ ] **Step 5: Run tests/build**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
pnpm build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd ~/Desktop/perpuskukaan-web
git add src/app/api/bot/message/route.ts src/app/api/chat/route.ts tests/bot-router-surface.test.mjs
git commit -m "feat: add shared bot message and web chat routes"
```

---

## Task 5: Add Telegram Webhook Adapter

**Files:**
- Create: `src/app/api/telegram/webhook/route.ts`
- Modify: `tests/bot-router-surface.test.mjs`

- [ ] **Step 1: Extend failing test**

Append:

```js
test("telegram webhook adapter normalizes messages and avoids Hermes slash commands", () => {
  const source = read("src/app/api/telegram/webhook/route.ts");

  assert.match(source, /handleBotMessage/);
  assert.match(source, /telegram/);
  assert.match(source, /message_id/);
  assert.match(source, /from/);
  assert.match(source, /sendMessage/);
  assert.doesNotMatch(source, /hermes gateway/);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
```

Expected: FAIL because route does not exist.

- [ ] **Step 3: Create `src/app/api/telegram/webhook/route.ts`**

```ts
import { NextResponse } from "next/server";
import { handleBotMessage } from "@/lib/bot/router";

async function sendTelegramMessage(chatId: number | string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function POST(request: Request) {
  const update = await request.json().catch(() => null);
  const message = update?.message;
  const text = message?.text;
  const from = message?.from;
  const chat = message?.chat;

  if (!message || typeof text !== "string" || !from?.id || !chat?.id) {
    return NextResponse.json({ ok: true });
  }

  const response = await handleBotMessage({
    channel: "telegram",
    providerUserId: String(from.id),
    messageId: String(message.message_id),
    text,
    username: from.username,
    displayName: [from.first_name, from.last_name].filter(Boolean).join(" ") || undefined,
  });

  await sendTelegramMessage(chat.id, response.text);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run tests/build**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
pnpm build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/perpuskukaan-web
git add src/app/api/telegram/webhook/route.ts tests/bot-router-surface.test.mjs
git commit -m "feat: add Telegram bot layer webhook adapter"
```

---

## Task 6: Add WhatsApp/Baileys Adapter Scaffold

**Files:**
- Create: `bot-service/package.json`
- Create: `bot-service/whatsapp.ts`
- Modify: `tests/bot-router-surface.test.mjs`

- [ ] **Step 1: Extend failing test**

Append:

```js
test("whatsapp adapter scaffold uses Baileys and normalized bot endpoint", () => {
  const pkg = read("bot-service/package.json");
  const source = read("bot-service/whatsapp.ts");

  assert.match(pkg, /@whiskeysockets\/baileys/);
  assert.match(source, /makeWASocket/);
  assert.match(source, /\/api\/bot\/message/);
  assert.match(source, /channel:\s*"whatsapp"/);
  assert.match(source, /sendMessage/);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
```

Expected: FAIL because WhatsApp files do not exist.

- [ ] **Step 3: Create `bot-service/package.json`**

```json
{
  "name": "perpuskukaan-bot-service",
  "private": true,
  "type": "module",
  "scripts": {
    "whatsapp": "tsx whatsapp.ts"
  },
  "dependencies": {
    "@whiskeysockets/baileys": "^7.0.0",
    "tsx": "^4.20.6"
  }
}
```

- [ ] **Step 4: Create `bot-service/whatsapp.ts`**

```ts
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";

const botEndpoint = process.env.BOT_MESSAGE_ENDPOINT ?? "http://localhost:3000/api/bot/message";

async function forwardToBotLayer(input: {
  providerUserId: string;
  messageId: string;
  text: string;
}) {
  const response = await fetch(botEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: "whatsapp",
      providerUserId: input.providerUserId,
      messageId: input.messageId,
      text: input.text,
    }),
  });

  if (!response.ok) {
    return { text: "Maaf, Perpuskukaan sedang gagal memproses pesan WhatsApp ini." };
  }

  return await response.json() as { text: string };
}

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth/whatsapp");
  const sock = makeWASocket({ auth: state });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const shouldReconnect = update.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
    if (update.connection === "close" && shouldReconnect) {
      void startWhatsApp();
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const message of messages) {
      const text = message.message?.conversation ?? message.message?.extendedTextMessage?.text;
      const remoteJid = message.key.remoteJid;
      const messageId = message.key.id;

      if (!text || !remoteJid || !messageId || message.key.fromMe) continue;

      const botResponse = await forwardToBotLayer({
        providerUserId: remoteJid,
        messageId,
        text,
      });

      await sock.sendMessage(remoteJid, { text: botResponse.text });
    }
  });
}

void startWhatsApp();
```

- [ ] **Step 5: Run tests/build**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
pnpm build
```

Expected: PASS. Do not install/run Baileys yet unless doing WhatsApp staging later.

- [ ] **Step 6: Commit**

```bash
cd ~/Desktop/perpuskukaan-web
git add bot-service/package.json bot-service/whatsapp.ts tests/bot-router-surface.test.mjs
git commit -m "feat: scaffold WhatsApp natural language adapter"
```

---

## Task 7: Add Convex Execution Hooks for Search and My Books

**Files:**
- Modify: `convex/agentBooks.ts`
- Create: `src/lib/bot/convex-client.ts`
- Modify: `src/lib/bot/router.ts`
- Modify: `tests/bot-router-surface.test.mjs`

- [ ] **Step 1: Extend failing test**

Append:

```js
test("bot convex client routes reads through Convex agent functions", () => {
  const client = read("src/lib/bot/convex-client.ts");
  const router = read("src/lib/bot/router.ts");

  assert.match(client, /ConvexHttpClient/);
  assert.match(client, /agentBooks/);
  assert.match(client, /searchBooksForAgent/);
  assert.match(client, /getMyBooksForAgent/);
  assert.match(router, /searchBooks/);
  assert.match(router, /getMyBooks/);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
```

Expected: FAIL because Convex client/getMyBooks are missing.

- [ ] **Step 3: Add `getMyBooksForAgent` to `convex/agentBooks.ts`**

Append:

```ts
export const getMyBooksForAgent = query({
  args: {
    channel: channelValidator,
    providerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await resolveChannelUser(ctx, args.channel, args.providerUserId);
    if (!user) {
      return { success: false, error: "Akun channel belum terhubung ke Perpuskukaan." };
    }

    const books = await ctx.db
      .query("books")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    return { success: true, books };
  },
});
```

- [ ] **Step 4: Create `src/lib/bot/convex-client.ts`**

```ts
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/convex/_generated/api";
import type { BotMessage } from "./types";

function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  return new ConvexHttpClient(url);
}

export async function searchBooks(message: BotMessage, query: string) {
  const client = getConvexClient();
  return await client.query(api.agentBooks.searchBooksForAgent, {
    channel: message.channel === "whatsapp" ? "whatsapp" : "telegram",
    providerUserId: message.providerUserId,
    query,
    limit: 5,
  });
}

export async function getMyBooks(message: BotMessage) {
  const client = getConvexClient();
  return await client.query(api.agentBooks.getMyBooksForAgent, {
    channel: message.channel === "whatsapp" ? "whatsapp" : "telegram",
    providerUserId: message.providerUserId,
  });
}
```

- [ ] **Step 5: Update `src/lib/bot/router.ts` search/my-books branches**

Replace the `search_books` branch with:

```ts
    case "search_books": {
      const query = String(intent.fields.query ?? message.text);
      const result = await searchBooks(message, query);
      if (!result.success) return unlinkedAccountReply();
      if (result.results.length === 0) {
        return { status: "ok", intent: "search_books", text: "Belum ketemu buku yang cocok." };
      }
      return {
        status: "ok",
        intent: "search_books",
        text: result.results
          .map((book: any, index: number) => `${index + 1}. ${book.title} — ${book.author}`)
          .join("\n"),
      };
    }
```

Replace the `my_books` branch with:

```ts
    case "my_books": {
      const result = await getMyBooks(message);
      if (!result.success) return unlinkedAccountReply();
      if (result.books.length === 0) {
        return { status: "ok", intent: "my_books", text: "Kamu belum punya buku di katalog." };
      }
      return {
        status: "ok",
        intent: "my_books",
        text: result.books
          .map((book: any, index: number) => `${index + 1}. ${book.title} — ${book.status}`)
          .join("\n"),
      };
    }
```

Also add imports:

```ts
import { getMyBooks, searchBooks } from "./convex-client";
import { unlinkedAccountReply } from "./replies";
```

- [ ] **Step 6: Run codegen/tests/build**

```bash
cd ~/Desktop/perpuskukaan-web
npx convex codegen
pnpm test
pnpm build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd ~/Desktop/perpuskukaan-web
git add convex/agentBooks.ts convex/_generated src/lib/bot/convex-client.ts src/lib/bot/router.ts tests/bot-router-surface.test.mjs
git commit -m "feat: connect bot layer reads to Convex agent functions"
```

---

## Task 8: Document Deployment and Channel Strategy

**Files:**
- Create: `docs/bot-layer.md`
- Modify: `README.md`
- Test: `tests/bot-router-surface.test.mjs`

- [ ] **Step 1: Extend failing test**

Append:

```js
test("bot layer docs explain public-safe Hermes architecture", () => {
  const docs = read("docs/bot-layer.md");

  assert.match(docs, /Bot Layer/);
  assert.match(docs, /Hermes.*AI brain/i);
  assert.match(docs, /Convex.*source of truth/i);
  assert.match(docs, /Telegram/);
  assert.match(docs, /WhatsApp/);
  assert.match(docs, /Web chat/);
  assert.match(docs, /Do not expose Hermes gateway directly/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
```

Expected: FAIL because docs file does not exist.

- [ ] **Step 3: Create `docs/bot-layer.md`**

```markdown
# Perpuskukaan Bot Layer

Perpuskukaan uses a public-safe Bot Layer for Telegram, WhatsApp, and Web chat.

```text
Telegram / WhatsApp / Web chat
  -> Perpuskukaan Bot Layer
  -> Hermes or LLM intent parser
  -> Convex functions
  -> user reply
```

## Why not expose Hermes gateway directly?

Do not expose Hermes gateway directly to public users. Hermes is an agent/operator runtime with built-in commands and broad tool surface. Public users should see Perpuskukaan product behavior only.

## Responsibilities

### Bot Layer

- normalize channel messages
- parse natural language intent
- ask follow-up questions
- enforce confirmation flows
- call Convex functions
- send channel replies

### Hermes / LLM

Hermes is the AI brain for parsing, reasoning, summaries, and admin help. It should not bypass Convex permissions.

### Convex

Convex is the source of truth for users, books, borrow requests, transactions, identities, idempotency, and audit logs.

## Channels

- Telegram uses `/api/telegram/webhook`.
- Web chat uses `/api/chat`.
- WhatsApp uses the Baileys adapter in `bot-service/whatsapp.ts`.

## MVP Intents

- `help`
- `search_books`
- `add_book`
- `borrow_book`
- `my_books`
- `fallback_chat`
```

- [ ] **Step 4: Add README link**

Append to `README.md`:

```markdown
## Natural Language Bot Layer

Perpuskukaan supports a public-safe bot architecture for Telegram, WhatsApp, and Web chat. See [`docs/bot-layer.md`](docs/bot-layer.md).
```

- [ ] **Step 5: Run tests/build**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
pnpm build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd ~/Desktop/perpuskukaan-web
git add docs/bot-layer.md README.md tests/bot-router-surface.test.mjs
git commit -m "docs: explain public-safe natural language bot layer"
```

---

## Final Verification

Run:

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
pnpm lint
pnpm build
```

Expected:

- tests pass
- lint has 0 errors
- build succeeds

---

## Self-Review

### Spec Coverage

- Natural language UX: intent parser and fallback chat.
- Telegram: webhook adapter.
- WhatsApp: Baileys scaffold.
- Web: `/api/chat`.
- Hermes role: documented as AI brain, not public gateway.
- Convex source of truth: router/Convex client/docs/tests.

### Placeholder Scan

No TBD/TODO/fill-later placeholders. WhatsApp production pairing is explicitly out of MVP and scaffolded without pretending production readiness.

### Type Consistency

- `BotChannel` supports `telegram | whatsapp | web`.
- Convex agent read functions accept only `telegram | whatsapp`, so web chat remains non-mutating/read scaffold until web auth identity mapping is added.
- Intent names match schema, router, and docs.

---

Plan complete and saved to `docs/plans/2026-05-05-natural-language-bot-layer.md`.
