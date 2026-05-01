"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/convex/_generated/api";
// Auth bypassed — TODO: re-enable after auth config
// import { useConvexAuth } from "convex/react";
// import { useEffect } from "react";
// import { redirect } from "next/navigation";
import { BookOpen, Users, Clock, AlertTriangle, CheckCircle } from "lucide-react";

export default function AdminPage() {
  const user = useQuery(api.auth.getCurrentUser);

  const stats = useQuery(api.books.getStats);
  const overdue = useQuery(api.transactions.getOverdue);
  const allTransactions = useQuery(api.transactions.getAll, {});
  const allUsers = useQuery(api.users.getAll);

  // Auth bypassed — admin check disabled
  // const isAdmin = (user as any)?.role === "admin";
  const isAdmin = true;

  const pendingRequests = allTransactions?.filter((t: any) => t.status === "pending").length || 0;
  const activeTransactions = allTransactions?.filter((t: any) => t.status === "active").length || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-sm">Total Users</span>
          </div>
          <div className="text-2xl font-bold mt-1">{allUsers?.length || 0}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span className="text-sm">Total Buku</span>
          </div>
          <div className="text-2xl font-bold mt-1">{stats?.total || 0}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Tersedia</span>
          </div>
          <div className="text-2xl font-bold mt-1">{stats?.available || 0}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Dipinjam</span>
          </div>
          <div className="text-2xl font-bold mt-1">{stats?.lent || 0}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Terlambat</span>
          </div>
          <div className="text-2xl font-bold mt-1 text-red-600">{overdue?.length || 0}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Transaksi Aktif</span>
          </div>
          <div className="text-2xl font-bold mt-1">{activeTransactions}</div>
        </div>
      </div>

      {overdue && overdue.length > 0 && (
        <div className="rounded-lg border border-red-200 p-4">
          <h3 className="font-semibold text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Pinjaman Terlambat
          </h3>
          <div className="mt-3 space-y-2">
            {overdue.slice(0, 5).map((t: any) => (
              <div key={t._id} className="flex items-center justify-between text-sm">
                <span>{t.book?.title}</span>
                <span className="text-red-600">
                  {Math.ceil((Date.now() - t.dueDate) / (1000 * 60 * 60 * 24))} hari terlambat
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border p-4">
        <h3 className="font-semibold mb-3">Transaksi Terbaru</h3>
        <div className="space-y-2">
          {allTransactions?.slice(0, 10).map((t: any) => (
            <div key={t._id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
              <div>
                <span className="font-medium">{t.book?.title}</span>
                <span className="text-muted-foreground"> — {t.borrower?.email}</span>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${
                t.status === "active" ? "bg-green-100 text-green-800" :
                t.status === "returned" ? "bg-gray-100 text-gray-800" :
                "bg-amber-100 text-amber-800"
              }`}>{t.status}</span>
            </div>
          )) || <p className="text-muted-foreground text-sm">Belum ada transaksi</p>}
        </div>
      </div>
    </div>
  );
}
