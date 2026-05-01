import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { betterAuthComponent } from "./auth";

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
      isActive: true,
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
    if (!user || user.isActive === false) return null;

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
    return await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("isActive"), false))
      .collect();
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

// ─── Account Link Status ───

export const getAccountLinkStatus = query({
  args: {},
  handler: async (ctx) => {
    let authUser;
    try {
      authUser = await betterAuthComponent.getAuthUser(ctx);
    } catch {
      return { hasTelegram: false, telegramUsername: null };
    }
    if (!authUser) return { hasTelegram: false, telegramUsername: null };

    const appUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", authUser.email))
      .first();

    return {
      hasTelegram: !!appUser?.telegramId,
      telegramUsername: appUser?.username || null,
    };
  },
});

// ─── Connect Telegram ───

export const connectTelegram = mutation({
  args: {
    webUserId: v.id("users"),
    telegramId: v.string(),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Verify caller identity
    const authUser = await betterAuthComponent.getAuthUser(ctx);
    if (!authUser) throw new Error("Unauthorized");

    const webUser = await ctx.db.get(args.webUserId);
    if (!webUser || webUser.email !== authUser.email) {
      throw new Error("User mismatch");
    }

    // 2. Collision check: is this telegramId already linked to another active user?
    const existing = await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) => q.eq("telegramId", args.telegramId))
      .filter((q) => q.neq(q.field("isActive"), false))
      .first();

    if (existing && existing._id !== args.webUserId) {
      throw new Error("Telegram account already linked to another user");
    }

    // If already linked to this user, idempotent success
    if (existing && existing._id === args.webUserId) {
      return { success: true, merged: false };
    }

    // 3. Find bot user by telegramId (active only)
    const botUser = await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) => q.eq("telegramId", args.telegramId))
      .filter((q) => q.neq(q.field("isActive"), false))
      .first();

    if (botUser && botUser._id !== args.webUserId) {
      // 3a. Reassign all data from bot user → web user
      // Books
      const botBooks = await ctx.db
        .query("books")
        .withIndex("by_owner", (q) => q.eq("ownerId", botUser._id))
        .collect();
      for (const book of botBooks) {
        await ctx.db.patch(book._id, { ownerId: args.webUserId });
      }

      // Borrow requests (as borrower)
      const botBorrowRequests = await ctx.db
        .query("borrowRequests")
        .withIndex("by_borrower", (q) => q.eq("borrowerId", botUser._id))
        .collect();
      for (const req of botBorrowRequests) {
        await ctx.db.patch(req._id, { borrowerId: args.webUserId });
      }

      // Borrow requests (as lender)
      const botLendRequests = await ctx.db
        .query("borrowRequests")
        .withIndex("by_lender", (q) => q.eq("lenderId", botUser._id))
        .collect();
      for (const req of botLendRequests) {
        await ctx.db.patch(req._id, { lenderId: args.webUserId });
      }

      // Transactions (as borrower)
      const botBorrows = await ctx.db
        .query("transactions")
        .withIndex("by_borrower", (q) => q.eq("borrowerId", botUser._id))
        .collect();
      for (const t of botBorrows) {
        await ctx.db.patch(t._id, { borrowerId: args.webUserId });
      }

      // Transactions (as lender)
      const botLends = await ctx.db
        .query("transactions")
        .withIndex("by_lender", (q) => q.eq("lenderId", botUser._id))
        .collect();
      for (const t of botLends) {
        await ctx.db.patch(t._id, { lenderId: args.webUserId });
      }

      // Wishlist
      const botWishlist = await ctx.db
        .query("wishlist")
        .withIndex("by_user", (q) => q.eq("userId", botUser._id))
        .collect();
      for (const item of botWishlist) {
        await ctx.db.patch(item._id, { userId: args.webUserId });
      }

      // Reviews (as reviewer)
      const botReviews = await ctx.db
        .query("reviews")
        .withIndex("by_reviewer", (q) => q.eq("reviewerId", botUser._id))
        .collect();
      for (const review of botReviews) {
        await ctx.db.patch(review._id, { reviewerId: args.webUserId });
      }

      // Reviews (as reviewee)
      const botReviewed = await ctx.db
        .query("reviews")
        .withIndex("by_reviewee", (q) => q.eq("revieweeId", botUser._id))
        .collect();
      for (const review of botReviewed) {
        await ctx.db.patch(review._id, { revieweeId: args.webUserId });
      }

      // 3b. Soft-delete bot user
      await ctx.db.patch(botUser._id, {
        isActive: false,
        updatedAt: Date.now(),
      });

      // 3c. Update web user linkedUserIds
      const linkedIds = webUser.linkedUserIds || [];
      if (!linkedIds.includes(botUser._id)) {
        linkedIds.push(botUser._id);
      }

      // 4. Recompute stats from actual tables
      const allBooks = await ctx.db
        .query("books")
        .withIndex("by_owner", (q) => q.eq("ownerId", args.webUserId))
        .collect();
      const allBorrows = await ctx.db
        .query("transactions")
        .withIndex("by_borrower", (q) => q.eq("borrowerId", args.webUserId))
        .collect();
      const allLends = await ctx.db
        .query("transactions")
        .withIndex("by_lender", (q) => q.eq("lenderId", args.webUserId))
        .collect();

      await ctx.db.patch(args.webUserId, {
        telegramId: args.telegramId,
        username: args.username || webUser.username,
        firstName: args.firstName || webUser.firstName,
        linkedUserIds: linkedIds,
        totalBooksShared: allBooks.length,
        totalBorrows: allBorrows.length,
        totalLends: allLends.length,
        reputation: Math.max(webUser.reputation || 0, botUser.reputation || 0),
        updatedAt: Date.now(),
      });

      return { success: true, merged: true };
    }

    // 4. No bot user found — just set telegramId
    await ctx.db.patch(args.webUserId, {
      telegramId: args.telegramId,
      username: args.username || webUser.username,
      firstName: args.firstName || webUser.firstName,
      updatedAt: Date.now(),
    });

    return { success: true, merged: false };
  },
});

// ─── Disconnect Telegram ───

export const disconnectTelegram = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await betterAuthComponent.getAuthUser(ctx);
    if (!authUser) throw new Error("Unauthorized");

    const appUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", authUser.email))
      .first();

    if (!appUser) throw new Error("User not found");

    // Remove telegramId and clean linkedUserIds
    const linkedIds = (appUser.linkedUserIds || []).filter(
      (id) => id !== appUser._id
    );

    await ctx.db.patch(appUser._id, {
      telegramId: undefined,
      linkedUserIds: linkedIds.length > 0 ? linkedIds : undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
