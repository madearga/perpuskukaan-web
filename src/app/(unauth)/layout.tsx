"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, MapPin, Search, HelpCircle } from "lucide-react";

const items = [
  { href: "/catalog", label: "Cari", icon: Search },
  { href: "/my-books", label: "Buku", icon: BookOpen },
  { href: "/drop-info", label: "Drop", icon: MapPin },
  { href: "/help", label: "Bantuan", icon: HelpCircle },
];

export default function UnauthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <div className="pb-[72px] md:pb-0">{children}</div>
      <nav
        aria-label="Public navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur md:hidden"
      >
        <div className="flex justify-around px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[50px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
