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
