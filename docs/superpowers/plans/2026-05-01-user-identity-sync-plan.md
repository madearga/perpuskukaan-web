# Implementation Plan: User Identity Sync (Telegram ↔ Web)

## Source Spec
`docs/superpowers/specs/2026-05-01-user-identity-sync-design.md`

## Overview
Implement Telegram Login Widget integration untuk sinkronisasi identitas antara Telegram bot (OpenClaw) dan Web UI (Next.js + Google Sign-in).

## Prerequisites
- [ ] Bot domain sudah di-set di @BotFather
- [ ] `TELEGRAM_BOT_TOKEN` tersedia
- [ ] Vercel project sudah deploy

---

## Phase 1: Schema & Migration (Foundation)

### Task 1.1: Add `isActive` field to users schema
**File:** `convex/schema.ts`
**What:** Tambah `isActive: v.optional(v.boolean())` ke users table.
**Depends on:** Nothing
**Estimate:** 10 min
**Acceptance:** Schema push ke Convex berhasil, no errors.

### Task 1.2: Add `by_reviewer` index to reviews table
**File:** `convex/schema.ts`
**What:** Tambah `.index("by_reviewer", ["reviewerId"])` ke reviews table.
**Depends on:** Nothing
**Estimate:** 5 min
**Acceptance:** Schema push berhasil.

### Task 1.3: Update `syncUserCreation` to set `isActive: true`
**File:** `convex/users.ts`
**What:** Update `syncUserCreation` hook — tambah `isActive: true` saat insert user.
**Depends on:** Nothing
**Estimate:** 5 min
**Acceptance:** User baru yang dibuat via Better Auth punya `isActive: true`.

### Task 1.4: Create migration action for existing users
**File:** `convex/users.ts` (temporary)
**What:** Buat one-shot `internalAction` yang set `isActive = true` untuk semua user existing.
**Depends on:** Task 1.1
**Estimate:** 15 min
**Acceptance:** Setelah di-run, semua user punya `isActive: true`.

### Task 1.5: Run migration
**Command:** `npx convex dev` lalu panggil migration action dari Convex dashboard.
**Depends on:** Task 1.4
**Estimate:** 5 min
**Acceptance:** 0 users dengan `isActive === undefined`.

### Task 1.6: Delete migration action
**File:** `convex/users.ts`
**What:** Hapus migration action (sudah tidak perlu).
**Depends on:** Task 1.5
**Estimate:** 2 min
**Acceptance:** Code bersih, tidak ada dead code.

---

## Phase 2: Convex Data Layer

### Task 2.1: Create `users.getAccountLinkStatus` query
**File:** `convex/users.ts`
**What:** Query yang return `{ hasTelegram: boolean, telegramUsername: string | null }` berdasarkan authenticated user.
**Depends on:** Task 1.3
**Estimate:** 15 min
**Acceptance:** Query return hasTelegram=true kalau user punya telegramId.

### Task 2.2: Create `users.connectTelegram` mutation
**File:** `convex/users.ts`
**What:** Mutation utama untuk merge/link Telegram identity.
**Logic:**
1. Verify auth token (Better Auth)
2. Collision check (telegramId sudah dipakai user aktif lain?)
3. Find bot user by telegramId
4. Reassign data (books, borrowRequests, transactions, wishlist, reviews)
5. Soft-delete bot user (isActive = false)
6. Set telegramId + linkedUserIds di web user
7. Recompute stats dari actual tables
**Depends on:** Task 1.1, Task 1.3
**Estimate:** 45 min
**Acceptance:** End-to-end merge berhasil, data reassigned, stats recomputed.

### Task 2.3: Create `users.disconnectTelegram` mutation
**File:** `convex/users.ts`
**What:** Unlink Telegram dari web user.
**Logic:**
1. Verify auth token
2. Remove telegramId dari web user
3. Remove botUserId dari linkedUserIds
4. Bot user tetap isActive = false
**Depends on:** Task 2.2
**Estimate:** 15 min
**Acceptance:** Unlink berhasil, web user tidak punya telegramId.

### Task 2.4: Audit and update all user queries with isActive filter
**Files:** `convex/users.ts`, `convex/books.ts`, `convex/borrowRequests.ts`, `convex/transactions.ts`, `convex/wishlist.ts`
**What:** Tambah `.filter((q) => q.neq(q.field("isActive"), false))` ke semua query yang enrich user data.
**Affected queries:**
- `users.getAll`
- `books.list` (enrich owner)
- `books.getById` (enrich owner)
- `borrowRequests.getByBorrower/getByLender`
- `transactions.getActive/getAll/getOverdue`
- `wishlist.getByUser`
- `users.getProfile`
**Depends on:** Task 1.5
**Estimate:** 30 min
**Acceptance:** Semua query hanya return active users (isActive !== false).

---

## Phase 3: Next.js API Routes

### Task 3.1: Create GET Convex httpAction (`/api/link-telegram`)
**File:** `convex/http.ts` (atau file baru)
**What:** httpAction yang menerima GET request dari Telegram widget redirect, parse query params, render HTML confirmation page.
**Logic:**
1. Parse query params (id, hash, auth_date, username, first_name)
2. Render HTML form POST ke Next.js `/api/auth/telegram`
**Depends on:** Nothing
**Estimate:** 20 min
**Acceptance:** Buka URL widget redirect → lihat confirm page dengan nama Telegram.

