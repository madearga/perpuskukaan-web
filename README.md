# Convexbetterkuka

A full-stack authentication app built with Next.js 16, Convex, and Better Auth.

## Getting Started

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd convexbetterkuka
pnpm install
```

### 2. Environment Variables

Create `.env.local`:

```bash
# Convex (auto-generated after first deploy)
CONVEX_DEPLOYMENT=automatic
NEXT_PUBLIC_CONVEX_URL=https://example.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://example.convex.site

# Site URL
SITE_URL=http://localhost:3000

# Better Auth Secret (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=
```

### 3. Set Up Convex Variables

```bash
pnpm convex env set SITE_URL http://localhost:3000
pnpm convex env set BETTER_AUTH_SECRET your-secret
```

### 4. Run

```bash
pnpm dev
```

## Tech Stack

- **Next.js 16** (App Router + Turbopack) - React 19
- **Convex** - Real-time backend database
- **Better Auth** - Authentication (email, OAuth, 2FA)
- **Tailwind CSS v4** + **Radix UI**
- **TypeScript**

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Protected routes
│   │   ├── dashboard/
│   │   ├── settings/
│   │   ├── documentation/
│   │   └── api-reference/
│   ├── (unauth)/        # Public auth routes
│   │   ├── sign-in/
│   │   ├── sign-up/
│   │   └── verify-2fa/
│   └── api/auth/        # Auth API route
├── components/
├── lib/
│   ├── auth.ts
│   └── auth-client.ts
└── proxy.ts

convex/
├── auth.ts              # Better Auth + Convex integration
├── auth.config.ts       # Auth domain config
├── schema.ts            # Database schema
├── http.ts              # HTTP routes
└── emails/              # Email templates
```

## License

MIT
