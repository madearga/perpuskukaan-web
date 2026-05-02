import {
  inferAdditionalFields,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import type { authWithoutCtx } from "@/lib/auth";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_CONVEX_SITE_URL || "https://watchful-rook-105.convex.site",
  fetchOptions: {
    credentials: "include",
  },
  plugins: [
    inferAdditionalFields<typeof authWithoutCtx>(),
    convexClient(),
  ],
});
