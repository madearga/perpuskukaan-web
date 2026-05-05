# Telegram Bot (via OpenClaw)

## Overview

Perpuskukaan Telegram bot is powered by OpenClaw with a public persona that handles natural-language Indonesian conversations. OpenClaw routes user intents into Convex actions through the public agent gateway.

## Command Mapping (11 commands)

| Telegram Input | Intent | Gateway Action |
|---------------|--------|---------------|
| `/daftar` or "aku mau daftar" | Register | `register` |
| `/tambah` or "aku mau masukin buku" | Add book | `add_book_draft` |
| `/cari` or "ada buku X ga?" | Search books | `search_books` |
| `/bukuku` or "buku aku apa aja" | My books | `my_books` |
| `/pinjam` or "aku mau pinjam buku X" | Borrow request | `borrow_draft` |
| `/pinjaman` or "pinjaman aku apa aja" | My borrows | `my_borrows` |
| `/permintaan` or "ada yang mau pinjam?" | Incoming requests | `incoming_borrow_requests` |
| `/setuju` or "oke setuju" | Approve borrow | `approve_borrow` |
| `/tolak` or "ga bisa pinjam" | Reject borrow | `reject_borrow` |
| `/kembali` or "buku sudah dikembalikan" | Return book | `return_book` |
| `/drop` | Drop point info | Static reply (no Convex action) |

## OpenClaw Persona Rules

Defined in `ops/openclaw/public/system-prompt.md`:

1. **Bahasa Indonesia** — Natural, friendly, concise responses
2. **Convex is source of truth** — Never fabricate book/user/transaction status
3. **No raw commands** — Never expose internal OpenClaw/Hermes/API internals
4. **Allowlisted actions only** — Only the 10 defined publicAgent actions
5. **Follow-up naturally** — Ask for missing data conversationally
6. **Idempotency** — All write actions use `telegram:<messageId>:<action>` key
7. **Auto-register** — If user is unregistered, guide to `/daftar` or auto-register when intent is clear

## Conversation Flow

```text
1. User sends message (text or /command)
2. OpenClaw identifies intent from message
3. If data action needed:
   a. OpenClaw calls POST /api/public-agent/action with action + payload
   b. Route validates secret, dispatches to Convex
   c. Convex resolves identity via userIdentities.by_provider_user
   d. Result returned to OpenClaw
4. OpenClaw composes natural Indonesian reply
```

## Files

| File | Purpose |
|------|---------|
| `ops/openclaw/public/system-prompt.md` | Persona rules and constraints |
| `ops/openclaw/public/examples.md` | Few-shot conversation examples |
| `src/app/api/public-agent/action/route.ts` | HTTP bridge |
| `convex/publicAgent.ts` | Convex action handlers |

## Drop Point

The `/drop` command returns static drop point information. No Convex action is called; OpenClaw responds from persona knowledge.
