import { botIntentSchema, type ParsedBotIntent } from "./intent-schema";

const parserSystemPrompt = `You are Perpuskukaan intent parser.
Return only JSON matching this shape:
{
  "intent": "help" | "search_books" | "add_book" | "borrow_book" | "my_books" | "bot_register" | "fallback_chat",
  "confidence": number between 0 and 1,
  "fields": object,
  "missingFields": string[],
  "reply": optional Indonesian text
}

Rules:
- Use bot_register when user wants to register/sign up via Telegram.
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

function extractTitleAfterKeyword(text: string, keywords: string[]): string | undefined {
  const pattern = new RegExp(`(?:${keywords.join("|")})\\s+(?:buku\\s+)?(.+)`, "i");
  const match = text.match(pattern);
  const title = match?.[1]
    ?.replace(/\b(penulis|karya|kondisi|kategori|selama|untuk)\b.*$/i, "")
    .replace(/[.,;:]+$/g, "")
    .trim();
  return title || undefined;
}

function fallbackIntent(text: string): ParsedBotIntent {
  const normalized = text.toLowerCase();
  if (normalized === "/start" || normalized.includes("daftar") || normalized.includes("register")) {
    return { intent: "bot_register", confidence: 0.85, fields: {}, missingFields: [] };
  }
  if (normalized.includes("bantuan") || normalized === "/help" || normalized.includes("mulai darimana")) {
    return { intent: "help", confidence: 0.8, fields: {}, missingFields: [] };
  }
  if (
    normalized.includes("buku saya") ||
    normalized.includes("koleksi saya") ||
    normalized.includes("buku yang saya punya") ||
    normalized.includes("buku aku") ||
    normalized.includes("koleksi buku")
  ) {
    return { intent: "my_books", confidence: 0.75, fields: {}, missingFields: [] };
  }
  if (/(tambah|tambahkan|nambah|daftarkan|share|punya buku)/i.test(normalized)) {
    const title = extractTitleAfterKeyword(text, ["tambah", "tambahkan", "nambah", "daftarkan", "punya"]);
    const fields: ParsedBotIntent["fields"] = {};
    if (title) fields.title = title;
    const missingFields = ["title", "author", "category", "condition", "mode"].filter(
      (field) => fields[field] === undefined,
    );
    return { intent: "add_book", confidence: 0.72, fields, missingFields };
  }
  if (/(pinjam|meminjam|mau pinjam|request buku)/i.test(normalized)) {
    const title = extractTitleAfterKeyword(text, ["pinjam", "meminjam", "mau pinjam", "request"]);
    const durationMatch = normalized.match(/(\d+)\s*(hari|day|days)/);
    const fields: ParsedBotIntent["fields"] = {};
    if (title) fields.title = title;
    if (durationMatch) fields.durationDays = Number(durationMatch[1]);
    const missingFields = ["title", "durationDays"].filter((field) => fields[field] === undefined);
    return { intent: "borrow_book", confidence: 0.72, fields, missingFields };
  }
  if (
    normalized.includes("cari") ||
    normalized.includes("search") ||
    normalized.includes("carikan") ||
    normalized.includes("ada ga") ||
    normalized.includes("ada nggak") ||
    normalized.includes("ada gak") ||
    /buku tentang|buku soal|rekomendasi buku/i.test(normalized)
  ) {
    return {
      intent: "search_books",
      confidence: 0.7,
      fields: {
        query: text
          .replace(/^(tolong\s+)?(cari|carikan|search)\s+(buku\s+)?/i, "")
          .replace(/^(eh\s+)?ada\s+(ga|gak|nggak)\s+(ya\s+)?(buku\s+)?/i, "")
          .replace(/di\s+perpuskukaan\??$/i, "")
          .trim(),
      },
      missingFields: [],
    };
  }
  return { intent: "fallback_chat", confidence: 0.5, fields: {}, missingFields: [], reply: undefined };
}

async function callLLM(
  provider: "zai" | "nvidia",
  apiKey: string,
  text: string,
): Promise<ParsedBotIntent | null> {
  const endpoints: Record<string, string> = {
    zai: "https://api.z.ai/api/paas/v4/chat/completions",
    nvidia: "https://integrate.api.nvidia.com/v1/chat/completions",
  };
  const models: Record<string, string> = {
    zai: process.env.BOT_INTENT_MODEL || "glm-5.1",
    nvidia: "nvidia/nemotron-3-super-120b-a12b",
  };

  const response = await fetch(endpoints[provider], {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: models[provider],
      messages: [
        { role: "system", content: parserSystemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.1,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    console.warn(`[bot-intent] provider=${provider} status=${response.status} model=${models[provider]}`);
    return null;
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content as string | undefined;
  if (typeof content !== "string") {
    console.warn(`[bot-intent] provider=${provider} parse=no_content`);
    return null;
  }

  try {
    const parsed = botIntentSchema.parse(parseJsonFromText(content));
    console.info(`[bot-intent] provider=${provider} intent=${parsed.intent}`);
    return parsed;
  } catch {
    console.warn(`[bot-intent] provider=${provider} parse=invalid_json`);
    return null;
  }
}

function parseJsonFromText(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
    if (fenced) return JSON.parse(fenced);
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("No JSON object found");
  }
}

export async function parseBotIntent(text: string): Promise<ParsedBotIntent> {
  // Try ZAI first
  const zaiKey = process.env.ZAI_API_KEY || process.env.GLM_API_KEY;
  if (zaiKey) {
    const result = await callLLM("zai", zaiKey, text);
    if (result) return result;
  }

  // Try NVIDIA as fallback
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  if (nvidiaKey) {
    const result = await callLLM("nvidia", nvidiaKey, text);
    if (result) return result;
  }

  // Local rule-based degraded fallback
  const fallback = fallbackIntent(text);
  console.warn(`[bot-intent] provider=local-degraded intent=${fallback.intent}`);
  return fallback;
}
