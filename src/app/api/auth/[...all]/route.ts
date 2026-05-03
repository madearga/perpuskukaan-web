const COOKIE_DOMAIN_RE = /;\s*Domain=[^;]+/gi;

function splitSetCookieHeader(header: string): string[] {
  return header.split(/,(?=\s*[^;,\s]+=)/g).map((cookie) => cookie.trim());
}

function getSetCookieHeaders(headers: Headers): string[] {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] })
    .getSetCookie;

  if (typeof getSetCookie === "function") {
    return getSetCookie.call(headers);
  }

  const header = headers.get("set-cookie");
  return header ? splitSetCookieHeader(header) : [];
}

function rewriteSetCookieForCurrentHost(cookie: string) {
  // Convex/Better Auth may emit Domain=<SITE_URL host>. When the auth route is
  // proxied through Next.js, that can make OAuth state cookies unavailable to
  // the actual browser host. Strip Domain so the browser scopes cookies to the
  // current Next.js host (production domain, custom domain, or localhost).
  return cookie.replace(COOKIE_DOMAIN_RE, "");
}

async function handler(request: Request) {
  const requestUrl = new URL(request.url);
  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

  if (!convexSiteUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_SITE_URL is not set");
  }

  const nextUrl = `${convexSiteUrl}${requestUrl.pathname}${requestUrl.search}`;
  const proxyRequest = new Request(nextUrl, request);
  proxyRequest.headers.set("accept-encoding", "application/json");
  proxyRequest.headers.set("host", new URL(convexSiteUrl).host);

  const response = await fetch(proxyRequest, {
    method: request.method,
    redirect: "manual",
  });

  const headers = new Headers(response.headers);
  const setCookies = getSetCookieHeaders(response.headers);

  if (setCookies.length > 0) {
    headers.delete("set-cookie");
    for (const cookie of setCookies) {
      headers.append("set-cookie", rewriteSetCookieForCurrentHost(cookie));
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const GET = handler;
export const POST = handler;
