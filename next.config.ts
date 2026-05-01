import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  reactCompiler: true,
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "better-auth",
      "@convex-dev/better-auth",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-slot",
      "@react-email/components",
      "sonner",
      "vaul",
      "class-variance-authority",
      "convex",
      "convex-helpers",
    ],
  },
  /* config options here */
  images: {
    dangerouslyAllowSVG: true, // This allows SVG usage
    remotePatterns: [
      {
        protocol: "https", // Or 'http' if that's what your URLs use
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**", // Allows any path under this hostname
      },
      {
        protocol: "https", // Or 'http' if that's what your URLs use
        hostname: "utfs.io",
        port: "",
        pathname: "/a/uy24lm300a/**", // Allows any path under this hostname
      },
      {
        protocol: "https", // Or 'http' if that's what your URLs use
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/**", // Allows any path under this hostname
      }
      // You can add other hostnames here if needed
      // Example:
      // {
      //   protocol: 'https',
      //   hostname: 'another-image-provider.com',
      //   port: '',
      //   pathname: '/**',
      // },
    ],
  },
};

// Custom webpack config to optimize chunk splitting
import type { NextConfig } from "next";

const origConfig = { ...nextConfig };

export default {
  ...origConfig,
  webpack(config: any, { isServer }: { isServer: boolean }) {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization?.splitChunks,
          cacheGroups: {
            ...config.optimization?.splitChunks?.cacheGroups,
            betterAuth: {
              test: /[\\/]node_modules[\\/](better-auth|@better-fetch)[\\/]/,
              name: 'better-auth',
              priority: 20,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
} satisfies NextConfig;
