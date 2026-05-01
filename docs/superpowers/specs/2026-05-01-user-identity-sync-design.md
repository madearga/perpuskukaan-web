# User Identity Sync: Telegram ↔ Web (Google Sign-in)

## Problem

Perpuskukaan punya dua interface: Telegram bot (OpenClaw) dan Web UI (Next.js). User bisa mulai dari mana saja. Perlu mekanisme sinkronisasi identitas agar satu user punya satu akun tergabung.

## Solution: Telegram Login Widget

Menggunakan [Telegram Login Widget](https://core.telegram.org/widgets/login) untuk verifikasi kriptografis identitas Telegram langsung di web. Tidak perlu token exchange, deep link, atau OpenClaw skill.

### Kenapa Login Widget?

| Deep Link + Token | Telegram Login Widget |
|---|---|
| Bearer token bisa di-share/forward | Verifikasi kriptografis HMAC-SHA256 |
| Perlu `accountLinks` table | Tidak perlu table tambahan |
| Perlu OpenClaw skill | Tidak perlu bot involvement saat login |
| 15-min TTL, rate limit, token cleanup | Stateless, auth_date check (5 menit) |
| Identity takeover via link sharing | User consciously authorizes in Telegram popup |

## Architecture

```
┌──────────────┐         ┌──────────────┐
│  Web (Google) │         │ Telegram      │
│  Sign-in      │         │ Login Widget  │
└──────┬───────┘         └──────┬───────┘
       │                        │
       │ 1. Sign-in Google      │
       │ → create user          │
       │   (email, no telegram) │
       │                        │
       │ 2. Klik "Hubungkan     │
       │    Telegram"            │
       │ → Telegram popup       │
       │ → user authorize       │
       │ → widget redirect to   │
       │   /api/auth/telegram   │
       │                        │
       │ 3. Next.js API route:  │
       │   a. Verify web session│
       │   b. Verify HMAC hash  │
       │   c. Check auth_date   │
       │   d. Call Convex via   │
       │      authenticated     │
       │      client            │
       │                        │
       │ 4. Convex internal     │
       │    mutation: merge +   │
       │    link accounts       │
       └────────────────────────┘
```

## Integration Flow (Detailed)

### Step 1: User sign-in Google di Web

- Better Auth creates user row: `{ email, role: "user", ... }`
- No `telegramId` yet

### Step 2: Web detects unlinked account

- Query `users.getAccountLinkStatus` → returns `{ hasTelegram: boolean }`
- If `telegramId === undefined` → show "Hubungkan Telegram" button

### Step 3: Telegram Login Widget

Frontend menampilkan widget:

```html
<script async src="https://telegram.org/js/telegram-widget.js?22"
  data-telegram-login="Perpuskukaanbot"
  data-size="large"
  data-auth-url="/api/auth/telegram">
</script>
```

**Catatan:** Tidak pakai `data-request-access="write"` karena kita tidak butuh bot mengirim pesan — hanya verifikasi identitas.

User klik → Telegram popup → authorize → redirect ke `/api/auth/telegram?id=...&hash=...&auth_date=...&username=...&first_name=...`

### Step 4: Next.js API Route (`/api/auth/telegram`)

Ini adalah `GET` handler terpisah dari Better Auth catch-all route. Next.js App Router static routes (`telegram/route.ts`) mendapat prioritas di atas `[...all]/route.ts`.

```
1. Verify web session:
   - Cek Better Auth session cookie
   - Extract authenticated userId
   - Reject 401 jika no valid session

2. Verify Telegram HMAC:
   - Extract semua query params kecuali 'hash'
   - Reconstruct data-check-string (sorted by key)
   - Compute SHA256 HMAC dengan TELEGRAM_BOT_TOKEN (dari env)
   - Bandingkan computed hash dengan received hash
   - Reject 403 jika mismatch

3. Verify auth_date:
   - Reject jika auth_date > 5 menit yang lalu
   - Telegram redirect URLs bisa tertangkap di browser history,
     jadi window harus pendek

4. Check collision:
   - Query: apakah telegramId ini sudah dipakai user AKTIF lain?
   - Jika ya → reject: "Akun Telegram ini sudah terhubung ke akun lain"
   - Cek merged users tidak ikut (isActive !== false)

5. Call Convex mutation:
   - Gunakan authenticated Convex client (dengan session user)
   - Panggil users.connectTelegram({ telegramId, username, firstName })
   - Server-side mutation verifies caller identity === webUserId
```

### Step 5: Convex merge logic

Lihat "Merge Logic" section di bawah.

## Verification (HMAC Detail)

Telegram Login Widget verification mengikuti [official docs](https://core.telegram.org/widgets/login#checking-authorization):

```
1. Ambil semua URL query parameters kecuali 'hash'
2. Sort by key alphabetically
3. Buat data-check-string: "key=value\n" untuk setiap parameter
4. Compute SHA256 HMAC:
   a. key = SHA256(TELEGRAM_BOT_TOKEN)
   b. hmac = HMAC-SHA256(data-check-string, key)
5. Bandingkan hmac (hex) dengan parameter 'hash'
6. Cek (current_time - auth_date) < 300 detik (5 menit)
```

### Environment Variables

| Var | Where | Value |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Next.js `.env.local` | Bot token dari @BotFather |
| `TELEGRAM_BOT_TOKEN` | Convex env (optional) | Sama, hanya kalau verification di Convex side |

Bot token HANYA di server-side, tidak pernah ke client.

## Merge Logic (Convex `internalMutation`)

`connectTelegram` adalah `internalMutation` — hanya bisa dipanggil dari Convex functions (bukan langsung dari client). Dipanggil dari API route via `ctx.runMutation()`.

**IMPORTANT:** Untuk Round 1, merge dilakukan sebagai **satu atomic mutation**. Batch processing defer ke V2. Alasan: Convex mutations are atomic — kalau gagal, semua rollback otomatis. Kebanyakan user punya <50 records total.

```
Input: { webUserId, telegramId, username, firstName }
Caller: internalMutation (dipanggil dari httpAction atau server-side)

1. Verify caller identity:
   - Pastikan ini dipanggil oleh user yang terautentikasi
   - webUserId harus match session user

2. Collision check:
   - Query users with this telegramId where isActive !== false
   - Jika sudah ada user AKTIF lain → reject error
   - Jika sudah ada merged user (isActive === false) → skip merge

3. Find bot user by telegramId (telegramId index, user with no email or email === null)
   - Jika bot user ada DAN bot user !== webUserId:
     a. Merge profile fields (tiebreaker: web user wins jika both non-null):
        - username: webUser ?? botUser
        - firstName: webUser ?? botUser
        - lastName: webUser ?? botUser
        - phone: webUser ?? botUser
        - location: webUser ?? botUser
        - bio: webUser ?? botUser
        - avatar: webUser ?? botUser
     b. Recompute stats dari actual table counts (jangan sum denormalized values):
        - totalBooksShared = COUNT(books where ownerId IN [webUser, botUser])
        - totalBorrows = COUNT(transactions where borrowerId IN [webUser, botUser])
        - totalLends = COUNT(transactions where lenderId IN [webUser, botUser])
        - reputation: MAX(webUser.reputation, botUser.reputation)
     c. Reassign semua data dari bot user → web user:
        - books: update ownerId
        - borrowRequests: update borrowerId / lenderId
        - transactions: update borrowerId / lenderId
        - wishlist: update userId
        - reviews: update reviewerId / revieweeId
     d. Soft-delete bot user:
        - Tambah webUserId ke linkedUserIds array (field yang sudah ada)
        - Set isActive = false
        - JANGAN hapus bot user row
   - Jika bot user TIDAK ada:
     a. Hanya set telegramId, username, firstName di web user

4. Set telegramId di web user

5. Return { success: true }
```

### Merge Direction

Web user selalu jadi "survivor" karena:
1. Flow dimulai dari web (user sign-in Google dulu)
2. Web user sudah authenticated saat merge terjadi
3. Bot user tetap ada (soft-delete) untuk referential integrity

Jika di masa depan perlu Telegram-initiated linking, merge direction bisa dibalik.

### Stats Recomputation (bukan sum)

Setelah data reassignment, stats **dihitung ulang dari tabel**, bukan di-sum dari denormalized values. Ini mencegah double-counting:

```typescript
const totalBooksShared = await ctx.db
  .query("books").withIndex("by_owner", q => q.eq("ownerId", webUserId))
  .collect();
// totalBooksShared.length → actual count
```

## Schema Changes

### Users table additions

```typescript
// Gunakan linkedUserIds yang sudah ada untuk track merge history
// linkedUserIds sudah ada: v.optional(v.array(v.id("users")))
// Setelah merge: linkedUserIds = [botUserId]

// Tambah field baru:
isActive: v.optional(v.boolean()),  // false setelah di-merge
```

**TIDAK menambah `mergedIntoId`** — gunakan `linkedUserIds` yang sudah ada:
- Bot user yang sudah di-merge: `linkedUserIds` berisi `[webUserId]`
- Web user: `linkedUserIds` berisi `[botUserId]`
- Kedua sisa punya referensi silang

### No new tables

Tidak perlu `accountLinks` table.

### Query audit (existing queries must filter merged users)

Semua query yang baca tabel `users` harus ditambah filter:

```typescript
.filter((q) => q.neq(q.field("isActive"), false))
```

Affected queries:
- `users.getAll` → filter isActive !== false
- `books.list` (enrich owner) → skip jika owner isActive === false
- `borrowRequests.getByBorrower/getByLender` → filter enriched users
- `transactions.getActive/getAll` → filter enriched users
- Admin queries → tampilkan semua (termasuk merged)

## Convex Functions Needed

### New functions

1. **`users.connectTelegram`** — `internalMutation`
   - Verifies caller identity
   - Collision check
   - Merge logic
   - Soft-delete bot user
   - Dipanggil dari API route via Convex server client

2. **`users.getAccountLinkStatus`** — `query`
   - Returns `{ hasTelegram: boolean, telegramUsername: string | null }`

3. **`users.disconnectTelegram`** — `mutation` (unlink/revocation)
   - Clears telegramId dari web user
   - Reactivates bot user (isActive = true)
   - Reassigns data back jika diperlukan
   - Memerlukan auth verification

### Existing functions (need update)

- `users.getAll` → add `isActive !== false` filter
- All queries that enrich user data → skip/filter merged users

## Edge Cases

| Case | Handling |
|---|---|
| auth_date > 5 menit | Reject: "Sesi kadaluarsa, coba lagi" |
| Hash mismatch | Reject 403, log warning |
| No web session | Reject 401 |
| Missing params (direct URL access) | Reject 400 |
| User denies Telegram popup | Tidak ada redirect → tidak terjadi apa-apa |
| User already linked | Web tidak tampilkan "Hubungkan Telegram" button |
| Bot user not found | Just set telegramId, no data transfer |
| telegramId collision (other active user) | Reject: "Akun Telegram sudah terhubung ke akun lain" |
| Same Telegram linked twice | Idempotent — cek webUser.telegramId sudah ada |
| Merge fails (Convex error) | Atomic rollback — semua perubahan dibatalkan otomatis |
| Widget blocked by adblocker | Tampilkan fallback: manual link via Telegram bot command |

## Security

| Aspect | Implementation |
|---|---|
| Identity verification | HMAC-SHA256 dengan bot token (kriptografis) |
| Web session required | API route verifies Better Auth session sebelum proses |
| Caller identity verified | internalMutation checks webUserId matches authenticated user |
| Replay protection | auth_date ≤ 5 menit |
| Collision protection | Query existing telegramId sebelum set |
| Token exposure | Bot token hanya di server env, tidak pernah ke client |
| Audit trail | Bot user soft-deleted, linkedUserIds tetap ada |
| Rate limit | Limit connectTelegram calls: max 3 per user per 15 menit (mutation-level) |
| Unlink | disconnectTelegram mutation tersedia |
| Widget script integrity | Add SRI hash ke script tag saat deploy |

## Deployment Constraints

| Constraint | Mitigation |
|---|---|
| Telegram Login Widget hanya work di 1 domain (set via @BotFather) | Set ke `perpuskukaan-web.vercel.app`. Untuk localhost: pakai ngrok tunnel atau bot terpisah |
| Widget JS dari telegram.org bisa di-block adblocker | Fallback: tampilkan pesan "Disable adblocker atau hubungkan via bot" |
| Tidak work di embedded browsers (Instagram/Facebook) | Tampilkan pesan "Buka di browser biasa" |
| Custom domain migration | Update @BotFather domain setting |

## Implementation Order

1. Set domain di @BotFather: `perpuskukaan-web.vercel.app`
2. Add `isActive` field to users schema, push to Convex
3. Add `TELEGRAM_BOT_TOKEN` to Next.js `.env.local` dan Vercel env
4. Create Next.js API route `src/app/api/auth/telegram/route.ts` (GET handler)
5. Create `users.connectTelegram` internalMutation (merge logic)
6. Create `users.getAccountLinkStatus` query
7. Create `users.disconnectTelegram` mutation (unlink)
8. Audit existing queries — add `isActive !== false` filter
9. Add Telegram Login Widget to profile page
10. Test: sign-in Google → klik Telegram → verify → merge
11. Test edge cases: expired, collision, no bot user, no session
