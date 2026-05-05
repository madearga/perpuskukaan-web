---
name: perpuskukaan-admin
description: Use when operating Perpuskukaan library workflows from Hermes, Telegram, WhatsApp, or other chat channels, especially when reading or mutating Convex-backed books, users, borrow requests, transactions, or admin actions.
---

# Perpuskukaan Admin

## Core Rule

Convex is the source of truth. Hermes is only the natural-language operator. Never treat chat memory, session state, or agent reasoning as authoritative for books, users, borrow requests, or transactions.

## Allowed Flow

```text
Telegram / WhatsApp / Dashboard
  -> Hermes intent parsing
  -> narrow Perpuskukaan tool/API call
  -> Convex query/mutation/action
  -> audited response back to channel
```

## Never Do

- Do not write directly to Convex tables from shell scripts.
- Do not expose Hermes/OpenClaw gateway ports publicly without auth.
- Do not execute irreversible actions from a vague confirmation like "ya".
- Do not create duplicate books or borrow requests without checking idempotency.
- Do not decide permissions inside the LLM prompt; enforce them in Convex.

## Identity Rules

Use channel identities only to look up verified app users:

- Telegram: `provider = "telegram"`, `providerUserId = telegram sender id`
- WhatsApp: `provider = "whatsapp"`, `providerUserId = WhatsApp JID or normalized phone`
- Web: Better Auth user email/session

If the channel identity is not linked, respond with a linking URL or instruction. Do not create transactional records for unlinked users except an explicit low-risk onboarding draft.

## Write Action Confirmation

For destructive or administrative writes, use a two-step confirmation:

1. Produce a concise summary and a nonce-based confirmation phrase.
2. Execute only when the user replies with the exact phrase.

Example:

```text
Saya akan approve permintaan pinjam "Atomic Habits" oleh Rina selama 7 hari.
Balas persis: KONFIRMASI APPROVE BR-8K2M
```

Low-risk writes that may execute immediately after parsing:

- search catalog
- list my books
- add a book owned by the requesting linked user, if arguments are complete
- create a borrow request for the requesting linked user, if book is available

High-risk writes that require exact confirmation:

- accept/reject borrow request
- mark returned/lost/damaged
- delete/archive book
- change another user's role/status
- broadcast messages
- bulk import/update

## Idempotency

Every channel-originated write must include an idempotency key:

```text
channel:messageId:actionName
telegram:123456789:addBook
whatsapp:ABCD1234:createBorrowRequest
```

If a duplicate key is seen, return the previously recorded result.

## Audit Log Minimum

For every agent-originated Convex write, record:

- `channel`
- `providerUserId`
- `appUserId` when resolved
- `action`
- `idempotencyKey`
- sanitized `input`
- `status`: `drafted | confirmed | applied | rejected | failed`
- `resultSummary`
- `createdAt`

## Error Style

Return user-safe errors in Indonesian. Include what the user can do next.

```text
Aku belum bisa lanjut karena akun WhatsApp ini belum terhubung ke Perpuskukaan.
Buka dashboard lalu hubungkan WhatsApp, atau kirim /link untuk panduan.
```

## Verification Before Claiming Success

After changing production gateway or Convex integration:

```bash
pnpm test
pnpm lint
pnpm build
ssh perpuskukaan.exe.xyz 'systemctl --user status hermes-gateway --no-pager || systemctl status hermes-gateway --no-pager'
```

For channel cutover, verify one read and one safe write from the actual channel before removing the previous gateway.
