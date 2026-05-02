import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Bot-compatible functions using telegramId instead of auth

export const addByTelegram = mutation({
  args: {
    telegramId: v.string(),
    title: v.string(),
    author: v.string(),
    isbn: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.string(),
    condition: v.string(),
    mode: v.string(),
    language: v.optional(v.string()),
    fictionType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) => q.eq("telegramId", args.telegramId))
      .first();

    if (!user) {
      return { success: false, message: "User not registered" };
    }

    const now = Date.now();
    const bookId = await ctx.db.insert("books", {
      ownerId: user._id,
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
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(user._id, {
      totalBooksShared: (user.totalBooksShared ?? 0) + 1,
      updatedAt: now,
    });

    return { success: true, message: "Book added", bookId };
  },
});

export const searchByTelegram = query({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    const results = await ctx.db
      .query("books")
      .withSearchIndex("search_books", (q) => {
        let search = q.search("title", args.query);
        if (args.category) {
          search = search.eq("category", args.category);
        }
        return search.eq("status", "available");
      })
      .take(limit);

    const enriched = await Promise.all(
      results.map(async (book) => {
        const owner = await ctx.db.get(book.ownerId);
        return { ...book, owner };
      })
    );

    return enriched;
  },
});

export const getMyBooksByTelegram = query({
  args: { telegramId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) => q.eq("telegramId", args.telegramId))
      .first();

    if (!user) return [];

    return await ctx.db
      .query("books")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
  },
});
