"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/convex/_generated/api";
// Auth bypassed — TODO: re-enable after auth config
// import { useConvexAuth } from "convex/react";
import { useState } from "react";
// import { redirect } from "next/navigation";
import { Clock, Check, X, BookOpen } from "lucide-react";

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

  const [tab, setTab] = useState<"outgoing" | "active" | "incoming">("outgoing");

  // Auth bypassed

  // Auth bypassed — no loading gate

  const tabs = [
    { key: "outgoing" as const, label: `Permintaan Saya (${outgoing?.length || 0})` },
    { key: "active" as const, label: `Sedang Dipinjam (${active?.filter((t: any) => t.status === "active").length || 0})` },
    { key: "incoming" as const, label: `Permintaan Masuk (${incoming?.filter((r: any) => r.status === "pending").length || 0})` },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pinjaman</h1>

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
                  <span className="rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs">Aktif</span>
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
