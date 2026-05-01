import "./polyfills";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { betterAuthComponent } from "./auth";
import { createAuth } from "../src/lib/auth";

const http = httpRouter();

// Register Better Auth routes with CORS enabled
betterAuthComponent.registerRoutes(http, createAuth as any, {
  cors: {
    allowedOrigins: [
      "https://perpuskukaan-web.vercel.app",
      "http://localhost:3000",
    ],
  },
});

// Telegram Login Widget — GET handler renders confirmation page
http.route({
  path: "/api/link-telegram",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id") || "";
    const hash = url.searchParams.get("hash") || "";
    const authDate = url.searchParams.get("auth_date") || "";
    const username = url.searchParams.get("username") || "";
    const firstName = url.searchParams.get("first_name") || "";

    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hubungkan Telegram — Perpuskukaan</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 400px; margin: 60px auto; padding: 20px; text-align: center; }
    .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; }
    h1 { font-size: 20px; margin-bottom: 8px; }
    p { color: #6b7280; margin-bottom: 24px; }
    .username { font-weight: 600; color: #111; }
    button { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer; width: 100%; }
    button:hover { background: #1d4ed8; }
    .cancel { display: block; margin-top: 12px; color: #6b7280; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Hubungkan Telegram</h1>
    <p>Hubungkan akun Telegram <span class="username">@${username || firstName || id}</span> ke akun Perpuskukaan kamu?</p>
    <form action="${webUrl}/api/auth/telegram" method="POST">
      <input type="hidden" name="id" value="${id}">
      <input type="hidden" name="hash" value="${hash}">
      <input type="hidden" name="auth_date" value="${authDate}">
      <input type="hidden" name="username" value="${username}">
      <input type="hidden" name="first_name" value="${firstName}">
      <button type="submit">Ya, Hubungkan</button>
    </form>
    <a href="${webUrl}/profile" class="cancel">Batal</a>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }),
});

export default http;
