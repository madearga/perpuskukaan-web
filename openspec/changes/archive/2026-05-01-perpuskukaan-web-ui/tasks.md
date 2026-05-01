## 1. Project Setup & Schema

- [x] 1.1 Connect Convex to `prod:watchful-rook-105` deployment (set `.env.local` with `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`)
- [x] 1.2 Inspect existing `users` table in `prod:watchful-rook-105` to understand current bot schema
- [x] 1.3 Design merged schema: add new optional fields to `users` (`email` required for Better Auth, `telegramId` optional, `role`, `linkedUserIds`, stats), new tables (`books`, `borrowRequests`, `transactions`, `reviews`, `wishlist`)
- [x] 1.4 Test schema push in staging branch first, verify bot still works
- [x] 1.5 Push schema to production deployment and verify tables appear in dashboard
- [x] 1.6 Remove boilerplate `todos` references from auth sync functions (`convex/users.ts`)
- [x] 1.7 Update `convex/auth.ts` to create Perpuskukaan-compatible user on registration (include `role = "user"`, stats defaults, timestamps). Use `ADMIN_EMAIL` env var for first admin seeding
- [x] 1.8 Update `package.json` name and description to `perpuskukaan-web`
- [x] 1.9 Add `ADMIN_EMAIL` to Convex environment variables

## 2. Convex Data Layer

- [x] 2.1 Migrate bot's `convex/books.ts` functions into project (add, search, getMyBooks, getById, updateStatus)
- [x] 2.2 Add `books.list` — paginated query with optional filters (category, language, fictionType, status)
- [x] 2.3 Add `books.getStats` — aggregate counts by status and category
- [x] 2.4 Add `books.addFromWeb` — mutation for web-initiated book creation
- [x] 2.5 Add `users.getProfile` — query returning user with computed stats
- [x] 2.6 Add `users.updateProfile` — mutation for bio, phone, location, avatar
- [x] 2.7 Add `users.getAll` — admin query, paginated user list
- [x] 2.8 Add `borrowRequests.create` — web borrow request with `source = "web"`, auto-resolve lenderId from book owner
- [x] 2.9 Add `borrowRequests.getByBorrower` — my requests, grouped by status
- [x] 2.10 Add `borrowRequests.getByLender` — incoming requests for my books
- [x] 2.11 Add `borrowRequests.accept` — update request, create transaction, update book status
- [x] 2.12 Add `borrowRequests.reject` — update request with optional reason
- [x] 2.13 Add `transactions.getActive` — active borrows for a user (borrower or lender)
- [x] 2.14 Add `transactions.getOverdue` — all overdue active transactions
- [x] 2.15 Add `transactions.getAll` — admin paginated query with status filter
- [x] 2.16 Add `transactions.markReturned` — admin action to close transaction
- [x] 2.17 Add `reviews.getByBook` — all reviews for a book with reviewer info
- [x] 2.18 Add `wishlist.getByUser` — user's wishlist with book status
- [x] 2.19 Add `wishlist.toggle` — add/remove wishlist entry (idempotent)

## 3. Public Catalog Pages

- [x] 3.1 Replace landing page (`src/app/page.tsx`) — redirect to `/catalog` or `/sign-in` based on auth
- [x] 3.2 Build catalog page (`src/app/(unauth)/catalog/page.tsx`) — grid layout, search bar, filter sidebar (category, language, fiction type), pagination
- [x] 3.3 Build book card component — cover image, title, author, category badge, status badge, wishlist heart
- [x] 3.4 Build book detail page (`src/app/(unauth)/catalog/[id]/page.tsx`) — full info, owner card, reviews section, borrow CTA
- [x] 3.5 Build filter bar component — dropdowns for category/language/fictionType, active filter chips, reset button
- [x] 3.6 Build search component — debounced input calling `books.search`
- [x] 3.7 Ensure all catalog pages are responsive (1-col mobile, 2-col tablet, 3-4 col desktop)

## 4. Auth & User Pages

- [x] 4.1 Update sign-up page — add name field alongside email/password
- [x] 4.2 Build user dashboard (`src/app/(auth)/dashboard/page.tsx`) — stat cards (my books, active borrows, pending requests), recent activity
- [x] 4.3 Build profile page (`src/app/(auth)/profile/page.tsx`) — view/edit bio, phone, location, avatar URL
- [x] 4.4 Build my books page (`src/app/(auth)/my-books/page.tsx`) — owned books with status, "Tambah Buku" button
- [x] 4.5 Build add book form — modal or page with fields: title, author, ISBN, description, category, condition, language, fiction type
- [x] 4.6 Build my borrows page (`src/app/(auth)/my-borrows/page.tsx`) — tabs: "Permintaan Saya" (outgoing), "Sedang Dipinjam" (active), "Permintaan Masuk" (incoming for my books)
- [x] 4.7 Build borrow request form — message textarea, duration days input, submit
- [x] 4.8 Build wishlist page (`src/app/(auth)/wishlist/page.tsx`) — wishlisted books with current availability
- [x] 4.9 Build auth layout — sidebar nav with: Dashboard, Katalog, Buku Saya, Pinjaman, Wishlist, Profil
- [x] 4.10 Build protected route guard — redirect to `/sign-in` if not authenticated

## 5. Admin Dashboard

- [x] 5.1 Build admin layout (`src/app/(auth)/admin/layout.tsx`) — admin sidebar: Overview, Buku, User, Transaksi
- [x] 5.2 Build admin overview page (`src/app/(auth)/admin/page.tsx`) — stat cards (total users, books, available, lent, active transactions, overdue, pending requests)
- [x] 5.3 Build admin books page (`src/app/(auth)/admin/books/page.tsx`) — table with sort/pagination, status dropdown for quick update
- [x] 5.4 Build admin users page (`src/app/(auth)/admin/users/page.tsx`) — table with user info, click for detail view
- [x] 5.5 Build admin transactions page (`src/app/(auth)/admin/transactions/page.tsx`) — table with status filters, overdue highlight, "Tandai Dikembalikan" action
- [x] 5.6 Build admin role guard — redirect non-admin users away from `/admin/*`

## 6. Error Handling & Resilience

- [x] 6.1 Add global error boundary component for unexpected errors
- [x] 6.2 Add Convex query error handling (retry logic, offline state, timeout handling)
- [x] 6.3 Add loading skeletons for all catalog and dashboard pages
- [x] 6.4 Add empty states for all list views (no books, no borrows, no results)
- [x] 6.5 Add toast notification system for success/error feedback
- [x] 6.6 Add rate limiting on public catalog endpoints (Convex rate limit or Vercel edge config)

## 7. Testing

- [x] 7.1 Add Convex query unit tests for `books.list`, `books.search`, `users.getProfile`
- [x] 7.2 Add integration test for borrow request flow (create → accept → transaction)
- [x] 7.3 Add admin auth guard tests (non-admin cannot access admin routes)
- [x] 7.4 Add bot regression smoke test: verify existing bot queries still work after schema changes
- [x] 7.5 Add manual test checklist for catalog, auth, borrowing, admin flows

## 8. Deploy

- [x] 8.1 Push code to `github.com/madearga/perpuskukaan-web`
- [x] 8.2 Create Vercel project linked to the repo
- [x] 8.3 Set environment variables in Vercel (CONVEX_DEPLOYMENT, NEXT_PUBLIC_CONVEX_URL, BETTER_AUTH_SECRET, SITE_URL, ADMIN_EMAIL)
- [x] 8.4 Verify first deploy succeeds and catalog loads with bot data
- [x] 8.5 Verify bot still works normally (no regression test)
