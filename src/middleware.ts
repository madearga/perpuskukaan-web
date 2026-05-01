import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// In-memory rate limiter (per IP)
const rateLimit = new Map<string, number[]>();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 3;

export function middleware(request: NextRequest) {
  // Only rate limit POST to /api/auth/telegram
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

  return NextResponse.next();
}

export const config = {
  matcher: "/api/auth/telegram",
};
