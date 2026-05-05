# Public Agent Gateway

## Overview

OpenClaw acts as the public Telegram gateway, routing natural-language conversations into structured Convex actions via a signed HTTP adapter. Convex remains the single source of truth for all library data.

## Architecture

```text
Telegram user
  → OpenClaw (public persona)
    → POST /api/public-agent/action
      → Convex publicAgent mutations/queries
        → Convex DB (users, books, borrowRequests, transactions, agentActions)
```

## HTTP Endpoint

- **Route:** `POST /api/public-agent/action`
- **Auth:** `X-OpenClaw-Secret` header matched against `OPENCLAW_PUBLIC_SECRET` env var
- **Body:** `{ action: string, providerUserId: string, ... }`
- **Response:** `{ ok: true, action: string, result: any }` or `{ error: string }` with appropriate HTTP status

## Allowed Actions (10)

| Action | Convex Function | Type | Description |
|--------|----------------|------|-------------|
| `register` | `publicAgent.registerTelegramUser` | mutation | Register new Telegram user |
| `search_books` | `publicAgent.searchBooks` | query | Full-text search on book titles |
| `my_books` | `publicAgent.getMyBooks` | query | List books owned by user |
| `add_book_draft` | `publicAgent.createBookDraft` | mutation | Create book draft with idempotency |
| `borrow_draft` | `publicAgent.createBorrowDraft` | mutation | Create borrow request draft |
| `my_borrows` | `publicAgent.getMyBorrows` | query | List user's borrow requests + transactions |
| `incoming_borrow_requests` | `publicAgent.getIncomingBorrowRequests` | query | List incoming borrow requests for lender |
| `approve_borrow` | `publicAgent.approveBorrow` | mutation | Accept a pending borrow request |
| `reject_borrow` | `publicAgent.rejectBorrow` | mutation | Reject a pending borrow request |
| `return_book` | `publicAgent.returnBook` | mutation | Mark a book as returned |

## Identity Resolution

All public-agent functions resolve identity through `userIdentities` table:
- Index: `by_provider_user` → `{ provider, providerUserId }`
- Returns linked `users` record or `{ error: "NOT_LINKED" }`

## Idempotency

Write actions (`add_book_draft`, `borrow_draft`, `approve_borrow`, `reject_borrow`, `return_book`) require `idempotencyKey` field.
- Format: `telegram:<messageId>:<action>`
- Duplicate keys return `{ duplicate: true, actionId }` without side effects

## Files

| File | Purpose |
|------|---------|
| `src/app/api/public-agent/action/route.ts` | Signed HTTP route, action dispatch |
| `convex/publicAgent.ts` | All 10 Convex functions |
| `convex/publicAgentQueries.ts` | Read queries for dashboard/UI visibility |
| `ops/openclaw/public/system-prompt.md` | OpenClaw public persona rules |
| `ops/openclaw/public/examples.md` | Few-shot examples |
| `ops/openclaw/scripts/enable-public-gateway.sh` | Cutover: poller → OpenClaw |
| `ops/openclaw/scripts/rollback-to-bot-layer.sh` | Rollback: OpenClaw → poller |

## Security

- No raw gateway commands exposed to users
- Only allowlisted actions dispatched
- Secret-based auth prevents unauthorized access
- No `eval`, `exec`, `spawn`, or `system()` in route handler
