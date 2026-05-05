# Convex Data Model

## Overview

Single Convex deployment serves as source of truth for all Perpuskukaan data: users, identities, books, borrowing, transactions, agent actions, reviews, wishlists, and site content.

## Tables

### users
Canonical user records for both web (Better Auth) and Telegram (OpenClaw) users.

| Field | Type | Notes |
|-------|------|-------|
| email | `optional string` | From Better Auth |
| telegramId | `optional string` | From Telegram registration |
| username | `optional string` | Display username |
| firstName | `optional string` | |
| lastName | `optional string` | |
| phone | `optional string` | |
| location | `optional string` | |
| bio | `optional string` | |
| avatar | `optional string` | URL |
| reputation | `optional number` | Default: 100 |
| totalBooksShared | `optional number` | Default: 0 |
| totalBorrows | `optional number` | Default: 0 |
| totalLends | `optional number` | Default: 0 |
| isVerified | `optional boolean` | |
| isAdmin | `optional boolean` | |
| isActive | `optional boolean` | |
| role | `optional string` | `"user"` or `"admin"` |
| linkedUserIds | `optional array<id("users")>` | Cross-linked accounts |
| createdAt | `number` | Unix timestamp |
| updatedAt | `number` | Unix timestamp |

**Indexes:** `email`, `by_telegram_id`, `by_username`

### userIdentities
Maps provider-specific IDs (Telegram, WhatsApp, web) to canonical users.

| Field | Type | Notes |
|-------|------|-------|
| userId | `id("users")` | FK to users |
| provider | `union<"telegram","whatsapp","web">` | |
| providerUserId | `string` | Provider-specific user ID |
| username | `optional string` | |
| displayName | `optional string` | |
| verifiedAt | `number` | |
| createdAt | `number` | |
| updatedAt | `number` | |

**Indexes:** `by_user`, `by_provider_user` (composite: `[provider, providerUserId]`)

### books
All books in the system.

| Field | Type | Notes |
|-------|------|-------|
| ownerId | `id("users")` | |
| title | `string` | |
| author | `string` | |
| isbn | `optional string` | |
| description | `optional string` | |
| category | `string` | |
| condition | `string` | |
| coverImage | `optional string` | URL |
| coverStorageId | `optional id("_storage")` | Convex storage |
| status | `string` | `"available"`, `"borrowed"`, `"lent"`, `"reserved"` |
| mode | `string` | |
| language | `optional string` | |
| fictionType | `optional string` | |
| createdAt | `number` | |
| updatedAt | `number` | |

**Indexes:** `by_owner`, `by_status`, `by_category`, `by_language`, `by_fiction_type`
**Search indexes:** `search_books` (title), `search_authors` (author)

### borrowRequests
Borrow requests from borrowers to lenders.

| Field | Type | Notes |
|-------|------|-------|
| bookId | `id("books")` | |
| borrowerId | `id("users")` | |
| lenderId | `id("users")` | |
| message | `optional string` | |
| durationDays | `number` | |
| status | `string` | `"pending"`, `"approved"`, `"rejected"` |
| source | `optional string` | `"web"` or `"telegram"` |
| createdAt | `number` | |
| respondedAt | `optional number` | |
| rejectionReason | `optional string` | |

**Indexes:** `by_book`, `by_borrower`, `by_lender`, `by_status`

### transactions
Active and completed borrow transactions.

| Field | Type | Notes |
|-------|------|-------|
| bookId | `id("books")` | |
| borrowerId | `id("users")` | |
| lenderId | `id("users")` | |
| requestId | `id("borrowRequests")` | |
| borrowDate | `number` | |
| dueDate | `number` | |
| returnDate | `optional number` | |
| status | `string` | `"active"`, `"returned"` |
| lastReminderDate | `optional number` | |

**Indexes:** `by_borrower`, `by_lender`, `by_status`

### reviews
Post-transaction reviews between users.

| Field | Type | Notes |
|-------|------|-------|
| transactionId | `id("transactions")` | |
| reviewerId | `id("users")` | |
| revieweeId | `id("users")` | |
| bookId | `id("books")` | |
| rating | `number` | |
| comment | `optional string` | |
| type | `string` | |
| createdAt | `number` | |

**Indexes:** `by_book`, `by_reviewee`, `by_reviewer`

### wishlist
Book wishlists per user.

| Field | Type | Notes |
|-------|------|-------|
| userId | `id("users")` | |
| bookId | `id("books")` | |
| createdAt | `number` | |

**Indexes:** `by_user`, `by_book`

### agentActions
Audit log for all public-agent actions (idempotent operations).

| Field | Type | Notes |
|-------|------|-------|
| channel | `string` | `"telegram"`, `"whatsapp"` |
| providerUserId | `string` | |
| appUserId | `optional id("users")` | |
| action | `string` | e.g. `"public.createBookDraft"` |
| idempotencyKey | `string` | Format: `telegram:<msgId>:<action>` |
| input | `string` | JSON serialized |
| status | `union<"drafted","confirmed","applied","rejected","failed">` | |
| resultSummary | `optional string` | |
| resultJson | `optional string` | |
| error | `optional string` | |
| createdAt | `number` | |
| updatedAt | `number` | |

**Indexes:** `by_idempotency_key`, `by_channel_user` (composite: `[channel, providerUserId]`), `by_app_user`

### siteContent
Dynamic content for web pages.

| Field | Type | Notes |
|-------|------|-------|
| key | `string` | e.g. `"help-page"` |
| markdown | `string` | Markdown content |
| updatedAt | `number` | |

**Indexes:** `by_key`

## Key Convex Modules

| File | Purpose |
|------|---------|
| `convex/publicAgent.ts` | 10 public-facing mutations/queries |
| `convex/publicAgentQueries.ts` | Dashboard read queries |
| `convex/books.ts` | Book CRUD, search, stats |
| `convex/users.ts` | User management, auth |
| `convex/borrowRequests.ts` | Borrow request CRUD |
| `convex/transactions.ts` | Transaction management |
| `convex/wishlist.ts` | Wishlist operations |
| `convex/agentActions.ts` | Agent action helpers |
| `convex/agentBooks.ts` | Agent book helpers |
| `convex/siteContent.ts` | Site content queries |
| `convex/schema.ts` | Schema definition |
