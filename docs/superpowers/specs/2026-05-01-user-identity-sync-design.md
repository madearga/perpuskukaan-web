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
| Perlu OpenClaw skill | Tidak perlu bot involvement |
| 15-min TTL, rate limit, token cleanup | Stateless, tidak ada expiry concern |
| 3 P0 security vulnerabilities | Zero token attack surface |

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
       │ → user authenticate    │
       │ → widget returns       │
       │   signed data          │
       │                        │
       │ 3. Server verify       │
       │ → HMAC-SHA256 check    │
       │ → extract telegramId   │
       │ → set on user row      │
       │                        │
       │ 4. If bot user exists  │
       │ → merge data           │
       │ → soft-delete bot user │
       └────────────────────────┘
```

## Telegram Login Widget Integration

### Frontend (Web)

Tambahkan Telegram Login Widget di halaman profil:

```html
<script async src="https://telegram.org/js/telegram-widget.js?22"
  data-telegram-login="Perpuskukaanbot"
  data-size="large"
  data-auth-url="/api/auth/telegram"
  data-request-access="write">
</script>
```

Ketika user klik tombol Telegram:
1. Telegram popup muncul, user authorize
2. Telegram redirect ke `/api/auth/telegram?id=...&hash=...`
3. Data yang diterima: `id` (telegramId), `username`, `first_name`, `last_name`, `photo_url`, `auth_date`, `hash`

### Verification (Backend)

Di Next.js API route `/api/auth/telegram`:

```
1. Terima query params dari Telegram redirect
2. Reconstruct data-check-string dari semua field kecuali hash
3. Compute SHA256 HMAC dengan bot token
4. Bandingkan computed hash dengan received hash
5. Jika match → identitas Telegram terverifikasi kriptografis
6. Cek auth_date tidak lebih dari 24 jam
```

### Bot Token Setup

Bot token `@Perpuskukaanbot` sudah ada. Yang perlu dilakukan:
- Set domain di @BotFather: `/setdomain` → `perpuskukaan-web.vercel.app`
- Bot token digunakan hanya untuk HMAC verification di server, tidak pernah di-expose ke client

## Merge Logic

Setelah Telegram identity terverifikasi:

```
Input: { telegramId, username, firstName, webUserId }

1. Find bot user by telegramId in users table
2. If bot user exists:
   a. Merge fields (prefer non-null values, sum stats):
      - username, firstName, lastName, phone, location, bio, avatar
      - reputation: max of both
      - totalBooksShared, totalBorrows, totalLends: sum
   b. Reassign related data (in batches if needed):
      - books: update ownerId
      - borrowRequests: update borrowerId/lenderId
      - transactions: update borrowerId/lenderId
      - wishlist: update userId
      - reviews: update reviewerId/revieweeId
   c. Soft-delete bot user:
      - Set mergedIntoId = webUserId
      - Set isActive = false
      - Keep row for referential integrity
3. If bot user NOT found:
   a. Just set telegramId, username, firstName on web user
4. Set telegramId on web user
5. Return { success: true }
```

### Soft Delete (not hard delete)

Bot user row TIDAK dihapus. Sebagai gantinya:

```typescript
// Added to users schema
mergedIntoId: v.optional(v.id("users")),  // points to surviving user
isActive: v.optional(v.boolean()),         // false after merge
```

**Kenapa soft delete:**
- Data bisa di-recover kalau ada bug
- Audit trail permanen
- Referential integrity tetap terjaga
- Bot bisa detect merged users dan redirect ke web user

### Batch Processing untuk Merge Besar

Jika user punya banyak data (>50 records), merge dipecah menjadi batch:

```
1. First mutation: merge user fields + mark bot user as merging
2. Subsequent mutations: reassign data in batches per table
3. Final mutation: mark bot user as merged (isActive = false)
```

Menggunakan Convex `action` (bukan mutation) untuk bisa menjalankan multiple mutations secara berurutan.

## Convex Functions Needed

### New mutations/queries

1. `users.connectTelegram` — main mutation: verify, merge, link (called from Next.js API route via Convex client)
2. `users.getAccountLinkStatus` — returns { hasTelegram, telegramUsername }
3. `users.mergeBatch` — reassign one batch of related data (internal, for large merges)

### Schema additions

```typescript
// In users table
mergedIntoId: v.optional(v.id("users")),
isActive: v.optional(v.boolean()),
```

### No new tables needed

Tidak perlu `accountLinks` table. Telegram Login Widget bersifat stateless.

## Security

| Aspect | Implementation |
|---|---|
| Identity verification | HMAC-SHA256 dengan bot token (kriptografis, tidak bisa di-fake) |
| Token exposure | Tidak ada token — widget redirect langsung |
| Replay protection | Cek `auth_date` ≤ 24 jam |
| Server-to-server auth | Tidak perlu — semua via web client session |
| Audit trail | Bot user soft-deleted, `mergedIntoId` tetap ada |
| Rate limit | Limit `connectTelegram` calls per user (Convex mutation-level) |
| Bot token | Hanya di server-side env, tidak pernah ke client |

## Edge Cases

| Case | Handling |
|---|---|
| auth_date expired | Reject, tampilkan "Sesi kadaluarsa, coba lagi" |
| Hash mismatch | Reject, log warning untuk monitoring |
| User already linked | Web doesn't show "Hubungkan Telegram" |
| Bot user not found | Just set telegramId, no data transfer |
| Merge in progress | Mark bot user as "merging" → retry-safe |
| Multiple merge attempts | Idempotent — cek `mergedIntoId` sudah set atau belum |
| Wrong Telegram account | User mengotorisasi di popup — consciously choose which Telegram |

## Implementation Order

1. Set domain di @BotFather untuk `perpuskukaan-web.vercel.app`
2. Add `mergedIntoId` and `isActive` fields to users schema
3. Create Next.js API route `/api/auth/telegram` (verify HMAC + process data)
4. Create `users.connectTelegram` Convex mutation (merge logic)
5. Create `users.getAccountLinkStatus` Convex query
6. Add Telegram Login Widget to web profile page
7. Test: sign-in Google → klik Telegram → verify → merge
8. Test edge cases: already linked, no bot user, auth_date expired
