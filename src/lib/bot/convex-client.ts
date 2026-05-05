import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
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
