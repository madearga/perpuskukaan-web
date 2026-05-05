import Link from "next/link";

export function Footer() {
  return (
    <footer className="hidden md:block w-full border-t border-border text-sm text-muted-foreground">
      <div className="mx-auto w-full max-w-6xl px-2 md:px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-center sm:text-left">Perpuskukaan</p>
        <div className="flex items-center gap-4">
          <Link
            href="/help"
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            Petunjuk
          </Link>
          <Link
            href="#"
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            Perpuskukaan
          </Link>
        </div>
      </div>
    </footer>
  );
}
