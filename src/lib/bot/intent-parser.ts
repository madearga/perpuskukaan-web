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
