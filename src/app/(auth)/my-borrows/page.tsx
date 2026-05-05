"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/convex/_generated/api";
// Auth bypassed — TODO: re-enable after auth config
// import { useConvexAuth } from "convex/react";
import { useState, useRef } from "react";
// import { redirect } from "next/navigation";
import { Clock, Check, X, BookOpen, PlusCircle, RotateCcw } from "lucide-react";

export default function MyBorrowsPage() {
  const user = useQuery(api.auth.getCurrentUser);
  const borrowerId = user?._id as any;

  const outgoing = useQuery(
    api.borrowRequests.getByBorrower,
    borrowerId ? { borrowerId } : "skip"
  );
  const active = useQuery(
    api.transactions.getActive,
    borrowerId ? { userId: borrowerId } : "skip"
  );
  const incoming = useQuery(
    api.borrowRequests.getByLender,
    borrowerId ? { lenderId: borrowerId } : "skip"
  );

  const acceptRequest = useMutation(api.borrowRequests.accept);
  const rejectRequest = useMutation(api.borrowRequests.reject);
  const createRequest = useMutation(api.borrowRequests.create);
  const markReturned = useMutation(api.transactions.markReturned);

  const [tab, setTab] = useState<"outgoing" | "active" | "incoming">("outgoing");

  // Borrow form state
  const [showForm, setShowForm] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [durationDays, setDurationDays] = useState(14);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced book search
  const searchResults = useQuery(
    api.books.search,
    bookSearch.length >= 2 ? { query: bookSearch, limit: 10 } : "skip"
  );

  const handleBookSearch = (value: string) => {
    setBookSearch(value);
    setSelectedBookId(null);
    setFormError(null);
  };

  const handleSelectBook = (book: any) => {
    setSelectedBookId(book._id);
    setBookSearch(book.title);
  };

  const handleSubmitBorrow = async () => {
    if (!selectedBookId || !borrowerId) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const result = await createRequest({
        bookId: selectedBookId as any,
        borrowerId,
        durationDays,
      });
      if (result && !result.success) {
        setFormError(result.error || "Gagal mengajukan pinjaman");
      } else {
        setShowForm(false);
        setBookSearch("");
        setSelectedBookId(null);
        setDurationDays(14);
      }
    } catch {
      setFormError("Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async (transactionId: string) => {
    setReturningId(transactionId);
    try {
      await markReturned({ transactionId: transactionId as any });
    } catch {
      // mutation will refresh data on error
    } finally {
      setReturningId(null);
    }
  };

  // Auth bypassed

  // Auth bypassed — no loading gate

  const tabs = [
    { key: "outgoing" as const, label: `Permintaan Saya (${outgoing?.length || 0})` },
    { key: "active" as const, label: `Sedang Dipinjam (${active?.filter((t: any) => t.status === "active").length || 0})` },
    { key: "incoming" as const, label: `Permintaan Masuk (${incoming?.filter((r: any) => r.status === "pending").length || 0})` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pinjaman</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium"
        >
          <PlusCircle className="h-4 w-4" />
          Ajukan Pinjaman
        </button>
      </div>

      {/* Borrow Request Form */}
      {showForm && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
          <h2 className="font-semibold">Ajukan Pinjaman</h2>

          <div className="space-y-1">
            <label className="text-sm font-medium">Cari Buku</label>
            <input
              type="text"
              placeholder="Ketik judul atau penulis..."
              value={bookSearch}
              onChange={(e) => handleBookSearch(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {bookSearch.length >= 2 && !selectedBookId && searchResults && (
              <div className="border rounded-md max-h-48 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">Tidak ditemukan</p>
                ) : (
                  searchResults.map((book: any) => (
                    <button
                      key={book._id}
                      onClick={() => handleSelectBook(book)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex justify-between items-center"
                    >
                      <span className="font-medium">{book.title}</span>
                      <span className="text-xs text-muted-foreground">{book.author}</span>
                    </button>
                  ))
                )}
              </div>
            )}
            {selectedBookId && (
              <p className="text-xs text-green-700">✓ Buku dipilih</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Durasi (hari)</label>
            <input
              type="number"
              min={1}
              max={90}
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-32 rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          {formError && (
            <p className="text-sm text-red-600">{formError}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSubmitBorrow}
              disabled={!selectedBookId || submitting}
              className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {submitting ? "Mengirim..." : "Kirim Permintaan"}
            </button>
            <button
              onClick={() => { setShowForm(false); setFormError(null); }}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "outgoing" && (
        <div className="space-y-3">
          {!outgoing || outgoing.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Belum ada permintaan pinjam</p>
          ) : (
            outgoing.map((req: any) => (
              <div key={req._id} className="rounded-lg border p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{req.book?.title}</p>
                  <p className="text-sm text-muted-foreground">Ke: {req.lender?.firstName || req.lender?.email}</p>
                  <p className="text-sm text-muted-foreground">Durasi: {req.durationDays} hari</p>
                  <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs ${
                    req.status === "pending" ? "bg-amber-100 text-amber-800" :
                    req.status === "accepted" ? "bg-green-100 text-green-800" :
                    "bg-red-100 text-red-800"
                  }`}>{req.status}</span>
                </div>
                {req.status === "pending" && <Clock className="h-5 w-5 text-muted-foreground" />}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "active" && (
        <div className="space-y-3">
          {!active || active.filter((t: any) => t.status === "active").length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Tidak ada pinjaman aktif</p>
          ) : (
            active.filter((t: any) => t.status === "active").map((t: any) => (
              <div key={t._id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t.book?.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.borrowerId === borrowerId ? `Dari: ${t.lender?.firstName || t.lender?.email}` : `Ke: ${t.borrower?.firstName || t.borrower?.email}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Jatuh tempo: {new Date(t.dueDate).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs">Aktif</span>
                    <button
                      onClick={() => handleReturn(t._id)}
                      disabled={returningId === t._id}
                      className="flex items-center gap-1 rounded-md bg-blue-600 text-white px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {returningId === t._id ? "Mengembalikan..." : "Kembalikan"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "incoming" && (
        <div className="space-y-3">
          {!incoming || incoming.filter((r: any) => r.status === "pending").length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Tidak ada permintaan masuk</p>
          ) : (
            incoming.filter((r: any) => r.status === "pending").map((req: any) => (
              <div key={req._id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{req.book?.title}</p>
                    <p className="text-sm text-muted-foreground">Dari: {req.borrower?.firstName || req.borrower?.email}</p>
                    <p className="text-sm text-muted-foreground">Durasi: {req.durationDays} hari</p>
                    {req.message && <p className="text-sm text-muted-foreground italic">"{req.message}"</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptRequest({ requestId: req._id })}
                      className="flex items-center gap-1 rounded-md bg-green-600 text-white px-3 py-1.5 text-sm"
                    >
                      <Check className="h-3 w-3" /> Terima
                    </button>
                    <button
                      onClick={() => rejectRequest({ requestId: req._id })}
                      className="flex items-center gap-1 rounded-md bg-red-600 text-white px-3 py-1.5 text-sm"
                    >
                      <X className="h-3 w-3" /> Tolak
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
