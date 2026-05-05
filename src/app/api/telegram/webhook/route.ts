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
