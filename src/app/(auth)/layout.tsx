"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Library,
  Bookmark,
  Heart,
  User,
  Shield,
  LogOut,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@convex/convex/_generated/api";
import { authClient } from "@/lib/auth-client";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const user = useQuery(api.auth.getCurrentUser);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/catalog", label: "Katalog", icon: BookOpen },
    { href: "/my-books", label: "Buku Saya", icon: Library },
    { href: "/my-borrows", label: "Pinjaman", icon: Bookmark },
    { href: "/wishlist", label: "Wishlist", icon: Heart },
    { href: "/profile", label: "Profil", icon: User },
  ];

  if ((user as any)?.role === "admin") {
    navItems.push({ href: "/admin", label: "Admin", icon: Shield });
  }

  return (
    <div className="flex min-h-[calc(100vh-2rem)]">
      <aside className="w-64 border-r bg-muted/30 hidden md:block">
        <div className="p-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <BookOpen className="h-6 w-6" />
            Perpuskukaan
          </Link>
        </div>
        <nav className="space-y-1 p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/sign-in" } } })}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
    </div>
  );
}
