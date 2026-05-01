## Why

Perpuskukaan bot (@Perpuskukaanbot) manages a P2P book-sharing community via Telegram + OpenClaw, with all data in Convex (`prod:watchful-rook-105`). Currently the only interface is Telegram — no way to browse the catalog, view book details, or manage transactions from a browser. A web UI is needed for public discovery (anyone can browse books), user self-service (profile, borrowing), and admin oversight (dashboard, transaction management).

This project forks the existing `convexbetterkuka` boilerplate (Next.js 16 + Convex + Better Auth) and connects it to the same Convex deployment as the Telegram bot, so both interfaces share one real-time database.

## What Changes

- Replace boilerplate Convex schema (`users` + `todos`) with the full Perpuskukaan schema (`users`, `books`, `borrowRequests`, `transactions`, `reviews`, `wishlist`) that mirrors the bot's data model
- Extend the `users` table to support both Better Auth (email) and Telegram (telegramId) identity fields
- Add 20+ Convex queries/mutations for catalog browsing, borrow requests, user profiles, wishlist, and admin stats
- Build public catalog pages (grid view, search with filters, book detail with owner info and reviews)
- Build authenticated user pages (profile, my books, my borrows, wishlist, borrow request flow)
- Build admin dashboard (stats overview, books/users/transactions management)
- Deploy to Vercel connected to the shared Convex deployment

## Capabilities

### New Capabilities
- `book-catalog`: Public browsing, search, and filtering of books with detail pages showing owner info, status, and reviews
- `book-borrowing`: Authenticated users can request to borrow books from the web, with request tracking and status updates
- `user-profiles`: User registration/login via Better Auth, profile editing, book collection view, borrowing history, and Telegram account linking
- `admin-dashboard`: Admin-only dashboard with stats overview, book/user/transaction management, and overdue monitoring
- `convex-data-layer`: Shared Convex queries and mutations for all web UI operations, connecting to the same deployment as the Telegram bot

### Modified Capabilities
<!-- No existing specs to modify — this is a greenfield fork -->

## Impact

- **Convex deployment**: Schema push to `prod:watchful-rook-105` (shared with bot) — additive only, no breaking changes to existing bot functions
- **Dependencies**: Adds shadcn/ui components, Better Auth user sync, Convex search/pagination helpers
- **Repo**: Forked from `madearga/convexbetterkuka` → `madearga/perpuskukaan-web`
- **Bot compatibility**: All existing bot Convex functions (`books.add`, `books.search`, etc.) remain untouched; new queries are additive
- **User identity**: Two identity systems (Telegram + email) coexist in the same `users` table; linking is Phase 2
