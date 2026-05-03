import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { convexClient, crossDomainClient } from "@convex-dev/better-auth/client/plugins";
import type { authWithoutCtx } from "@/lib/auth";

// crossDomainClient is required by ConvexBetterAuthProvider for OTT verification
// and session storage via localStorage. Cookie domain is handled by the proxy.
export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof authWithoutCtx>(),
    convexClient(),
    crossDomainClient() as any,
  ],
} as any);
