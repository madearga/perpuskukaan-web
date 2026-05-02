import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { crossDomainClient } from "@convex-dev/better-auth/client/plugins";
import type { authWithoutCtx } from "@/lib/auth";

// Type mismatch between @convex-dev/better-auth@0.9.11 and better-auth@1.3.34
// on the crossDomainClient plugin — cast to any to bypass, runtime works correctly
export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof authWithoutCtx>(),
    convexClient(),
    crossDomainClient() as any,
  ],
} as any);
