import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getExistingAction = query({
  args: { idempotencyKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentActions")
      .withIndex("by_idempotency_key", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey)
      )
      .first();
  },
});

export const createAgentAction = mutation({
  args: {
    channel: v.string(),
    providerUserId: v.string(),
    appUserId: v.optional(v.id("users")),
    action: v.string(),
    idempotencyKey: v.string(),
    input: v.string(),
    status: v.union(v.literal("drafted"), v.literal("confirmed")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agentActions")
      .withIndex("by_idempotency_key", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey)
      )
      .first();

    if (existing) {
      return { success: true, duplicate: true, actionId: existing._id, existing };
    }

    const now = Date.now();
    const actionId = await ctx.db.insert("agentActions", {
      channel: args.channel,
      providerUserId: args.providerUserId,
      appUserId: args.appUserId,
      action: args.action,
      idempotencyKey: args.idempotencyKey,
      input: args.input,
      status: args.status,
      resultSummary: undefined,
      resultJson: undefined,
      error: undefined,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, duplicate: false, actionId };
  },
});

export const completeAgentAction = mutation({
  args: {
    actionId: v.id("agentActions"),
    resultSummary: v.string(),
    resultJson: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.actionId, {
      status: "applied",
      resultSummary: args.resultSummary,
      resultJson: args.resultJson,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const failAgentAction = mutation({
  args: {
    actionId: v.id("agentActions"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.actionId, {
      status: "failed",
      error: args.error,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
