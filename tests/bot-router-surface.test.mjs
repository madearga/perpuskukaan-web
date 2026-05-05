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

test("telegram webhook adapter normalizes messages and avoids Hermes slash commands", () => {
  const source = read("src/app/api/telegram/webhook/route.ts");

  assert.match(source, /handleBotMessage/);
  assert.match(source, /telegram/);
  assert.match(source, /message_id/);
  assert.match(source, /from/);
  assert.match(source, /sendMessage/);
  assert.doesNotMatch(source, /hermes gateway/);
});

test("whatsapp adapter scaffold uses Baileys and normalized bot endpoint", () => {
  const pkg = read("bot-service/package.json");
  const source = read("bot-service/whatsapp.ts");

  assert.match(pkg, /@whiskeysockets\/baileys/);
  assert.match(source, /makeWASocket/);
  assert.match(source, /\/api\/bot\/message/);
  assert.match(source, /channel:\s*"whatsapp"/);
  assert.match(source, /sendMessage/);
});

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
