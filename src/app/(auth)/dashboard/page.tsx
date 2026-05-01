"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/convex/_generated/api";
// import { useConvexAuth } from "convex/react"; // TODO: re-enable after auth config
// import { useEffect } from "react";
// import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Bookmark, Heart, Library, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  // Auth bypassed — no redirect, no loading gate
  const user = useQuery(api.auth.getCurrentUser);

  const myBooks = useQuery(
    api.books.getMyBooks,
    user?._id ? { userId: user._id as any } : "skip"
  );
  const activeBorrows = useQuery(
    api.transactions.getActive,
    user?._id ? { userId: user._id as any } : "skip"
  );
  const wishlist = useQuery(
    api.wishlist.getByUser,
    user?._id ? { userId: user._id as any } : "skip"
  );

  // useEffect(() => {
  //   if (!isLoading && !isAuthenticated) redirect("/sign-in");
  // }, [isAuthenticated, isLoading]);

  // if (isLoading) {
  //   return (
  //     <div className="flex items-center justify-center min-h-[60vh]">
  //       <div className="animate-pulse text-muted-foreground">Loading...</div>
  //     </div>
  //   );
  // }

  const quickLinks = [
    { href: "/catalog", label: "Jelajahi Katalog", icon: BookOpen, desc: "Cari buku untuk dipinjam" },
    { href: "/my-books", label: "Buku Saya", icon: Library, desc: "Kelola koleksi buku Anda" },
    { href: "/my-borrows", label: "Pinjaman", icon: Bookmark, desc: "Lihat status pinjaman" },
    { href: "/wishlist", label: "Wishlist", icon: Heart, desc: "Buku yang ingin Anda baca" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Selamat datang{user ? `, ${(user as any).firstName || (user as any).email}` : ""}! Kelola buku dan pinjaman Anda.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Library className="h-4 w-4" />
            <span className="text-sm">Buku Saya</span>
          </div>
          <div className="text-2xl font-bold mt-1">{myBooks?.length || 0}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bookmark className="h-4 w-4" />
            <span className="text-sm">Pinjaman Aktif</span>
          </div>
          <div className="text-2xl font-bold mt-1">
            {activeBorrows?.filter((t: any) => t.status === "active").length || 0}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Heart className="h-4 w-4" />
            <span className="text-sm">Wishlist</span>
          </div>
          <div className="text-2xl font-bold mt-1">{wishlist?.length || 0}</div>
        </div>
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Aksi Cepat</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="rounded-full bg-primary/10 p-3">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{link.label}</div>
                  <div className="text-sm text-muted-foreground">{link.desc}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
