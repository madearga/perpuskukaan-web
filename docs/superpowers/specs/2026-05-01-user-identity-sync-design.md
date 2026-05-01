# User Identity Sync: Telegram ↔ Web (Google Sign-in)

## Problem

Perpuskukaan punya dua interface: Telegram bot (OpenClaw) dan Web UI (Next.js). User bisa mulai dari mana saja. Perlu mekanisme sinkronisasi identitas agar satu user punya satu akun tergabung.

## Solution: Telegram Login Widget (Hybrid GET/POST)

Menggunakan [Telegram Login Widget](https://core.telegram.org/widgets/login) untuk verifikasi kriptografis. Flow dibagi: **GET** di Convex (render confirm page), **POST** di Next.js (verify session + HMAC + call merge).

**Kenapa hybrid?**

| Pure Convex httpAction | Hybrid (GET Convex + POST Next.js) |
|---|---|
| Tidak bisa akses Better Auth session cookie (domain berbeda) | Next.js punya session cookie |
| Node.js `crypto` tidak tersedia | Next.js punya Node.js crypto |
| Bot token harus di Convex env | Bot token hanya di Vercel env (1 tempat) |
| ❌ Cannot verify web session | ✅ Session + HMAC verify di Next.js |

## Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Web (Google) │    │  Telegram     │    │  Convex       │
│  Sign-in      │    │  Login Widget │    │  httpAction   │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                    │
       │ 1. Sign-in Google │                    │
       │ → create user     │                    │
       │   (isActive=true) │                    │
       │                   │                    │
       │ 2. Klik "Hubungkan│                    │
       │    Telegram"       │                    │
       │ → widget popup    │                    │
       │                   │                    │
       │     User authorize in Telegram popup   │
       │                   │                    │
       │     Widget redirect (GET) to Convex   │
       │     with ?id=...&hash=...             │
       │                   │                    │
       │                   │  3. GET handler:   │
       │                   │  → Parse params    │
       │                   │  → Render confirm  │
       │                   │    HTML page       │
       │                   │  → No verification │
       │                   │    needed (POST    │
       │                   │    will verify)    │
       │                   │                    │
       │     User clicks "Ya, Hubungkan"        │
       │     → POST to Next.js API route        │
       │     (cross-origin form submission)     │
       │                   │                    │
       │                   │  4. Next.js POST:  │
       │                   │  → Verify session  │
       │                   │  → Verify HMAC     │
       │                   │  → Verify auth_date│
       │                   │  → Call Convex     │
       │                   │    mutation        │
       │                   │                    │
       │ 5. Redirect to /profile?linked=1       │
       └───────────────────┴────────────────────┘
```

## Why Split GET/POST?

| Handler | Domain | Has Cookie? | Has crypto? | Role |
|---|---|---|---|---|
| **GET** (Convex) | `watchful-rook-105.convex.site` | ❌ No | ❌ WebCrypto only | Render confirm HTML |
| **POST** (Next.js) | `perpuskukaan-web.vercel.app` | ✅ Yes | ✅ Node.js crypto | Verify + merge |

- Better Auth sets cookies on `perpuskukaan-web.vercel.app` (baseURL in auth.ts)
- Convex domain is different → tidak ada session cookie
- GET tidak perlu session (hanya render HTML)
- POST perlu session (untuk tau user mana yang di-link)

## Integration Flow (Detailed)

### Step 1: User sign-in Google di Web

- Better Auth creates user row: `{ email, role: "user", isActive: true, ... }`
- `isActive: true` di-set explicit (syncUserCreation updated)
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
- `data-auth-url` mengarah ke Convex httpAction GET

User klik → Telegram popup → authorize → browser redirect ke Convex httpAction dengan query params: `?id=...&hash=...&auth_date=...&username=...&first_name=...`

### Step 4: Convex httpAction (GET) — Render Confirm Page

```
1. Parse semua query params dari URL
2. Render HTML confirmation page:
   "Hubungkan Telegram @username ke akun Perpuskukaan kamu?"
   
   Form POST ke Next.js:
   <form action="https://perpuskukaan-web.vercel.app/api/auth/telegram" method="POST">
     <input type="hidden" name="id" value="TELEGRAM_ID">
     <input type="hidden" name="hash" value="HMAC_HASH">
     <input type="hidden" name="auth_date" value="AUTH_DATE">
     <input type="hidden" name="username" value="USERNAME">
     <input type="hidden" name="first_name" value="FIRST_NAME">
     <button type="submit">Ya, Hubungkan</button>
   </form>
   <a href="https://perpuskukaan-web.vercel.app/profile">Batal</a>
```

**Kenapa GET tidak verify HMAC?**
- GET hanya render HTML — tidak ubah data
- POST handler di Next.js akan verify HMAC + session
- Tidak perlu bot token di Convex env
- Tidak perlu WebCrypto (hanya HTML rendering)

### Step 5: Next.js API Route (POST) — Verify + Merge

```typescript
// src/app/api/auth/telegram/route.ts
export async function POST(request: Request) {
  // 1. Verify Better Auth session
  const session = await betterAuth.getSession(request);
  if (!session) return Response.redirect("/sign-in?error=session", 302);
  const webUserId = session.user.id;

  // 2. Parse form body
  const form = await request.formData();
  const telegramId = form.get("id") as string;
  const hash = form.get("hash") as string;
  const authDate = parseInt(form.get("auth_date") as string, 10);
  const username = form.get("username") as string;
  const firstName = form.get("first_name") as string;

  // 3. Verify auth_date (≤ 5 menit dari auth_date)
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 300) {
    return Response.redirect("/profile?error=expired", 302);
  }

  // 4. Verify HMAC (timing-safe comparison)
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  
  const dataCheckString = [
    `auth_date=${authDate}`,
    `first_name=${firstName}`,
    `id=${telegramId}`,
    `username=${username}`,
  ].sort().join("\n");
  
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");
  
  // TIMING-SAFE COMPARISON
  const isValid = crypto.timingSafeEqual(
    Buffer.from(computedHash, "hex"),
    Buffer.from(hash, "hex")
  );
  
  if (!isValid) {
    return Response.redirect("/profile?error=invalid", 302);
  }

  // 5. Call Convex mutation via authenticated client
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  // Set auth token from session
  convex.setAuth(session.token);
  
  await convex.mutation("users:connectTelegram", {
    webUserId,
    telegramId,
    username,
    firstName,
  });

  // 6. Redirect back
  return Response.redirect("/profile?linked=telegram", 302);
}
```

**Environment Variables (Vercel only):**

| Var | Source | Notes |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Vercel env | Hanya di server-side |
| `NEXT_PUBLIC_CONVEX_URL` | Vercel env | Untuk ConvexHttpClient |

**Bot token TIDAK di Convex env.** Single source of truth = Vercel.

### Step 6: Web profile reflects link

- Profile page detects `?linked=telegram` → show success
- `getAccountLinkStatus` now returns `hasTelegram: true`

## HMAC Verification Detail

### Data-check-string construction

Mengikuti [Telegram docs](https://core.telegram.org/widgets/login#checking-authorization):

```
1. Ambil semua field dari POST body kecuali 'hash'
2. Sort by key alphabetically
3. Format: "key=value\n" untuk setiap field
4. Concatenate (tanpa trailing newline)

