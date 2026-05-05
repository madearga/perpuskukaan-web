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
