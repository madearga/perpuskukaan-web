"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, ArrowLeft, User, Calendar } from "lucide-react";

export default function BookDetailPage() {
  const params = useParams();
  const bookId = params.id as string;

  const book = useQuery(api.books.getById, { bookId });

  if (!book) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/catalog"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Katalog
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Cover */}
        <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
          {book.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.coverImage}
              alt={book.title}
              className="h-full w-full object-cover rounded-lg"
            />
          ) : (
            <BookOpen className="h-24 w-24 text-muted-foreground" />
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{book.title}</h1>
            <p className="text-lg text-muted-foreground">{book.author}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-muted px-3 py-1 text-sm">
              {book.category}
            </span>
            <span className="rounded-full bg-muted px-3 py-1 text-sm">
              {book.language}
            </span>
            <span className="rounded-full bg-muted px-3 py-1 text-sm">
              {book.fictionType}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-sm ${
                book.status === "available"
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {book.status}
            </span>
          </div>

          {book.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {book.description}
            </p>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Owner: {book.owner?.firstName || book.owner?.username || "Anonymous"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Kondisi: {book.condition}</span>
            </div>
            {book.isbn && (
              <div className="text-muted-foreground">ISBN: {book.isbn}</div>
            )}
          </div>

          {book.status === "available" && (
            <button className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-medium hover:bg-primary/90">
              Pinjam Buku
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
