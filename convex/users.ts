import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const syncUserCreation = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("users", {
      email: args.email,
      telegramId: undefined,
      username: undefined,
      firstName: undefined,
      lastName: undefined,
      phone: undefined,
      location: undefined,
      bio: undefined,
      avatar: undefined,
      reputation: 0,
      totalBooksShared: 0,
      totalBorrows: 0,
      totalLends: 0,
      isVerified: false,
      role: "user",
      linkedUserIds: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const syncUserDeletion = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const appUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (appUser) {
      await ctx.db.delete(appUser._id);
    }
  },
});

export const getProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const myBooks = await ctx.db
      .query("books")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .collect();

    const myBorrows = await ctx.db
      .query("transactions")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", args.userId))
      .collect();

    const myLends = await ctx.db
      .query("transactions")
      .withIndex("by_lender", (q) => q.eq("lenderId", args.userId))
      .collect();

    return {
      ...user,
      stats: {
        totalBooks: myBooks.length,
        totalBorrows: myBorrows.length,
        totalLends: myLends.length,
      },
    };
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    bio: v.optional(v.string()),
    phone: v.optional(v.string()),
    location: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const update: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.bio !== undefined) update.bio = args.bio;
    if (args.phone !== undefined) update.phone = args.phone;
    if (args.location !== undefined) update.location = args.location;
    if (args.avatar !== undefined) update.avatar = args.avatar;

    await ctx.db.patch(args.userId, update);
    return { success: true };
  },
});
