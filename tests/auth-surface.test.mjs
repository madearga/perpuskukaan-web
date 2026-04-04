import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("server auth keeps secure defaults and only configures Google sign-in", () => {
  const authSource = read("src/lib/auth.ts");

  assert.match(authSource, /disableCSRFCheck:\s*false/);
  assert.match(
    authSource,
    /useSecureCookies:\s*process\.env\.NODE_ENV === "production"/
  );
  assert.match(authSource, /google:\s*\{/);
  assert.doesNotMatch(authSource, /github:\s*\{/);
  assert.doesNotMatch(authSource, /emailAndPassword:\s*\{/);
  assert.doesNotMatch(authSource, /anonymous\(/);
  assert.doesNotMatch(authSource, /magicLink\(/);
  assert.doesNotMatch(authSource, /emailOTP\(/);
  assert.doesNotMatch(authSource, /genericOAuth\(/);
  assert.doesNotMatch(authSource, /twoFactor\(/);
});

test("client auth surface is reduced to Google-only entry points", () => {
  const authClientSource = read("src/lib/auth-client.ts");
  const signInSource = read("src/app/(unauth)/sign-in/SignIn.tsx");
  const signInPageSource = read("src/app/(unauth)/sign-in/page.tsx");
  const signUpPageSource = read("src/app/(unauth)/sign-up/page.tsx");
  const settingsSource = read("src/app/(auth)/settings/page.tsx");

  assert.match(signInSource, /provider:\s*"google"/);
  assert.match(signInSource, /Sign in with Google/);
  assert.doesNotMatch(authClientSource, /anonymousClient\(\)/);
  assert.doesNotMatch(authClientSource, /magicLinkClient\(\)/);
  assert.doesNotMatch(authClientSource, /emailOTPClient\(\)/);
  assert.doesNotMatch(authClientSource, /twoFactorClient\(\)/);
  assert.doesNotMatch(authClientSource, /genericOAuthClient\(\)/);
  assert.doesNotMatch(signInSource, /authClient\.signIn\.email\(/);
  assert.doesNotMatch(signInSource, /authClient\.signIn\.magicLink\(/);
  assert.doesNotMatch(signInSource, /authClient\.emailOtp\.sendVerificationOtp\(/);
  assert.doesNotMatch(signInSource, /authClient\.signIn\.anonymous\(/);
  assert.doesNotMatch(signInSource, /provider:\s*"github"/);
  assert.doesNotMatch(signInSource, /providerId:\s*"slack"/);
  assert.doesNotMatch(signInSource, /Send Magic Link/);
  assert.doesNotMatch(signInSource, /Sign in anonymously/);
  assert.doesNotMatch(signInPageSource, /href="\/sign-up"/);
  assert.match(signUpPageSource, /redirect\("\/sign-in"\)/);
  assert.doesNotMatch(settingsSource, /Enable 2FA/);
});

test("protected pages redirect after sign-out only once Better Auth reports success", () => {
  const protectedHeaders = [
    "src/app/(auth)/dashboard/client.tsx",
    "src/app/(auth)/documentation/client.tsx",
    "src/app/(auth)/api-reference/client.tsx",
  ].map(read);

  for (const source of protectedHeaders) {
    assert.match(source, /authClient\.signOut\(\s*\{/);
    assert.match(source, /fetchOptions:\s*\{/);
    assert.match(source, /onSuccess:\s*\(\)\s*=>\s*\{/);
    assert.match(source, /window\.location\.replace\("\/sign-in"\)/);
  }
});
