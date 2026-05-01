## Context

Perpuskukaan is a P2P book-sharing community running on Telegram via OpenClaw bot (`@Perpuskukaanbot`). All data lives in Convex deployment `prod:watchful-rook-105` with 6 tables: `users`, `books`, `borrowRequests`, `transactions`, `reviews`, `wishlist`. The bot handles all book sharing via Telegram commands.

The web UI is forked from `convexbetterkuka` — a Next.js 16 + Convex + Better Auth boilerplate. Current schema has only `users` (email) + `todos`. This must be replaced with the full Perpuskukaan schema and connected to the bot's Convex deployment.

## Goals / Non-Goals

**Goals:**
- Public catalog: anyone can browse, search, and filter books without login
- User auth: email/password registration via Better Auth, with profile management
- Book borrowing: authenticated users can request to borrow books from the web
- Admin dashboard: stats, transaction monitoring, user/book management
- Real-time sync: changes from Telegram bot appear instantly in web UI
- Deploy to Vercel with zero ops overhead

**Non-Goals:**
- Telegram OAuth login on web (Phase 2)
- Linking Telegram and web user accounts (Phase 2)
- Modifying the Telegram bot behavior or OpenClaw config
- Push notifications or email alerts (Phase 2)
- Book cover image upload (use URL only for MVP)
- Mobile native app

## Decisions

### D1: Single Convex deployment, additive schema
Both bot and web connect to `prod:watchful-rook-105`. Schema changes are additive — new optional fields and new tables only. Existing bot queries/mutations are untouched.

**Migration path:**
1. Inspect existing `users` table in `prod:watchful-rook-105` (currently has `telegramId` required, no `email`)
2. Add `email`, `role`, `avatar`, `phone`, `location`, `bio`, `reputation`, `totalBooksShared`, `totalBorrows`, `totalLends`, `isVerified`, `linkedUserIds` as **optional** fields
3. Keep `telegramId` as optional (existing Telegram users keep it; new web users leave it null)
4. Add `linkedUserIds` array for future account linking
5. Test schema push in a separate branch/deployment first
6. Verify bot functions still work after push

**Constraint:** Never change a required field to optional or vice versa on existing tables. Only add new optional fields.

### D2: Dual identity in users table
`users` table supports both `email` (Better Auth / web, **required** for Better Auth compatibility) and `telegramId` (bot, **optional**). Web users have `email` populated by Better Auth, `telegramId` null. Telegram users have `telegramId` populated by bot, `email` null (or placeholder). Account linking is Phase 2.

**Better Auth compatibility:** `email` must remain `v.string()` (required) per `@convex-dev/better-auth` expectations. For Telegram-only users, store `email` as `"telegram-{telegramId}@perpuskukaan.local"` or use a separate `profiles` table. Decision: keep `email` required, use placeholder for Telegram users.

### D3: Better Auth for web authentication
Use the existing `@convex-dev/better-auth` integration from the boilerplate. Email/password + optional OAuth providers. The `auth.config.ts` and `auth.ts` are already wired up — just need schema alignment.

### D4: shadcn/ui for all components
Use the existing shadcn/ui setup from the boilerplate. Consistent design system, accessible, dark mode support out of the box via next-themes.

### D5: Public catalog is unauthenticated
Catalog browsing, search, and book detail pages are accessible without login. Login required only for borrowing, profile, and admin actions.

### D6: Admin role via user field
Add `role` field to `users` table (`"user"` | `"admin"`). **Admin seeding via env var:** Set `ADMIN_EMAIL` in Convex environment variables. On first registration, if `user.email === ADMIN_EMAIL`, set `role = "admin"`. Otherwise `role = "user"`. Subsequent admin promotions via Convex dashboard or admin-to-admin invitation. Admin routes check role client-side + server-side.

### D7: Borrow requests from web tagged with source
New borrow requests include `source: "web"` to distinguish from Telegram-initiated requests. Bot and web both see the same requests.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Schema push to shared Convex might break bot | Additive-only changes; test in Convex dashboard before deploying web |
| Better Auth creates internal tables that may conflict | `@convex-dev/better-auth` uses its own component tables; they don't clash with app tables |
| Two identity systems (email vs telegramId) cause user confusion | Accept for MVP; add account linking in Phase 2 |
| Convex free tier limits (read/write ops) | Monitor usage; add pagination to all list queries |
| No image upload — cover images are URLs only | Acceptable for MVP; users can paste image URLs or leave blank |
