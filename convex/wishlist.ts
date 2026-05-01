import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("wishlist")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const enriched = await Promise.all(
      items.map(async (item) => {
        const book = await ctx.db.get(item.bookId);
        return { ...item, book };
      })
    );

    return enriched;
  },
});

export const add = mutation({
  args: {
    userId: v.id("users"),
    bookId: v.id("books"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("wishlist")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("bookId"), args.bookId))
      .first();

    if (existing) {
      return { success: true, wishlistId: existing._id };
    }

    const wishlistId = await ctx.db.insert("wishlist", {
      userId: args.userId,
      bookId: args.bookId,
      createdAt: Date.now(),
    });

    return { success: true, wishlistId };
  },
});

export const remove = mutation({
  args: {
    userId: v.id("users"),
    bookId: v.id("books"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("wishlist")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("bookId"), args.bookId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { success: true };
  },
});
