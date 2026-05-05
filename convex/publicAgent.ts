import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const channelValidator = v.union(v.literal("telegram"), v.literal("whatsapp"));

async function resolveIdentity(
  ctx: any,
  channel: "telegram" | "whatsapp",
  providerUserId: string,
) {
  const identity = await ctx.db
    .query("userIdentities")
    .withIndex("by_provider_user", (q: any) =>
      q.eq("provider", channel).eq("providerUserId", providerUserId),
    )
    .first();

  if (!identity) return null;
  return await ctx.db.get(identity.userId);
}

export const registerTelegramUser = mutation({
  args: {
    providerUserId: v.string(),
    username: v.optional(v.string()),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existingIdentity = await ctx.db
      .query("userIdentities")
      .withIndex("by_provider_user", (q: any) =>
        q.eq("provider", "telegram").eq("providerUserId", args.providerUserId),
      )
      .first();

    if (existingIdentity) {
      return {
        success: true,
        alreadyRegistered: true,
        userId: existingIdentity.userId,
      };
    }

    const userId = await ctx.db.insert("users", {
      email: undefined,
      telegramId: args.providerUserId,
      username: args.username,
      firstName: args.displayName,
      lastName: undefined,
      reputation: 100,
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

    await ctx.db.insert("userIdentities", {
      userId,
      provider: "telegram",
      providerUserId: args.providerUserId,
      username: args.username,
      displayName: args.displayName,
      verifiedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, alreadyRegistered: false, userId };
  },
});

export const searchBooks = query({
  args: {
    channel: channelValidator,
    providerUserId: v.string(),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await resolveIdentity(ctx, args.channel, args.providerUserId);
    if (!user) return { success: false, error: "NOT_LINKED" };

    const results = await ctx.db
      .query("books")
      .withSearchIndex("search_books", (q) =>
        q.search("title", args.query).eq("status", "available"),
      )
      .take(5);

    return { success: true, results };
  },
});

export const getMyBooks = query({
  args: {
    channel: channelValidator,
    providerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await resolveIdentity(ctx, args.channel, args.providerUserId);
    if (!user) return { success: false, error: "NOT_LINKED" };

    const books = await ctx.db
      .query("books")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    return { success: true, books };
  },
});

export const createBookDraft = mutation({
  args: {
    channel: channelValidator,
    providerUserId: v.string(),
    idempotencyKey: v.string(),
    title: v.string(),
    author: v.string(),
    category: v.string(),
    condition: v.string(),
    mode: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await resolveIdentity(ctx, args.channel, args.providerUserId);
    if (!user) return { success: false, error: "NOT_LINKED" };

    const existing = await ctx.db
      .query("agentActions")
      .withIndex("by_idempotency_key", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey),
      )
      .first();

    if (existing) {
      return { success: true, duplicate: true, actionId: existing._id };
    }

    const actionId = await ctx.db.insert("agentActions", {
      channel: args.channel,
      providerUserId: args.providerUserId,
      appUserId: user._id,
      action: "public.createBookDraft",
      idempotencyKey: args.idempotencyKey,
      input: JSON.stringify(args),
      status: "drafted",
      resultSummary: `Draft tambah buku: ${args.title}`,
      resultJson: undefined,
      error: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, duplicate: false, actionId };
  },
});

export const createBorrowDraft = mutation({
  args: {
    channel: channelValidator,
    providerUserId: v.string(),
    idempotencyKey: v.string(),
    bookId: v.id("books"),
    durationDays: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await resolveIdentity(ctx, args.channel, args.providerUserId);
    if (!user) return { success: false, error: "NOT_LINKED" };

    const existing = await ctx.db
      .query("agentActions")
      .withIndex("by_idempotency_key", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey),
      )
      .first();

    if (existing) {
      return { success: true, duplicate: true, actionId: existing._id };
    }

    const actionId = await ctx.db.insert("agentActions", {
      channel: args.channel,
      providerUserId: args.providerUserId,
      appUserId: user._id,
      action: "public.createBorrowDraft",
      idempotencyKey: args.idempotencyKey,
      input: JSON.stringify(args),
      status: "drafted",
      resultSummary: `Draft pinjam buku selama ${args.durationDays} hari`,
      resultJson: undefined,
      error: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, duplicate: false, actionId };
  },
});
