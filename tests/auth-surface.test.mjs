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

test("profile page explains Telegram/OpenClaw linking state", () => {
  const source = read("src/app/(auth)/profile/page.tsx");

  assert.match(source, /Telegram/);
  assert.match(source, /OpenClaw/);
  assert.match(source, /Hubungkan/);
  assert.match(source, /Terhubung/);
});

test("dashboard shows recent public agent actions", () => {
  const source = read("src/app/(auth)/dashboard/client.tsx");

  assert.match(source, /publicAgentQueries|recentPublicActions|recent public/i);
});

test("publicAgentQueries exposes getRecentPublicActions reading agentActions", () => {
  const source = read("convex/publicAgentQueries.ts");

  assert.match(source, /getRecentPublicActions/);
  assert.match(source, /agentActions/);
  assert.match(source, /telegram/);
});

test("protected pages redirect after sign-out only once Better Auth reports success", () => {
  const protectedHeaders = [
    "src/app/(auth)/layout.tsx",
    "src/app/(auth)/dashboard/client.tsx",
  ].map(read);

  for (const source of protectedHeaders) {
    assert.match(source, /authClient\.signOut\(\s*\{/);
    assert.match(source, /fetchOptions:\s*\{/);
    assert.match(source, /onSuccess:\s*\(\)\s*=>\s*\{/);
    assert.match(source, /window\.location\.replace\("\/sign-in"\)/);
  }
});

test("my-borrows page has borrow form and return button for /pinjam and /kembali parity", () => {
  const source = read("src/app/(auth)/my-borrows/page.tsx");

  // Borrow form (Ajukan Pinjaman)
  assert.match(source, /Ajukan Pinjaman/);
  assert.match(source, /api\.borrowRequests\.create/);
  assert.match(source, /Cari Buku|Ketik judul atau penulis/);
  assert.match(source, /durationDays/);

  // Return button (Kembalikan)
  assert.match(source, /Kembalikan/);
  assert.match(source, /api\.transactions\.markReturned/);
});

test("drop-info page exists with static drop point locations for /drop parity", () => {
  const source = read("src/app/(auth)/drop-info/page.tsx");

  assert.match(source, /Titik Pengembalian/);
  assert.match(source, /MapPin/);
  assert.match(source, /dropPoints/);
});

test("sidebar nav includes drop-info link", () => {
  const source = read("src/app/(auth)/layout.tsx");

  assert.match(source, /\/drop-info/);
  assert.match(source, /Drop Point/);
  assert.match(source, /MapPin/);
});

test("help page exists and uses Convex query for markdown content", () => {
  const pageSource = read("src/app/help/page.tsx");
  const querySource = read("convex/siteContent.ts");

  // Help page fetches from Convex
  assert.match(pageSource, /useQuery/);
  assert.match(pageSource, /api\.siteContent\.getHelpContent/);

  // Help page renders markdown manually (no external lib)
  assert.match(pageSource, /renderMarkdown/);
  assert.match(pageSource, /#{1,6}/);

  // Convex query exists
  assert.match(querySource, /getHelpContent/);
  assert.match(querySource, /siteContent/);
  assert.match(querySource, /help-page/);
  assert.match(querySource, /DEFAULT_HELP_MARKDOWN/);

  // Schema has siteContent table
  const schemaSource = read("convex/schema.ts");
  assert.match(schemaSource, /siteContent.*defineTable/);
  assert.match(schemaSource, /by_key/);
});

test("footer has accessible link to help page", () => {
  const footerSource = read("src/components/footer.tsx");

  assert.match(footerSource, /href="\/help"/);
  assert.match(footerSource, /Petunjuk/);
});

test("middleware allows /help as a public route without auth", () => {
  const middlewareSource = read("src/middleware.ts");

  assert.match(middlewareSource, /publicRoutes/);
  assert.match(middlewareSource, /\/help/);
  assert.match(middlewareSource, /isPublicRoute/);
});
