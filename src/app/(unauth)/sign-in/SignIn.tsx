"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function SignIn() {
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);

    // Use popup approach: open Convex auth URL directly
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || "https://watchful-rook-105.convex.site";
    const callbackURL = `${window.location.origin}/dashboard`;

    // Build auth URL manually
    const authUrl = `${convexUrl}/api/auth/sign-in/social?provider=google&callbackURL=${encodeURIComponent(callbackURL)}`;

    const popup = window.open(
      authUrl,
      "google-oauth",
      `width=${width},height=${height},left=${left},top=${top},popup=1`
    );

    if (!popup) {
      setGoogleLoading(false);
      alert("Popup blocked. Please allow popups for this site.");
      return;
    }

    // Poll for popup close or redirect
    const checkPopup = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopup);
        setGoogleLoading(false);
        // Refresh page to pick up auth state
        window.location.reload();
      }

      try {
        const popupUrl = popup.location.href;
        if (popupUrl.includes(window.location.origin + "/dashboard")) {
          clearInterval(checkPopup);
          popup.close();
          setGoogleLoading(false);
          window.location.href = "/dashboard";
        }
      } catch {
        // Cross-origin, can't read URL yet
      }
    }, 500);
  };

  return (
    <Card className="max-w-md mx-auto mt-20">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Sign In</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Continue with your Google account to access the dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          type="button"
          className="w-full"
          disabled={googleLoading}
          onClick={handleGoogleSignIn}
        >
          {googleLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.2.8 3.9 1.5l2.7-2.7C16.9 2.8 14.7 2 12 2 6.9 2 2.8 6.2 2.8 11.3S6.9 20.7 12 20.7c6.1 0 9.2-4.3 9.2-6.5 0-.4 0-.7-.1-1H12Z" />
                <path fill="#34A853" d="M2.8 16.1 6 13.6c.9 1.8 2.8 3.1 6 3.1 3.9 0 5.2-2.6 5.5-3.9H12v-3.9h9.1c.1.3.1.7.1 1 0 2.2-3 6.5-9.2 6.5-4 0-7.3-2.3-9.2-5.7Z" />
                <path fill="#FBBC05" d="M6 13.6 2.8 16.1c-.8-1.5-1.2-3.1-1.2-4.8s.4-3.4 1.2-4.8L6 9c-.2.7-.4 1.4-.4 2.3S5.8 12.9 6 13.6Z" />
                <path fill="#4285F4" d="M12 5.1c2.1 0 3.5.9 4.3 1.7l3.1-3C17.4 2 14.7 1 12 1 8 1 4.7 3.3 2.8 6.5L6 9c.9-1.8 2.8-3.9 6-3.9Z" />
              </svg>
              Sign in with Google
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
