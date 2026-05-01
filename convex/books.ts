import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";

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
    let query = ctx.db.query("books").withIndex("by_status", (q) =>
      args.status ? q.eq("status", args.status) : q.eq("status", "available")
    );

    if (args.category) {
      query = ctx.db.query("books").withIndex("by_category", (q) =>
        q.eq("category", args.category)
      );
    }

    const page = await query.paginate(args.paginationOpts);

    // Enrich with owner info
    const enriched = await Promise.all(
      page.page.map(async (book) => {
        const owner = await ctx.db.get(book.ownerId);
        return { ...book, owner };
      })
    );

    return { ...page, page: enriched };
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
