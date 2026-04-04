import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/next-theme/theme-provider";
import { Footer } from "@/components/footer";

import { ConvexClientProvider } from "./ConvexClientProvider";

export const metadata: Metadata = {
  title: "Convexbetterkuka",
  description: "Convexbetterkuka - Full-stack authentication app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-[calc(100vh-2rem)] flex flex-col gap-4 antialiased"
      >
         <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ConvexClientProvider>
            <main className=" px-2 md:px-4 grow flex flex-col">
            
              {children}
            </main>
            <Footer />
            </ConvexClientProvider>
            
          </ThemeProvider>
      </body>
    </html>
  );
}