### Task 3.2: Create POST Next.js API route (`/api/auth/telegram`)
**File:** `src/app/api/auth/telegram/route.ts`
**What:** API route yang menerima POST dari confirm page, verify session + HMAC, call Convex mutation.
**Logic:**
1. Verify Better Auth session
2. Parse form body
3. Verify auth_date ≤ 5 menit
4. Verify HMAC dengan timingSafeEqual
5. Call `users.connectTelegram` via ConvexHttpClient
6. Redirect ke `/profile?linked=telegram`
**Depends on:** Task 2.2
**Estimate:** 30 min
**Acceptance:** Submit form → redirect ke profile, Telegram terhubung.

### Task 3.3: Add rate limit middleware
**File:** `src/middleware.ts`
**What:** Next.js middleware yang rate limit POST ke `/api/auth/telegram` (max 3 per IP per 15 menit).
**Depends on:** Task 3.2
**Estimate:** 15 min
**Acceptance:** 4th request dalam 15 menit → redirect dengan error.

---

## Phase 4: Frontend

### Task 4.1: Add Telegram Login Widget to profile page
**File:** `src/app/(auth)/profile/page.tsx`
**What:** Tambah Telegram Login Widget script + button "Hubungkan Telegram" (hanya tampil kalau belum linked).
**Depends on:** Task 2.1
**Estimate:** 20 min
**Acceptance:** User tanpa telegramId lihat button. User dengan telegramId tidak lihat button.

### Task 4.2: Handle link success/error states
**File:** `src/app/(auth)/profile/page.tsx`
**What:** Detect query params (`?linked=telegram`, `?error=expired`, `?error=invalid`) dan tampilkan toast/notif.
**Depends on:** Task 4.1
**Estimate:** 15 min
**Acceptance:** Success message muncul setelah link. Error message muncul untuk setiap error type.

### Task 4.3: Add disconnect Telegram button
**File:** `src/app/(auth)/profile/page.tsx`
**What:** Tambah button "Putuskan Telegram" (hanya tampil kalau sudah linked). Call `users.disconnectTelegram` mutation.
**Depends on:** Task 2.3
**Estimate:** 15 min
**Acceptance:** Klik button → telegramId dihapus, button "Hubungkan" muncul lagi.

---

## Phase 5: Telegram Bot Integration

### Task 5.1: Update bot user lookup to filter isActive
**File:** OpenClaw skill (server-side)
**What:** Update skill yang lookup user by telegramId — tambah filter `isActive !== false`.
**Depends on:** Task 1.5
**Estimate:** 15 min
**Acceptance:** Bot tidak ketemu merged users.

### Task 5.2: Add bot prompt for unlinked users
**File:** OpenClaw skill (server-side)
**What:** Tambah logic: kalau user chat tapi tidak punya linked web account → bot kirim pesan prompt ke web.
**Depends on:** Task 5.1
**Estimate:** 15 min
**Acceptance:** User baru di Telegram dikasih tahu untuk buka web.

---

## Phase 6: Testing

### Task 6.1: Test happy path
**Flow:** Sign-in Google → klik Hubungkan Telegram → authorize → confirm → merge → profile updated.
**Estimate:** 15 min
**Acceptance:** Semua data (buku, transaksi, reputasi) muncul di web user.

### Task 6.2: Test edge cases
**Cases:**
- [ ] auth_date expired (tunggu >5 menit sebelum klik confirm)
- [ ] Hash mismatch (manual tamper hash)
- [ ] No session (clear cookies sebelum POST)
- [ ] User already linked (tidak tampilkan button)
- [ ] Bot user not found (set telegramId saja)
- [ ] telegramId collision (2 akun aktif)
- [ ] Double POST (network retry)
- [ ] Disconnect kemudian reconnect
**Estimate:** 30 min
**Acceptance:** Semua cases handle dengan benar.

### Task 6.3: Test bot behavior post-merge
**Flow:** Merge → chat ke bot → bot tidak ketemu user lama → bot prompt ke web.
**Estimate:** 10 min
**Acceptance:** Bot behavior sesuai spec.

---

## Phase 7: Deploy

### Task 7.1: Set @BotFather domain
**Command:** `/setdomain` → `perpuskukaan-web.vercel.app`
**Estimate:** 5 min
**Acceptance:** Widget redirect berfungsi.

### Task 7.2: Set environment variables
**Vercel:**
- `TELEGRAM_BOT_TOKEN`
- `NEXT_PUBLIC_CONVEX_URL`
**Estimate:** 5 min
**Acceptance:** Env vars tersedia di production.

### Task 7.3: Deploy to Vercel
**Command:** `git push origin main` (auto-deploy)
**Estimate:** 5 min
**Acceptance:** Deploy sukses, no build errors.

### Task 7.4: Production smoke test
**Flow:** Jalankan happy path di production environment.
**Estimate:** 10 min
**Acceptance:** Semua berfungsi di production.

---

## Total Estimate

| Phase | Tasks | Estimate |
|---|---|---|
| Phase 1: Schema & Migration | 6 tasks | ~42 min |
| Phase 2: Convex Data Layer | 4 tasks | ~105 min |
| Phase 3: Next.js API Routes | 3 tasks | ~65 min |
| Phase 4: Frontend | 3 tasks | ~50 min |
| Phase 5: Telegram Bot | 2 tasks | ~30 min |
| Phase 6: Testing | 3 tasks | ~55 min |
| Phase 7: Deploy | 4 tasks | ~25 min |
| **Total** | **25 tasks** | **~6.5 hours** |

## Risk Areas

1. **Better Auth session cookie di Next.js domain** — verify cookie dikirim saat POST dari confirm page
2. **ConvexHttpClient auth** — verify auth token propagation dari Next.js ke Convex mutation
3. **Bot token rotation** — proses manual, harus di-document

## Rollback Plan

- Schema changes: additive only (isActive field, by_reviewer index) — tidak break existing data
- Kalau ada issue: revert code, schema tetap compatible
- Bot token: bisa generate baru via @BotFather kapan saja
