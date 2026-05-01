import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const LINK_SECRET = process.env.TELEGRAM_BOT_TOKEN || "dev-secret";
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";

function signPayload(data: object): string {
  const payload = JSON.stringify({ ...data, exp: Date.now() + 5 * 60 * 1000 });
  const sig = crypto
    .createHmac("sha256", LINK_SECRET)
    .update(payload)
    .digest("base64url");
  return Buffer.from(payload).toString("base64url") + "." + sig;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Better Auth session (check for session cookie)
    const sessionCookie = request.cookies.get("better-auth.session_token")?.value;
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/sign-in?error=session", WEB_URL));
    }

    // 2. Parse form body
    const form = await request.formData();
    const telegramId = form.get("id") as string;
    const hash = form.get("hash") as string;
    const authDate = parseInt(form.get("auth_date") as string, 10);
    const username = (form.get("username") as string) || "";
    const firstName = (form.get("first_name") as string) || "";

    if (!telegramId || !hash || !authDate) {
      return NextResponse.redirect(new URL("/profile?error=invalid", WEB_URL));
    }

    // 3. Verify auth_date (≤ 5 menit dari auth_date timestamp)
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 300) {
      return NextResponse.redirect(new URL("/profile?error=expired", WEB_URL));
    }

    // 4. Verify HMAC (timing-safe comparison)
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error("TELEGRAM_BOT_TOKEN not set");
      return NextResponse.redirect(new URL("/profile?error=server", WEB_URL));
    }

    const secretKey = crypto.createHash("sha256").update(botToken).digest();

    const dataCheckString = [
      `auth_date=${authDate}`,
      ...(firstName ? [`first_name=${firstName}`] : []),
      `id=${telegramId}`,
      ...(username ? [`username=${username}`] : []),
    ]
      .sort()
      .join("\n");

    const computedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    const isValid =
      computedHash.length === hash.length &&
      crypto.timingSafeEqual(Buffer.from(computedHash, "hex"), Buffer.from(hash, "hex"));

    if (!isValid) {
      return NextResponse.redirect(new URL("/profile?error=invalid", WEB_URL));
    }

    // 5. Sign verified data and store in cookie
    const token = signPayload({ telegramId, username, firstName });

    const response = NextResponse.redirect(new URL("/profile?step=link", WEB_URL));
    response.cookies.set("telegram_link", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 300, // 5 menit
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Telegram link error:", error);
    return NextResponse.redirect(new URL("/profile?error=server", WEB_URL));
  }
}