Example:
auth_date=1234567890
first_name=Admin
id=974548226
username=madearga
```

### Timing-safe comparison

**WAJIB** menggunakan constant-time comparison:

```typescript
const isValid = crypto.timingSafeEqual(
  Buffer.from(computedHash, "hex"),
  Buffer.from(receivedHash, "hex")
);
```

Plain `===` string comparison vulnerable ke timing attack.

## Merge Logic (Convex mutation)

`connectTelegram` adalah **regular mutation** (bukan internalMutation). Dipanggil dari Next.js via `ConvexHttpClient` dengan auth token dari session.

### Why regular mutation (not internalMutation)?

- Next.js API route tidak punya Convex `ctx` → tidak bisa `ctx.runMutation(internal.users.connectTelegram)`
- `ConvexHttpClient` bisa panggil public mutation dengan auth token
- Auth token dari Better Auth session di-pass ke Convex mutation
- Mutation verifies auth token via Better Auth component

### Atomicity Strategy

**V1: Single atomic mutation** — covers 99% of users.
- Convex mutations are fully atomic
- Kalau gagal, semua rollback otomatis
- **No artificial record threshold** — biarkan Convex handle limits
- Jika hit limit, user lihat error generic "Terjadi kesalahan, coba lagi"

**V2 (future):** Batch processing via Convex action.

### Merge Logic

```
Input: { webUserId, telegramId, username, firstName }
Caller: authenticated mutation (auth token dari Next.js)

