import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const channelValidator = v.union(v.literal("telegram"), v.literal("whatsapp"));

async function resolveChannelUser(
  ctx: any,
  provider: "telegram" | "whatsapp",
  providerUserId: string
) {
  const identity = await ctx.db
    .query("userIdentities")
    .withIndex("by_provider_user", (q: any) =>
      q.eq("provider", provider).eq("providerUserId", providerUserId)
    )
    .first();

  if (!identity) return null;
  const user = await ctx.db.get(identity.userId);
  if (!user || user.isActive === false) return null;
  return user;
}

export const searchBooksForAgent = query({
  args: {
    channel: channelValidator,
    providerUserId: v.string(),
    query: v.string(),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await resolveChannelUser(ctx, args.channel, args.providerUserId);
    if (!user) {
      return { success: false, error: "Akun channel belum terhubung ke Perpuskukaan." };
    }

    const limit = Math.min(args.limit ?? 10, 20);
    const results = await ctx.db
      .query("books")
      .withSearchIndex("search_books", (q) => {
        let search = q.search("title", args.query);
        if (args.category) search = search.eq("category", args.category);
        return search.eq("status", "available");
      })
      .take(limit);

    return { success: true, results };
  },
});

export const addBookFromAgent = mutation({
  args: {
    channel: channelValidator,
    providerUserId: v.string(),
    idempotencyKey: v.string(),
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
    const existingAction = await ctx.db
      .query("agentActions")
      .withIndex("by_idempotency_key", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey)
      )
      .first();

    if (existingAction?.status === "applied") {
      return {
        success: true,
        duplicate: true,
        message: existingAction.resultSummary ?? "Aksi ini sudah pernah diproses.",
      };
    }

    const user = await resolveChannelUser(ctx, args.channel, args.providerUserId);
    if (!user) {
      return { success: false, error: "Akun channel belum terhubung ke Perpuskukaan." };
    }

    const now = Date.now();
    const actionId = existingAction?._id ?? await ctx.db.insert("agentActions", {
      channel: args.channel,
      providerUserId: args.providerUserId,
      appUserId: user._id,
      action: "addBookFromAgent",
      idempotencyKey: args.idempotencyKey,
      input: JSON.stringify({
        title: args.title,
        author: args.author,
        isbn: args.isbn,
        category: args.category,
        condition: args.condition,
        mode: args.mode,
      }),
      status: "confirmed",
      resultSummary: undefined,
      resultJson: undefined,
      error: undefined,
      createdAt: now,
      updatedAt: now,
    });

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

    await ctx.db.patch(actionId, {
      status: "applied",
      resultSummary: `Buku ditambahkan: ${args.title}`,
      resultJson: JSON.stringify({ bookId }),
      updatedAt: now,
    });

    await ctx.db.patch(user._id, {
      totalBooksShared: (user.totalBooksShared ?? 0) + 1,
      updatedAt: now,
    });

    return { success: true, duplicate: false, bookId };
  },
});
