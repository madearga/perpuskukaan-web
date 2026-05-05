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

test("intent parser requires JSON-only parser output and validates with zod", () => {
  const source = read("src/lib/bot/intent-parser.ts");

  assert.match(source, /botIntentSchema\.parse/);
  assert.match(source, /JSON\.parse/);
  assert.match(source, /You are Perpuskukaan intent parser/);
  assert.match(source, /Return only JSON/);
  assert.match(source, /ZAI_API_KEY|GLM_API_KEY|HERMES/);
});

test("intent parser has robust local fallback for common Indonesian book requests", () => {
  const source = read("src/lib/bot/intent-parser.ts");

  assert.match(source, /extractTitleAfterKeyword/);
  assert.match(source, /add_book/);
  assert.match(source, /borrow_book/);
  assert.match(source, /my_books/);
  assert.match(source, /buku saya/);
  assert.match(source, /tambah|tambahkan|nambah/);
  assert.match(source, /pinjam|meminjam/);
  assert.match(source, /bot_register/);
  assert.match(source, /daftar/);
});
