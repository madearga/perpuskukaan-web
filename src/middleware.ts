import { NextRequest, NextResponse } from "next/server";

const signInRoutes = ["/sign-in"];

// In-memory rate limiter (per IP)
const rateLimit = new Map<string, number[]>();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 3;

export default async function middleware(request: NextRequest) {
  // ====== RATE LIMITING: POST /api/auth/telegram ======
  if (
    request.method === "POST" &&
    request.nextUrl.pathname === "/api/auth/telegram"
  ) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const now = Date.now();
    const attempts = rateLimit.get(ip) || [];
    const recent = attempts.filter((t) => now - t < WINDOW_MS);

    if (recent.length >= MAX_REQUESTS) {
      return NextResponse.redirect(
        new URL("/profile?error=rate_limited", request.url)
      );
    }

    recent.push(now);
    rateLimit.set(ip, recent);
  }

  // ====== AUTH BYPASS — original logic disabled ======
  // TODO: re-enable after auth config
  // const { getSessionCookie } = await import("better-auth/cookies");
  // const sessionCookie = getSessionCookie(request);
  // const isSignInRoute = signInRoutes.includes(request.nextUrl.pathname);
  //
  // if (isSignInRoute && !sessionCookie) {
  //   return NextResponse.next();
  // }
  //
  // if (!isSignInRoute && !sessionCookie) {
  //   return NextResponse.redirect(new URL("/sign-in", request.url));
  // }
  //
  // if (isSignInRoute || request.nextUrl.pathname === "/") {
  //   return NextResponse.redirect(new URL("/dashboard", request.url));
  // }

  // Bypass: only redirect root to /dashboard, pass everything else through
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next|api/auth).*)", "/", "/trpc(.*)"],
};
