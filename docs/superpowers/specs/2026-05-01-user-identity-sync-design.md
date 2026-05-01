# User Identity Sync: Telegram ↔ Web (Google Sign-in)

## Problem

Perpuskukaan punya dua interface: Telegram bot (OpenClaw) dan Web UI (Next.js). User bisa mulai dari mana saja. Perlu mekanisme sinkronisasi identitas agar satu user punya satu akun tergabung.

## Skenario

| Skenario | User mulai dari | Kondisi |
|---|---|---|
| **A** | Web (Google sign-in) | User baru, belum punya akun Telegram |
| **B** | Telegram bot | User sudah punya data (buku, reputasi, dll) |

Kedua skenario harus converge ke **satu user row** dengan `email` + `telegramId`.

## Architecture

```
┌──────────────┐         ┌──────────────┐
│  Web (Google) │         │ Telegram Bot  │
│  Sign-in      │         │ (OpenClaw)    │
└──────┬───────┘         └──────┬───────┘
       │                        │
       │ 1. Sign-in Google      │
       │ → create/update user   │
       │                        │
       │ 2. Klik "Hubungkan     │
       │    Telegram"            │
       │ → generate link_token  │
       │ → deep link to bot     │
       │                        │
       │              3. Bot detect /start link_*
       │              → OpenClaw skill
       │              → call Convex API
       │              → merge accounts
       │              → reply ✅
       │                        │
       │ 4. Web refresh         │
       │ → user now has         │
       │   email + telegramId   │
       └────────────────────────┘
```

## Data Model

### New Table: `accountLinks`

```typescript
accountLinks: defineTable({
  userId: v.id("users"),       // web user (created via Google sign-in)
  linkToken: v.string(),       // random 32-char hex token
  expiresAt: v.number(),       // 15 minutes from creation
  createdAt: v.number(),
})
  .index("by_token", ["linkToken"])
  .index("by_user", ["userId"])
```

### Users Table (existing, no changes)

Already has `email`, `telegramId`, `linkedUserIds`. No schema changes needed.

## Flow Detail

### Step 1: Web User Signs In (Google)

- Better Auth creates user row: `{ email, role: "user", ... }`
- No `telegramId` yet

### Step 2: Web Detects Unlinked Account

- Query `users.getAccountLinkStatus` → returns `{ hasTelegram: boolean }`
- If `telegramId === undefined` → show "Hubungkan Telegram" button on profile page

### Step 3: Generate Link Token

- User clicks button → mutation `users.generateLinkToken`
- Creates `accountLinks` row with random token, expires in 15 min
- Returns deep link: `https://t.me/Perpuskukaanbot?start=link_{token}`
- Web shows button "Buka Telegram" that opens this link

### Step 4: OpenClaw Skill Processes Link

OpenClaw skill `account-link`:

1. Detect `/start link_ABC123...` message (trigger: regex `^/start link_`)
2. Extract token from message
3. Call Convex HTTP API mutation `users.linkTelegram`:
   ```json
   { "linkToken": "ABC123...", "telegramId": "974548226", "username": "madearga", "firstName": "Admin" }
   ```
4. Convex merges accounts (see merge logic below)
5. Bot replies: "✅ Akun Telegram terhubung dengan madearga.works@gmail.com!"

### Step 5: Web Reflects Merge

- Web polls or realtime update detects `telegramId` now present
- "Hubungkan Telegram" button disappears
- Profile shows Telegram info

## Merge Logic (Convex mutation `users.linkTelegram`)

```
Input: { linkToken, telegramId, username, firstName }

1. Find accountLink by token → get webUserId
2. Validate: token not expired, not already used
3. Find bot user by telegramId in users table
4. If bot user exists:
   a. Copy fields from bot user → web user:
      - telegramId, username, firstName, lastName, phone
      - location, bio, avatar
      - reputation (max of both), totalBooksShared (sum), etc.
   b. Reassign all related data:
      - books: update ownerId from bot user → web user
      - borrowRequests: update borrowerId/lenderId
      - transactions: update borrowerId/lenderId
      - wishlist: update userId
      - reviews: update reviewerId/revieweeId
   c. Delete bot user row
5. If bot user NOT found (user never used bot):
   a. Just set telegramId, username, firstName on web user
6. Delete accountLink token
7. Return { success: true, email: webUser.email }
```

## OpenClaw Skill Definition

File: `~/.openclaw/skills/account-link/SKILL.md`

```yaml
name: account-link
emoji: 🔗
description: Hubungkan akun Telegram dengan akun web Perpuskukaan
triggers:
  - /start link_
```

Skill body: extract token from `/start link_XXXX`, call Convex API via curl:

```bash
curl -s "https://watchful-rook-105.convex.cloud/api/mutation" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "users:linkTelegram",
    "args": {
      "linkToken": "EXTRACTED_TOKEN",
      "telegramId": "USER_TELEGRAM_ID",
      "username": "USERNAME",
      "firstName": "FIRST_NAME"
    }
  }'
```

## Edge Cases

| Case | Handling |
|---|---|
| Token expired | Mutation returns error → bot: "Token kadaluarsa. Buka web dan generate ulang." |
| Token already used | Mutation returns error → bot: "Token sudah dipakai." |
| User already linked (telegramId exists) | Web doesn't show link button |
| Bot user not found | Just set telegramId on web user, no data transfer |
| Double-click deep link | Idempotent — token deleted after first use |
| Multiple web sessions | Token tied to one userId, one-time use |

## Convex Functions Needed

### New mutations/queries

1. `users.generateLinkToken` — creates accountLinks row, returns deep link URL
2. `users.linkTelegram` — merges accounts (called by bot via HTTP API)
3. `users.getAccountLinkStatus` — returns { hasTelegram, telegramUsername }

### Existing (no changes)

- `users.syncUserCreation` — Better Auth hook
- `users.updateProfile` — profile editing

## Security

- Link tokens: 32-char hex random, single-use, 15-min TTL
- No PII in tokens (just random string)
- Convex mutation validates token before merging
- Only the Telegram user who owns the bot account can trigger the link (deep link opens their Telegram)
- Rate limit: max 5 token generations per user per hour

## Implementation Order

1. Add `accountLinks` table to Convex schema
2. Create `users.generateLinkToken` mutation
3. Create `users.linkTelegram` mutation (with merge logic)
4. Create `users.getAccountLinkStatus` query
5. Add "Hubungkan Telegram" UI to web profile page
6. Create OpenClaw `account-link` skill on server
7. Test end-to-end: web → generate → Telegram → link → web refresh
8. Test edge cases: expired token, already linked, no bot user
