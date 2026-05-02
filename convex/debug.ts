import { query } from "./_generated/server";

export const debugEnv = query({
  args: {},
  handler: async (ctx) => {
    return {
      siteUrl: process.env.SITE_URL || "NOT_SET",
      googleClientId: process.env.GOOGLE_CLIENT_ID ? "SET_LEN_" + (process.env.GOOGLE_CLIENT_ID?.length || 0) : "NOT_SET",
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? "SET_LEN_" + (process.env.GOOGLE_CLIENT_SECRET?.length || 0) : "NOT_SET",
      betterAuthSecret: process.env.BETTER_AUTH_SECRET ? "SET_LEN_" + (process.env.BETTER_AUTH_SECRET?.length || 0) : "NOT_SET",
      nodeEnv: process.env.NODE_ENV || "NOT_SET",
    };
  },
});
