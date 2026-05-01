import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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
