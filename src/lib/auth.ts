import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth, BetterAuthOptions } from "better-auth";
import { betterAuthComponent } from "../../convex/auth";
import {
  QueryCtx,
  MutationCtx,
  ActionCtx,
} from "../../convex/_generated/server";
import { internal } from "../../convex/_generated/api";

type GenericCtx = QueryCtx | MutationCtx | ActionCtx;
import { asyncMap } from "convex-helpers";

// Split out options so they can be passed to the convex plugin
const createOptions = (ctx: GenericCtx) => {
  const siteUrl = process.env.SITE_URL || "http://localhost:3000";
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  console.log("[auth] googleEnabled:", googleEnabled, "CLIENT_ID:", !!process.env.GOOGLE_CLIENT_ID, "CLIENT_SECRET:", !!process.env.GOOGLE_CLIENT_SECRET, "SITE_URL:", siteUrl);

  return {
    baseURL: siteUrl,
    database: betterAuthComponent.adapter(ctx as any),
    secret: process.env.BETTER_AUTH_SECRET,
    advanced: {
      disableCSRFCheck: true,
      useSecureCookies: process.env.NODE_ENV === "production",
      crossSubDomainCookies: {
        enabled: true,
      },
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
      },
    },
    trustedOrigins: [
      "https://perpuskukaan-web.vercel.app",
      "http://localhost:3000",
    ],
    account: {
      accountLinking: {
        enabled: true,
        allowDifferentEmails: true,
      },
    },
    socialProviders: {
      ...(googleEnabled
        ? {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID as string,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
              accessType: "offline",
              prompt: "select_account consent",
            },
          }
        : {}),
    },
    user: {
      // This field is available in the `onCreateUser` hook from the component,
      // but will not be committed to the database. Must be persisted in the
      // hook if persistence is required.
      additionalFields: {
        foo: {
          type: "string",
          required: false,
        },
      },
      deleteUser: {
        enabled: true,
      },
    },
    plugins: [],
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            if ("runMutation" in ctx) {
              await ctx.runMutation(internal.users.syncUserCreation, {
                email: user.email,
              });
            } else if ("db" in ctx) {
              const now = Date.now();
              await (ctx as MutationCtx).db.insert("users", {
                email: user.email,
                role: "user",
                linkedUserIds: [],
                createdAt: now,
                updatedAt: now,
              });
            }
          },
        },
        delete: {
          after: async (user) => {
            if ("runMutation" in ctx) {
              await ctx.runMutation(internal.users.syncUserDeletion, {
                email: user.email,
              });
            } else if ("db" in ctx) {
              const mutationCtx = ctx as MutationCtx;
              const appUser = await mutationCtx.db
                .query("users")
                .withIndex("email", (q) => q.eq("email", user.email))
                .first();

              if (appUser) {
                await mutationCtx.db.delete(appUser._id);
              }
            }
          },
        },
      },
    },
  } satisfies BetterAuthOptions;
};

export const createAuth = (ctx: GenericCtx) => {
  const options = createOptions(ctx);
  return betterAuth({
    ...options,
    plugins: [
      ...options.plugins,
      // Pass in options so plugin schema inference flows through. Only required
      // for plugins that customize the user or session schema.
      // See "Some caveats":
      // https://www.better-auth.com/docs/concepts/session-management#customizing-session-response
      convex(),
    ],
  });
};

// Mostly for inferring types from Better Auth options
export const authWithoutCtx = createAuth({} as any);
