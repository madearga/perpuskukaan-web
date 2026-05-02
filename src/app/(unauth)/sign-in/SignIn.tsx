"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export default function SignIn() {
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social(
      {
        provider: "google",
        callbackURL: "https://perpuskukaan-web.vercel.app/dashboard",
      },
      {
        onRequest: () => {
          setGoogleLoading(true);
        },
        onResponse: () => {
          setGoogleLoading(false);
        },
        onError: (ctx) => {
          setGoogleLoading(false);
          alert(ctx.error.message);
        },
      }
    );
  };

  return (
    <Card className="max-w-md">
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
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.2.8 3.9 1.5l2.7-2.7C16.9 2.8 14.7 2 12 2 6.9 2 2.8 6.2 2.8 11.3S6.9 20.7 12 20.7c6.1 0 9.2-4.3 9.2-6.5 0-.4 0-.7-.1-1H12Z"
                />
                <path
                  fill="#34A853"
                  d="M2.8 16.1 6 13.6c.9 1.8 2.8 3.1 6 3.1 3.9 0 5.2-2.6 5.5-3.9H12v-3.9h9.1c.1.3.1.7.1 1 0 2.2-3 6.5-9.2 6.5-4 0-7.3-2.3-9.2-5.7Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6 13.6 2.8 16.1c-.8-1.5-1.2-3.1-1.2-4.8s.4-3.4 1.2-4.8L6 9c-.2.7-.4 1.4-.4 2.3S5.8 12.9 6 13.6Z"
                />
                <path
                  fill="#4285F4"
                  d="M12 5.1c2.1 0 3.5.9 4.3 1.7l3.1-3C17.4 2 14.7 1 12 1 8 1 4.7 3.3 2.8 6.5L6 9c.9-1.8 2.8-3.9 6-3.9Z"
                />
              </svg>
              Sign in with Google
            </>
          )}
        </Button>
      </CardContent>
      <CardFooter>
        <p className="text-center text-xs text-neutral-500">
          Google is the only enabled sign-in method for this project.
        </p>
      </CardFooter>
    </Card>
  );
}
