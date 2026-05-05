import { query } from "./_generated/server";

export const getRecentPublicActions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("agentActions")
      .withIndex("by_channel_user", (q) => q.eq("channel", "telegram"))
      .order("desc")
      .take(10);
  },
});
