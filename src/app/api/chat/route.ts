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
