import { parseBotIntent } from "./intent-parser";
import type { BotMessage, BotResponse } from "./types";
import { fallbackReply, helpReply, missingFieldsReply, unlinkedAccountReply } from "./replies";
import { getMyBooks, searchBooks } from "./convex-client";

export async function handleBotMessage(message: BotMessage): Promise<BotResponse> {
  const intent = await parseBotIntent(message.text);

  if (intent.missingFields.length > 0) {
    return { ...missingFieldsReply(intent.missingFields), intent: intent.intent };
  }

  switch (intent.intent) {
    case "help":
      return helpReply();
    case "search_books": {
      const query = String(intent.fields.query ?? message.text);
      try {
        const result = await searchBooks(message, query);
        if (!result.success) return unlinkedAccountReply();
        if (!("results" in result) || !result.results || result.results.length === 0) {
          return { status: "ok", intent: "search_books", text: "Belum ketemu buku yang cocok." };
        }
        return {
          status: "ok",
          intent: "search_books",
          text: (result.results as any[])
            .map((book: any, index: number) => `${index + 1}. ${book.title} — ${book.author}`)
            .join("\n"),
        };
      } catch {
        return {
          status: "ok",
          intent: "search_books",
          text: `Aku akan cari buku: ${query}`,
        };
      }
    }
    case "add_book":
      return {
        status: "needs_input",
        intent: "add_book",
        text: "Aku sudah paham kamu mau tambah buku. Integrasi tulis ke katalog akan lewat Convex agentBooks agar aman.",
      };
    case "borrow_book":
      return {
        status: "needs_input",
        intent: "borrow_book",
        text: "Aku sudah paham kamu mau pinjam buku. Aku perlu buku yang spesifik dan durasi pinjam.",
      };
    case "my_books": {
      try {
        const result = await getMyBooks(message);
        if (!result.success) return unlinkedAccountReply();
        if (!("books" in result) || !result.books || result.books.length === 0) {
          return { status: "ok", intent: "my_books", text: "Kamu belum punya buku di katalog." };
        }
        return {
          status: "ok",
          intent: "my_books",
          text: (result.books as any[])
            .map((book: any, index: number) => `${index + 1}. ${book.title} — ${book.status}`)
            .join("\n"),
        };
      } catch {
        return {
          status: "ok",
          intent: "my_books",
          text: "Aku akan cek daftar buku kamu setelah akun channel ini terhubung ke Perpuskukaan.",
        };
      }
    }
    case "fallback_chat":
    default:
      return { ...fallbackReply(), text: intent.reply ?? fallbackReply().text };
  }
}