1. Verify caller identity:
   - Panggil betterAuthComponent.getAuthUser(ctx)
   - Pastikan authenticated user === webUserId
   - Jika tidak cocok → reject 403

2. Collision check:
   - Query users where telegramId = input AND isActive !== false
   - Jika user AKTIF lain punya telegramId ini → reject error

3. Find bot user by telegramId (by_telegram_id index, isActive !== false):
   a. Jika bot user ada DAN bot user._id !== webUserId:
      i. Reassign semua data dari bot user → web user:
         - books: update ownerId where ownerId = botUser._id
         - borrowRequests: update borrowerId/lenderId
         - transactions: update borrowerId/lenderId
         - wishlist: update userId
         - reviews: update reviewerId/revieweeId
      ii. Soft-delete bot user:
         - Set isActive = false
      iii. Update web user:
         - Add botUser._id ke linkedUserIds array
         - telegramId, username, firstName
   b. Jika bot user TIDAK ada:
      - Set telegramId, username, firstName di web user

4. Recompute stats dari actual tables (setelah reassignment):
   - totalBooksShared = COUNT(books where ownerId = webUserId)
   - totalBorrows = COUNT(transactions where borrowerId = webUserId)
   - totalLends = COUNT(transactions where lenderId = webUserId)
   - reputation = MAX(webUser.reputation ?? 0, botUser.reputation ?? 0)
   - Write stats ke web user

5. Return { success: true }
```

### linkedUserIds

**V1: One-directional only.**
- Web user: `linkedUserIds = [botUserId]`
- Bot user: `isActive = false` (tidak perlu linkedUserIds)

**Kenapa tidak bidirectional?**
- linkedUserIds di web user sudah cukup untuk audit trail
- Tidak ada query yang baca linkedUserIds dari bot user
- Deduplicate complexity, YAGNI

### Stats Recomputation

**Setelah reassignment** — query actual tables:

```typescript
const books = await ctx.db
  .query("books")
  .withIndex("by_owner", q => q.eq("ownerId", webUserId))
  .collect();

const totalBooksShared = books.length;
```

## Schema Changes

### Users table

```typescript
isActive: v.optional(v.boolean()),  // true/false/undefined
// Default: true (set di syncUserCreation + migration)

// linkedUserIds sudah ada di schema, tidak perlu perubahan
```

### Reviews table (new index)

```typescript
reviews: defineTable({...})
  .index("by_book", ["bookId"])
  .index("by_reviewee", ["revieweeId"])
  .index("by_reviewer", ["reviewerId"])  // <-- NEW
