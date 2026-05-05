import type { BotResponse } from "./types";

export function helpReply(): BotResponse {
  return {
    status: "ok",
    intent: "help",
    text: [
      "Bantuan Perpuskukaan:",
      "• cari buku Atomic Habits",
      "• tambahkan buku Laskar Pelangi penulis Andrea Hirata kondisi bagus",
      "• buku saya apa saja?",
      "• saya mau pinjam buku Atomic Habits selama 7 hari",
    ].join("\n"),
  };
}

export function unlinkedAccountReply(): BotResponse {
  return {
    status: "unauthorized",
    text: "Akun ini belum terhubung ke Perpuskukaan. Kirim pesan **daftar** untuk mendaftar lewat Telegram, atau hubungkan Telegram/WhatsApp lewat dashboard Perpuskukaan.",
  };
}

export function missingFieldsReply(fields: string[]): BotResponse {
  return {
    status: "needs_input",
    text: `Ada data yang kurang: ${fields.join(", ")}. Tolong lengkapi dulu ya.`,
  };
}

export function fallbackReply(): BotResponse {
  return {
    status: "ok",
    intent: "fallback_chat",
    text: "Aku bisa bantu cari buku, tambah buku, cek buku kamu, atau bantu proses pinjam di Perpuskukaan.",
  };
}

export function errorReply(): BotResponse {
  return {
    status: "error",
    text: "Maaf, Perpuskukaan sedang gagal memproses pesan ini. Coba lagi sebentar ya.",
  };
}
