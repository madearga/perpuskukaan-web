"use client";

import { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
