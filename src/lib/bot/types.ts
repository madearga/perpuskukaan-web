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
