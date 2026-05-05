# Perpuskukaan Bot Layer

Perpuskukaan uses a public-safe Bot Layer for Telegram, WhatsApp, and Web chat.

```text
Telegram / WhatsApp / Web chat
  -> Perpuskukaan Bot Layer
  -> Hermes or LLM intent parser
  -> Convex functions
  -> user reply
```

## Why not expose Hermes gateway directly?

Do not expose Hermes gateway directly to public users. Hermes is an agent/operator runtime with built-in commands and broad tool surface. Public users should see Perpuskukaan product behavior only.

## Responsibilities

### Bot Layer

- normalize channel messages
- parse natural language intent
- ask follow-up questions
- enforce confirmation flows
- call Convex functions
- send channel replies

### Hermes / LLM

Hermes is the AI brain for parsing, reasoning, summaries, and admin help. It should not bypass Convex permissions.

### Convex

Convex is the source of truth for users, books, borrow requests, transactions, identities, idempotency, and audit logs.

## Channels

- Telegram uses `/api/telegram/webhook`.
- Web chat uses `/api/chat`.
- WhatsApp uses the Baileys adapter in `bot-service/whatsapp.ts`.

## MVP Intents

- `help`
- `search_books`
- `add_book`
- `borrow_book`
- `my_books`
- `fallback_chat`