```

### syncUserCreation update

```typescript
await ctx.db.insert("users", {
  email: args.email,
  isActive: true,  // <-- NEW
  // ... rest
});
```

### Migration: set isActive for existing users

```typescript
// One-shot Convex action (temporary, delete after run)
export const migrateIsActive = internalAction({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      if (user.isActive === undefined) {
        await ctx.db.patch(user._id, { isActive: true });
      }
    }
    return { migrated: users.length };
  },
});
```

## Query Audit — isActive Filter

Semua query yang baca tabel `users` dan expose ke UI harus filter:

```typescript
.filter((q) => q.neq(q.field("isActive"), false))
```

**Complete affected queries:**

| Query | Filter Location |
|---|---|
| `users.getAll` | Add `.filter(q => q.neq(q.field("isActive"), false))` |
| `books.list` (enrich owner) | Skip if owner.isActive === false |
| `books.getById` (enrich owner) | Return null if owner.isActive === false |
| `borrowRequests.getByBorrower` | Filter enriched users |
| `borrowRequests.getByLender` | Filter enriched users |
| `transactions.getActive` | Filter enriched users |
| `transactions.getAll` | Filter enriched users |
| `transactions.getOverdue` | Filter enriched users |
| `wishlist.getByUser` | Filter by isActive !== false |
| `users.getProfile` | Return null if isActive === false |
| Admin queries | **NO filter** (admin sees all) |

**Post-merge bot behavior:**
- Bot lookup by telegramId: query with `isActive !== false` filter
- Jika bot user sudah merged (isActive=false) → bot tidak ketemu → treat as "belum terdaftar"
- Bot bisa kirim pesan: "Kunjungi web untuk menghubungkan akun"

## Convex Functions Needed

### New functions

1. **`users.connectTelegram`** — mutation (public, callable via ConvexHttpClient)
   - Verifies auth token (Better Auth)
   - Merge logic
   - Stats recomputation

2. **`users.getAccountLinkStatus`** — query
   - Returns `{ hasTelegram, telegramUsername }`

3. **`users.disconnectTelegram`** — mutation
   - Unlink (forward-only, no data reversal)

### Updated existing functions

- `users.syncUserCreation` → add `isActive: true`
- `reviews` schema → add `by_reviewer` index
- All user-enriching queries → add isActive filter

### Next.js functions

1. **GET `/api/link-telegram`** — Convex httpAction (render confirm HTML)
2. **POST `/api/auth/telegram`** — Next.js API route (verify + call merge)

## disconnectTelegram (Unlink)

**Forward-only unlink.** Data TIDAK dipindahkan kembali.

```
1. Verify caller identity (Better Auth session)
2. Remove telegramId dari web user
3. Remove botUserId dari web user linkedUserIds
4. Bot user tetap isActive = false (tidak di-reactivate)
5. Return { success: true }
```

**Kenapa tidak reverse merge?**
- Web user mungkin sudah menambah buku/transaksi baru setelah merge
- Tidak bisa membedakan data "asli bot" vs "baru dari web"
- Forward-only = simple, predictable

## Edge Cases

| Case | Handling |
|---|---|
| auth_date > 5 menit | Redirect `/profile?error=expired` |
| Hash mismatch (timing-safe) | Redirect `/profile?error=invalid` |
| No web session (POST) | Redirect `/sign-in?error=session` |
| Missing params (POST) | Redirect `/profile?error=invalid` |
| User denies Telegram popup | Tidak ada redirect → tidak terjadi apa-apa |
| User already linked | Web tidak tampilkan "Hubungkan" button |
| Bot user not found | Just set telegramId, no data transfer |
| telegramId collision | Reject: "Akun Telegram sudah terhubung ke akun lain" |
| Merge fails (Convex error) | Atomic rollback, user bisa retry dari confirm page |
| Widget blocked by adblocker | Fallback: tampilkan link ke t.me/Perpuskukaanbot |
| Widget fails in embedded browser | Tampilkan pesan "Buka di browser biasa" |
| Double POST (network retry) | Idempotent — cek telegramId sudah ada di web user |
| User klik confirm >5 menit setelah auth | POST reject → redirect ke profile dengan error |
| Disconnect kemudian reconnect | Bisa — skip merge (bot user sudah merged), set telegramId |

## Security

| Aspect | Implementation |
|---|---|
| Identity verification | HMAC-SHA256 dengan bot token |
| Session verification | Better Auth cookie di Next.js POST |
| Caller identity | Mutation verifies auth token === webUserId |
| CSRF protection | GET render HTML, POST ubah data (form submission) |
| Timing attack | `crypto.timingSafeEqual` untuk HMAC comparison |
| Replay protection | auth_date ≤ 5 menit |
| Collision protection | Query existing telegramId sebelum set |
| Token exposure | Bot token HANYA di Vercel server env |
| Audit trail | linkedUserIds + isActive flag |
| Rate limit | Next.js middleware: max 3 POST per IP per 15 menit |
| Unlink | disconnectTelegram mutation tersedia |
| Bot token rotation | Generate new via @BotFather → update Vercel env |
| SRI | Widget script bisa di-SRI, tapi Telegram update versi — accepted risk |

## Rate Limiting (Next.js Middleware)

```typescript
// src/middleware.ts
import { NextResponse } from "next/server";

