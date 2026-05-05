# Web UI

## Overview

Next.js 16 application deployed on Vercel. Reads from Convex in real-time. Better Auth (Google OAuth) for authentication. Tailwind CSS for styling.

## Routes

### Public (unauthenticated)

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/catalog` | Public book catalog with search, filters, grid layout |
| `/catalog/[id]` | Book detail page |
| `/sign-in` | Better Auth sign-in page |
| `/sign-up` | Registration page |
| `/help` | Help/guide page (content from Convex `siteContent` table, key `help-page`) |
| `/reset-password` | Password reset flow |
| `/verify-2fa` | 2FA verification |

### Authenticated

| Route | Purpose |
|-------|---------|
| `/dashboard` | User dashboard with stats, recent activity, public agent actions |
| `/profile` | User profile view/edit, Telegram linking status |
| `/my-books` | User's owned books, add book form |
| `/my-borrows` | User's borrow requests (outgoing), active transactions, return action, incoming requests |
| `/wishlist` | User's wishlisted books |
| `/drop-info` | Drop point locations and info |
| `/settings` | Account settings |
| `/admin` | Admin dashboard (role-based access) |

### API

| Route | Purpose |
|-------|---------|
| `POST /api/public-agent/action` | Signed OpenClaw → Convex bridge |

## Key Features

### Catalog
- Paginated grid (24/page), sorted by creation date
- Full-text search on title and author via Convex search indexes
- Filters: category, language, fiction type, availability status
- Responsive: 1 col (mobile), 2 col (tablet), 3-4 col (desktop)
- Book detail: title, author, ISBN, description, category, condition, cover image, status badge, owner info, reviews

### Add Book
- Form: title, author, category, condition, language, fiction type, cover image
- Creates `books` record with `ownerId = current user`, `status = "available"`, `source = "web"`

### Borrow Request
- Form on book detail: message (optional), duration days (required, 1-90)
- Creates `borrowRequests` with `status = "pending"`, `source = "web"`
- Validates: book must be available, cannot borrow own book

### Return Book
- "Kembalikan" button on active borrows in `/my-borrows`
- Updates `transactions.status = "returned"`, `books.status = "available"`

### Telegram Linking
- Profile page shows Telegram/OpenClaw connection status
- Dashboard shows recent public agent actions from Convex

### Help Page
- Content loaded from `siteContent` table (key: `help-page`)
- Rendered as markdown with headings, lists, bold, italic, links
- Fallback: default help markdown embedded in `siteContent.ts`

### Dashboard Stats
- Total books shared, borrows, lends
- Recent public agent actions

### Admin (`/admin`)
- Role-based access (`role = "admin"` required)
- Stats overview: users, books, transactions, overdue
- Books/users/transactions management tables

## Auth

- Provider: Better Auth (Google OAuth)
- Protected routes redirect to `/sign-in` with return URL
- First user matching `ADMIN_EMAIL` env gets `role = "admin"`

## Files

| File/Dir | Purpose |
|----------|---------|
| `src/app/page.tsx` | Landing page |
| `src/app/(unauth)/catalog/` | Catalog pages |
| `src/app/(unauth)/sign-in/` | Sign in |
| `src/app/(auth)/dashboard/` | Dashboard |
| `src/app/(auth)/profile/` | Profile |
| `src/app/(auth)/my-books/` | My books |
| `src/app/(auth)/my-borrows/` | My borrows |
| `src/app/(auth)/wishlist/` | Wishlist |
| `src/app/(auth)/drop-info/` | Drop points |
| `src/app/(auth)/admin/` | Admin |
| `src/app/help/page.tsx` | Help (markdown renderer) |
| `src/app/api/public-agent/action/route.ts` | Public agent API |
| `src/app/ConvexClientProvider.tsx` | Convex real-time client |
