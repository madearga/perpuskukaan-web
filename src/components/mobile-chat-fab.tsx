"use client";

import { useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

export function MobileChatFab() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [reply, setReply] = useState("Ada yang bisa aku bantu cari di Perpuskukaan?");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      setReply(data.text ?? "Maaf, aku belum bisa menjawab itu.");
      setText("");
    } catch {
      setReply("Maaf, chat Perpuskukaan sedang bermasalah. Coba lagi sebentar ya.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-4 z-40 md:bottom-6">
      {open && (
        <div className="mb-3 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border bg-background p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Chat Perpuskukaan</p>
              <p className="text-xs text-muted-foreground">Cari buku dengan bahasa natural.</p>
            </div>
            <button
              aria-label="Tutup chat Perpuskukaan"
              className="min-h-[44px] min-w-[44px] rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setOpen(false)}
            >
              <X className="mx-auto h-4 w-4" />
            </button>
          </div>
          <div className="mb-3 rounded-xl bg-muted p-3 text-sm">{reply}</div>
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void send();
              }}
              placeholder="Contoh: cari buku parenting"
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <button
              aria-label="Kirim chat Perpuskukaan"
              disabled={loading}
              onClick={() => void send()}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-primary text-primary-foreground disabled:opacity-60"
            >
              <Send className="mx-auto h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <button
        aria-label="Buka chat Perpuskukaan"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[56px] min-w-[56px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}
