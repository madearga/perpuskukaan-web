import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { api } from "./_generated/api";

export const getCoverUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const add = mutation({
  args: {
    title: v.string(),
    author: v.string(),
    isbn: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.string(),
    condition: v.string(),
    mode: v.string(),
    language: v.string(),
    fictionType: v.string(),
    coverImage: v.optional(v.string()),
    coverStorageId: v.optional(v.id("_storage")),
    ownerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const bookId = await ctx.db.insert("books", {
      ownerId: args.ownerId,
      title: args.title,
      author: args.author,
      isbn: args.isbn,
      description: args.description,
      category: args.category,
      condition: args.condition,
      status: "available",
      mode: args.mode,
      language: args.language,
      fictionType: args.fictionType,
      coverImage: args.coverImage,
      coverStorageId: args.coverStorageId,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, bookId };
  },
});

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    category: v.optional(v.string()),
    language: v.optional(v.string()),
    fictionType: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query;
    if (args.category) {
      query = ctx.db.query("books").withIndex("by_category", (q) =>
        q.eq("category", args.category as string)
      );
    } else {
      query = ctx.db.query("books").withIndex("by_status", (q) =>
        args.status ? q.eq("status", args.status) : q.eq("status", "available")
      );
    }

    const page = await query.paginate(args.paginationOpts);

    // Enrich with owner info (skip merged users)
    const enriched = await Promise.all(
      page.page.map(async (book) => {
        const owner = await ctx.db.get(book.ownerId);
        if (owner && owner.isActive === false) return null;
        return { ...book, owner };
      })
    );

    return { ...page, page: enriched.filter((b) => b !== null) };
  },
});

export const search = query({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
    language: v.optional(v.string()),
    fictionType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // Search by title
    let titleResults = await ctx.db
      .query("books")
      .withSearchIndex("search_books", (q) => {
        let search = q.search("title", args.query);
        if (args.category) search = search.eq("category", args.category);
        if (args.language) search = search.eq("language", args.language);
        if (args.fictionType) search = search.eq("fictionType", args.fictionType);
        return search.eq("status", "available");
      })
      .take(limit);

    // Search by author
    let authorResults = await ctx.db
      .query("books")
      .withSearchIndex("search_authors", (q) => {
        let search = q.search("author", args.query);
        if (args.category) search = search.eq("category", args.category);
        if (args.language) search = search.eq("language", args.language);
        if (args.fictionType) search = search.eq("fictionType", args.fictionType);
        return search.eq("status", "available");
      })
      .take(limit);

    // Merge and deduplicate
    const seen = new Set<string>();
    const merged = [];

    for (const book of [...titleResults, ...authorResults]) {
      if (!seen.has(book._id)) {
        seen.add(book._id);
        const owner = await ctx.db.get(book.ownerId);
        if (owner && owner.isActive === false) continue;
        merged.push({ ...book, owner });
      }
    }

    return merged.slice(0, limit);
  },
});

export const getById = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const book = await ctx.db.get(args.bookId);
    if (!book) return null;

    const owner = await ctx.db.get(book.ownerId);
    if (owner && owner.isActive === false) return null;
    return { ...book, owner };
  },
});

export const getMyBooks = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("books")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .collect();
  },
});

export const updateStatus = mutation({
  args: {
    bookId: v.id("books"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.bookId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allBooks = await ctx.db.query("books").collect();
    const total = allBooks.length;
    const available = allBooks.filter((b) => b.status === "available").length;
    const lent = allBooks.filter((b) => b.status === "lent").length;
    const reserved = allBooks.filter((b) => b.status === "reserved").length;

    const byCategory: Record<string, number> = {};
    for (const book of allBooks) {
      byCategory[book.category] = (byCategory[book.category] || 0) + 1;
    }

    return { total, available, lent, reserved, byCategory };
  },
});

export const lookupISBN = action({
  args: { isbn: v.string() },
  handler: async (ctx, args) => {
    const isbn = args.isbn.replace(/[-\s]/g, "");

    // 1. Try Open Library
    try {
      const olResp = await fetch(
        `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?redirect=false`
      );
      const olData = (await olResp.json()) as any;
      if (olData?.thumbnail_url) {
        // Open Library returns thumbnail_url when not redirecting
        return { source: "openlibrary", coverUrl: olData.thumbnail_url.replace("-S", "-M") };
      }
      // Try direct URL (sometimes returns image even when ?redirect=false fails)
      const directResp = await fetch(`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`, {
        redirect: "manual",
      });
      if (directResp.status === 302 || directResp.status === 303) {
        const location = directResp.headers.get("location");
        if (location && !location.includes("notfound")) {
          return { source: "openlibrary", coverUrl: location };
        }
      }
    } catch {}

    // 2. Try Google Books
    try {
      const gbResp = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
      );
      const gbData = (await gbResp.json()) as any;
      if (gbData?.items?.[0]?.volumeInfo?.imageLinks?.thumbnail) {
        let url = gbData.items[0].volumeInfo.imageLinks.thumbnail;
        // Upgrade to larger size
        url = url.replace("zoom=1", "zoom=2").replace("zoom=5", "zoom=2");
        return { source: "googlebooks", coverUrl: url };
      }
    } catch {}

    return { source: null, coverUrl: null };
  },
});

export const deleteCover = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId);
    return { success: true };
  },
});
