import { NextRequest, NextResponse } from "next/server";
// import { getSessionCookie } from "better-auth/cookies"; // TODO: re-enable after auth config

const signInRoutes = ["/sign-in"];

export default async function proxy(request: NextRequest) {
  // ====== AUTH DISABLED — original logic commented out ======
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
  //   return NextResponse.redirect(
  //     new URL("/dashboard", request.url),
  //   );
  // }
  //
  // return NextResponse.next();
  // ====== END AUTH DISABLED ======

  // Bypass: only redirect root to dashboard, pass everything else through
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Run middleware on all routes except static assets and api routes
  matcher: ["/((?!.*\\..*|_next|api/auth).*)", "/", "/trpc(.*)"],
};
