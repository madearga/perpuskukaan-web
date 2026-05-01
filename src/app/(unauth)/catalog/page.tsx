"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/convex/_generated/api";
import { useState, Suspense } from "react";
import Link from "next/link";
import { BookOpen, Search } from "lucide-react";

function CatalogContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const books = useQuery(api.books.list, {
    paginationOpts: { numItems: 24, cursor: null },
    category: selectedCategory || undefined,
    status: "available",
  });

  const searchResults = useQuery(
    api.books.search,
    searchQuery.length > 2
      ? {
          query: searchQuery,
          category: selectedCategory || undefined,
          limit: 20,
        }
      : "skip"
  );

  const displayBooks =
    searchQuery.length > 2 ? searchResults : books?.page;

  const categories = [
    "Fiksi",
    "Non-Fiksi",
    "Filsafat",
    "Sejarah",
    "Sains",
    "Teknologi",
    "Agama",
    "Seni",
    "Lainnya",
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Katalog Buku Perpuskukaan
        </h1>
        <p className="text-muted-foreground">
          Temukan dan pinjam buku dari komunitas P2P library kami
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Cari judul atau penulis..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory("")}
          className={`rounded-full px-3 py-1 text-sm ${
            selectedCategory === ""
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          Semua
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-full px-3 py-1 text-sm ${
              selectedCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Book Grid */}
      {!displayBooks ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border p-4 animate-pulse space-y-3"
            >
              <div className="h-48 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : displayBooks.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            Belum ada buku yang tersedia
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayBooks.map((book: any) => (
            <Link
              key={book._id}
              href={`/catalog/${book._id}`}
              className="rounded-lg border p-4 hover:border-primary transition-colors space-y-3"
            >
              <div className="aspect-[3/4] bg-muted rounded flex items-center justify-center">
                {book.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="h-full w-full object-cover rounded"
                  />
                ) : (
                  <BookOpen className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <div>
                <h3 className="font-semibold line-clamp-2">{book.title}</h3>
                <p className="text-sm text-muted-foreground">{book.author}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {book.category}
                </span>
                <span className="rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs">
                  {book.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}
