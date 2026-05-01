# User Identity Sync: Telegram ↔ Web (Google Sign-in)

## Problem

Perpuskukaan punya dua interface: Telegram bot (OpenClaw) dan Web UI (Next.js). User bisa mulai dari mana saja. Perlu mekanisme sinkronisasi identitas agar satu user punya satu akun tergabung.

## Solution: Telegram Login Widget via Convex httpAction

Menggunakan [Telegram Login Widget](https://core.telegram.org/widgets/login) untuk verifikasi kriptografis. Semua verification + merge berjalan di Convex (bukan Next.js), sehingga bot token hanya disimpan di satu tempat.

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
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Web (Google) │    │  Telegram     │    │  Convex       │
│  Sign-in      │    │  Login Widget │    │  httpAction   │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                    │
       │ 1. Sign-in Google │                    │
       │ → create user     │                    │
       │                   │                    │
       │ 2. Klik "Hubungkan│                    │
       │    Telegram"       │                    │
       │ → widget popup    │                    │
       │                   │                    │
       │     User authorize in Telegram popup   │
       │                   │                    │
       │     Widget redirect (GET) to Convex   │
       │     httpAction URL with ?id=&hash=... │
       │                   │                    │
       │                   │  3. GET handler:   │
       │                   │  → verify HMAC     │
       │                   │  → check auth_date │
       │                   │  → render confirm  │
       │                   │    HTML page       │
       │                   │                    │
       │     User clicks "Ya, Hubungkan"        │
       │                   │                    │
       │                   │  4. POST handler:  │
       │                   │  → verify session  │
       │                   │  → verify HMAC     │
       │                   │  → call            │
       │                   │    internalMutation│
       │                   │  → redirect to web │
       │                   │                    │
       │ 5. Redirect back to /profile?linked=1  │
       └───────────────────┴────────────────────┘
```

## Why Convex httpAction (not Next.js API route)?

| Concern | Next.js API Route | Convex httpAction |
|---|---|---|
| HMAC verification | Butuh TELEGRAM_BOT_TOKEN di Vercel env | Bot token sudah di Convex env |
| Call internalMutation | Tidak bisa — tidak ada `ctx` object | Bisa — `ctx.runMutation()` tersedia |
| Session verification | Perlu ConvexHttpClient | Bisa akses Better Auth cookie langsung |
| Secret management | Token di 2 tempat | Token di 1 tempat saja |
| Atomicity | 2-step (verify → call) | 1-step (verify + merge) |

## Integration Flow (Detailed)

### Step 1: User sign-in Google di Web

- Better Auth creates user row: `{ email, role: "user", isActive: true, ... }`
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
  data-auth-url="https://watchful-rook-105.convex.site/api/link-telegram">
</script>
```

- Tidak pakai `data-request-access` (tidak butuh bot messaging)
- `data-auth-url` mengarah ke Convex httpAction (bukan Next.js)

User klik → Telegram popup → authorize → browser redirect ke Convex httpAction dengan query params: `?id=...&hash=...&auth_date=...&username=...&first_name=...`

### Step 4: Convex httpAction (GET) — HMAC Verification + Confirm Page

```
1. Terima semua query params
2. Kalau tidak ada 'hash' → return 400 HTML error page
3. Verify HMAC:
   a. Ambil semua params kecuali 'hash'
   b. Sort by key, buat data-check-string
   c. Compute HMAC-SHA256 dengan TELEGRAM_BOT_TOKEN dari Convex env
   d. Bandingkan dengan param 'hash'
   e. Jika mismatch → return 403 HTML error page
4. Check auth_date ≤ 300 detik (5 menit)
   - Jika expired → return HTML "Sesi kadaluarsa, coba lagi"
5. Return HTML confirmation page:
   "Hubungkan Telegram @username ke akun Perpuskukaan kamu?"
   [Ya, Hubungkan] (POST form)  [Batal] (link ke /profile)
```

**Kenapa confirmation page?**
- Mencegah CSRF: GET hanya render HTML, tidak ubah data
- User melihat Telegram username yang akan di-link
- POST memerlukan click — tidak bisa di-trigger oleh attacker via `<img>` tag

### Step 5: Convex httpAction (POST) — Session Verify + Merge

```
1. Verify Better Auth session dari cookie:
   - Parse session cookie
   - Look up user by email in users table
   - Jika tidak ada session → return 401 HTML error page
2. Re-verify HMAC (POST body sama dengan GET params)
3. Re-check auth_date ≤ 300 detik
4. Call ctx.runMutation(internal.users.connectTelegram, {
     webUserId,
     telegramId,
     username,
     firstName
   })
5. Redirect browser ke NEXT_PUBLIC_WEB_URL/profile?linked=telegram
```

### Step 6: Web profile reflects link

- Profile page detects `?linked=telegram` query param
- Shows success message "Telegram terhubung!"
- `getAccountLinkStatus` now returns `hasTelegram: true`

## HMAC Verification Detail

Mengikuti [Telegram official docs](https://core.telegram.org/widgets/login#checking-authorization):

```typescript
// Inside Convex httpAction
const botToken = process.env.TELEGRAM_BOT_TOKEN;

function verifyTelegramAuth(params: Record<string, string>): boolean {
  const { hash, ...data } = params;
  
  // 1. Sort keys alphabetically
  const dataCheckString = Object.keys(data)
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('\n');
  
  // 2. HMAC-SHA256 with SHA256(botToken) as key
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  
  // 3. Compare
  return hmac === hash;
}
```

### Environment Variables

| Var | Where | Notes |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | **Convex env only** | Single source of truth |
| `NEXT_PUBLIC_WEB_URL` | Convex env | `https://perpuskukaan-web.vercel.app` (for redirect back) |

Bot token **tidak** di Next.js/Vercel. Hanya di Convex.

## Merge Logic (Convex `internalMutation`)

`connectTelegram` adalah `internalMutation` — hanya bisa dipanggil dari Convex functions (httpAction). **Tidak bisa dipanggil dari client.**

### Atomicity Strategy

**V1: Single atomic mutation** — covers 99% of users (< 200 total records).
Convex mutations are fully atomic. Kalau gagal, semua rollback otomatis.

**Fallback threshold:** Jika user punya > 200 total records across all tables, mutation reject dengan error "Data terlalu banyak, hubungi admin" — admin bisa trigger manual batch merge.

**V2 (future):** Batch processing via Convex `action` dengan chunked mutations.

### Merge Logic

```
Input: { webUserId, telegramId, username, firstName }
Caller: internalMutation (hanya dari httpAction)

1. Verify caller: httpAction sudah verify session → webUserId trusted

2. Collision check:
   - Query users where telegramId = input AND isActive !== false
   - Jika user AKTIF lain punya telegramId ini → reject
   - Jika merged user (isActive === false) → skip merge, proceed to step 4

3. Find bot user by telegramId (by_telegram_id index, where isActive !== false):
   a. Jika bot user ada DAN bot user._id !== webUserId:
      i. Merge profile fields:
         - Tiebreaker: web user wins jika both non-null
         - username: webUser.username ?? botUser.username
         - firstName: webUser.firstName ?? botUser.firstName
         - lastName, phone, location, bio, avatar: sama
      ii. Recompute stats dari actual table counts:
         - totalBooksShared = COUNT(books where ownerId IN [webUser, botUser])
         - totalBorrows = COUNT(transactions where borrowerId IN [webUser, botUser])
         - totalLends = COUNT(transactions where lenderId IN [webUser, botUser])
         - reputation: MAX(webUser.reputation ?? 0, botUser.reputation ?? 0)
      iii. Reassign semua data dari bot user → web user:
         - books: update ownerId where ownerId = botUser._id
         - borrowRequests: update borrowerId/lenderId
         - transactions: update borrowerId/lenderId
         - wishlist: update userId
         - reviews: update reviewerId/revieweeId
      iv. Soft-delete bot user:
         - Set isActive = false
         - Set linkedUserIds = [webUser._id]
      v. Update web user:
         - Add botUser._id ke linkedUserIds array
   b. Jika bot user TIDAK ada:
      - Tidak ada data untuk di-merge

4. Set telegramId, username, firstName di web user

5. Return { success: true }
```

### linkedUserIds — Cross-Reference

Setelah merge:
- **Bot user**: `linkedUserIds = [webUserId]` → tahu siapa yang menyerapnya
- **Web user**: `linkedUserIds = [botUserId]` → tahu akun mana yang di-merge

Kedua sisi punya referensi silang. Bidirectional.

### Stats Recomputation

Setelah data reassignment, stats dihitung dari actual tables (bukan sum denormalized):

```typescript
const books = await ctx.db
  .query("books").withIndex("by_owner", q => q.eq("ownerId", webUserId))
  .collect();
// totalBooksShared = books.length
```

## Schema Changes

### Users table

```typescript
// Tambah field baru:
isActive: v.optional(v.boolean()),  // true = active, false = merged/soft-deleted
// Default: true untuk semua user (set di syncUserCreation)

// Gunakan linkedUserIds yang sudah ada:
// linkedUserIds: v.optional(v.array(v.id("users")))
// Setelah merge: bot user = [webUserId], web user = [botUserId]
```

### syncUserCreation update

Update existing `syncUserCreation` hook untuk set `isActive: true`:

```typescript
await ctx.db.insert("users", {
  email: args.email,
  isActive: true,  // <-- NEW
  // ... rest of fields
});
```

Ini memastikan semua user (existing + new) punya explicit `isActive` value.

### Migration for existing users

Single migration query: set `isActive = true` untuk semua users yang belum punya field ini.

### No new tables

### Query Audit — isActive Filter

Semua query yang baca tabel `users` dan expose ke UI harus filter:

```typescript
.filter((q) => q.neq(q.field("isActive"), false))
```

**Important:** `isActive` menggunakan **opt-out pattern** (`!== false`), bukan opt-in (`=== true`).
- `undefined` → treated as active (backward compatible)
- `false` → merged/deleted
- `true` → explicitly active

**Complete affected queries:**
- `users.getAll` → add filter
- `books.list` (enrich owner) → skip merged owners
- `books.getById` (enrich owner) → skip merged owners
- `borrowRequests.getByBorrower` → filter enriched users
- `borrowRequests.getByLender` → filter enriched users
- `transactions.getActive` → filter enriched users
- `transactions.getAll` → filter enriched users
- `transactions.getOverdue` → filter enriched users
- `wishlist.getByUser` → skip merged users
- `users.getProfile` → return null jika isActive === false
- Admin queries → **no filter** (admin sees all users including merged)

**Enforcement:** Gunakan helper function `filterActive(q)` yang dipanggil di setiap query. Kalau ada query baru yang lupa, merged users tidak muncul tapi tidak crash.

## Convex Functions Needed

### New functions

1. **`httpAction: GET /api/link-telegram`** — HMAC verify + render confirm HTML
2. **`httpAction: POST /api/link-telegram`** — Session verify + HMAC re-verify + call merge
3. **`users.connectTelegram`** — `internalMutation`, merge logic (only callable from httpAction)
4. **`users.getAccountLinkStatus`** — `query`, returns `{ hasTelegram, telegramUsername }`
5. **`users.disconnectTelegram`** — `mutation`, unlink (see below)

### Updated existing functions

- `users.syncUserCreation` → add `isActive: true`
- All user-enriching queries → add `filterActive(q)`

## disconnectTelegram (Unlink)

**Behavior:** Forward-only unlink. Data TIDAK dipindahkan kembali ke bot user.

```
1. Verify caller identity (Better Auth session)
2. Remove telegramId dari web user
3. Remove botUserId dari web user linkedUserIds
4. Bot user tetap isActive = false (tidak di-reactivate)
   - Data sudah di web user, bot user kosong
   - Reactivating empty bot user membingungkan
5. Return { success: true }
```

**Kenapa tidak reverse merge?**
- Web user mungkin sudah menambah buku/transaksi baru setelah merge
- Tidak bisa membedakan data "asli bot" vs "baru dari web"
- Forward-only = simple, predictable, tidak ada data loss risk

## Edge Cases

| Case | Handling |
|---|---|
| No hash param (direct URL) | Return 400 HTML error page |
| auth_date > 5 menit | Return HTML "Sesi kadaluarsa, coba lagi" |
| Hash mismatch | Return 403 HTML "Verifikasi gagal" |
| No web session (POST) | Return 401 HTML "Silakan login dulu" |
| User denies Telegram popup | Tidak ada redirect → tidak terjadi apa-apa |
| User already linked | Web tidak tampilkan "Hubungkan" button |
| Bot user not found | Just set telegramId, no data transfer |
| telegramId collision (other active user) | Reject: "Akun Telegram sudah terhubung ke akun lain" |
| > 200 records to merge | Reject: "Data terlalu banyak, hubungi admin" |
| Merge fails (Convex error) | Atomic rollback otomatis, user bisa retry |
| Widget blocked by adblocker | Fallback: tampilkan link manual ke t.me/Perpuskukaanbot dengan pesan /start |
| Widget fails in embedded browser | Tampilkan pesan "Buka di browser biasa" |
| Double POST (network retry) | Idempotent — cek telegramId sudah ada |

## Security

| Aspect | Implementation |
|---|---|
| Identity verification | HMAC-SHA256 (kriptografis, di Convex httpAction) |
| CSRF protection | GET hanya render confirm HTML, POST untuk data change |
| Session verification | POST handler verifies Better Auth session cookie |
| Caller identity | internalMutation hanya callable dari httpAction (bukan client) |
| Replay protection | auth_date ≤ 5 menit |
| Collision protection | Query existing telegramId sebelum set |
| Token exposure | Bot token HANYA di Convex env (1 tempat) |
| Audit trail | linkedUserIds bidirectional, isActive flag |
| Rate limit | Rate limit di httpAction: max 3 requests per IP per 15 menit |
| Unlink | disconnectTelegram mutation tersedia |
| Bot token rotation | Jika compromised: generate new via @BotFather → update Convex env |
| SRI | Widget script bisa di-SRI, tapi Telegram bisa update versi — accepted risk |

## Telegram-First User Path

Untuk user yang **mulai dari Telegram** dan belum punya akun web:

1. User chat di bot Telegram → bot detect user belum punya linked web account
2. Bot kirim pesan: "Kunjungi perpuskukaan-web.vercel.app untuk menghubungkan akun dan mengakses fitur lengkap"
3. User buka web → sign-in Google → web create new account
4. User klik "Hubungkan Telegram" → widget flow → merge data

**Ini bukan bot-initiated linking** — user tetap harus ke web dulu. Tapi bot bisa prompt/mengarahkan.

**Future V2:** Bot-initiated linking via deep link (tambah OpenClaw skill) untuk user yang tidak bisa/mau buka web.

## Deployment Constraints

| Constraint | Mitigation |
|---|---|
| Widget hanya work di 1 domain | Set @BotFather domain ke `perpuskukaan-web.vercel.app` |
| Tidak work di localhost | Development: pakai ngrok tunnel atau bot terpisah |
| Widget JS bisa di-block adblocker | Fallback: tampilkan pesan "Disable adblocker atau chat bot" |
| Tidak work di embedded browsers | Tampilkan pesan "Buka di Chrome/Safari" |
| Custom domain migration | Update @BotFather + NEXT_PUBLIC_WEB_URL di Convex env |

## Implementation Order

1. Set domain di @BotFather: `perpuskukaan-web.vercel.app`
2. Add `isActive` field to users schema, push to Convex
3. Set `TELEGRAM_BOT_TOKEN` + `NEXT_PUBLIC_WEB_URL` di Convex env
4. Update `syncUserCreation` → add `isActive: true`
5. Create migration: set `isActive = true` untuk all existing users
6. Create Convex httpAction: `GET /api/link-telegram` (HMAC verify + confirm HTML)
7. Create Convex httpAction: `POST /api/link-telegram` (session verify + merge)
8. Create `users.connectTelegram` internalMutation (merge logic)
9. Create `users.getAccountLinkStatus` query
10. Create `users.disconnectTelegram` mutation
11. Audit all existing queries — add isActive filter
12. Add Telegram Login Widget to profile page
13. Test: sign-in Google → klik Telegram → confirm → merge → profile updated
14. Test edge cases: expired, collision, no bot user, no session, > 200 records
15. Commit, push, deploy