const rateLimit = new Map<string, number[]>();

export function middleware(request: Request) {
  if (request.method === "POST" && request.url.includes("/api/auth/telegram")) {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    const window = 15 * 60 * 1000; // 15 menit
    const attempts = rateLimit.get(ip) || [];
    const recent = attempts.filter(t => now - t < window);
    
    if (recent.length >= 3) {
      return NextResponse.redirect("/profile?error=rate_limited");
    }
    
    recent.push(now);
    rateLimit.set(ip, recent);
  }
  return NextResponse.next();
}
```

**Note:** Ini in-memory rate limit (tidak persisten). Untuk production, gunakan Redis atau Convex table.

## Deployment Constraints

| Constraint | Mitigation |
|---|---|
| Widget hanya work di 1 domain | Set @BotFather domain ke `perpuskukaan-web.vercel.app` |
| Tidak work di localhost | Development: pakai ngrok tunnel atau bot terpisah |
| Widget JS bisa di-block adblocker | Fallback: tampilkan pesan "Disable adblocker atau chat bot" |
| Tidak work di embedded browsers | Tampilkan pesan "Buka di Chrome/Safari" |
| Custom domain migration | Update @BotFather + Vercel env |

## Telegram-First User Path

Untuk user yang **mulai dari Telegram** dan belum punya akun web:

1. User chat di bot Telegram → bot detect user belum punya linked web account
2. Bot kirim pesan: "Kunjungi perpuskukaan-web.vercel.app untuk menghubungkan akun dan mengakses fitur lengkap"
3. User buka web → sign-in Google → web create new account
4. User klik "Hubungkan Telegram" → widget flow → merge data

**Bot behavior setelah merge:**
- Bot lookup user by telegramId: filter `isActive !== false`
- Jika tidak ketemu (sudah merged) → bot treat sebagai user baru
- Bot bisa prompt: "Akun sudah terhubung ke web. Buka perpuskukaan-web.vercel.app untuk mengelola."

## Implementation Order

1. Set domain di @BotFather: `perpuskukaan-web.vercel.app`
2. Add `isActive` field + `by_reviewer` index ke schema, push to Convex
3. Set `TELEGRAM_BOT_TOKEN` di Vercel env
4. Update `syncUserCreation` → add `isActive: true`
5. Run migration: set `isActive = true` untuk all existing users
6. Create Convex httpAction GET `/api/link-telegram` (render confirm HTML)
7. Create Next.js API route POST `/api/auth/telegram` (verify + merge)
8. Create `users.connectTelegram` mutation (merge logic)
9. Create `users.getAccountLinkStatus` query
10. Create `users.disconnectTelegram` mutation
11. Audit all existing queries — add isActive filter
12. Add Telegram Login Widget to profile page
13. Add rate limit middleware
14. Test: sign-in Google → klik Telegram → confirm → merge → profile updated
15. Test edge cases: expired, collision, no bot user, no session, double POST
16. Commit, push, deploy
