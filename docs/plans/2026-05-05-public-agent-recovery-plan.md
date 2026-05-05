# Public Agent Recovery Plan — Perpuskukaan

Created: 2026-05-05
Status: active

## 1. Problem Frame

Public Telegram moved from OpenClaw to a custom Bot Layer, but user experience became too rigid. Users expect to speak naturally with an AI agent that can help with Perpuskukaan administration and stay in sync with the web UI/Convex data. Current behavior often falls back to deterministic keyword handling, so responses feel like a form bot instead of OpenClaw/Hermes.

## 2. What Went Wrong

### 2.1 Architecture Drift

Initial direction was:

```text
Public user -> OpenClaw/Hermes agent -> Convex tools -> web UI reflects Convex state
```

But implementation drifted into:

```text
Public user -> custom Telegram poller -> Bot Layer keyword/router -> Convex
```

That protected users from raw Hermes commands, but it also removed the agent conversation layer from the public path.

### 2.2 LLM Parser Was Not Reliably Active

The Bot Layer was intended to use LLM intent parsing, then fall back to rules. In production, Z.AI failed:

```text
HTTP 429
{"error":{"code":"1113","message":"Insufficient balance or no resource package. Please recharge."}}
```

Because this failure was swallowed silently, the bot fell back to local rules. Local rules only recognize narrow patterns like `cari`, `buku saya`, `daftar`, so natural text feels stiff.

NVIDIA was added as fallback, but model ID/config needed correction:

```text
works: nvidia/nemotron-3-super-120b-a12b
wrong in code before fix: nvidia/nvidia/nemotron-3-super-120b-a12b
```

### 2.3 Missing Observability

`perpuskukaan-telegram-poller.service` only logged startup. It did not log:

- incoming message id/channel
- chosen intent
- provider used (`zai`, `nvidia`, `fallback`)
- LLM error cause
- Convex mutation/query result

So failures looked random instead of diagnosable.

### 2.4 Identity Model Split

Bot Layer reads users through `userIdentities`, while older Telegram logic used `users.telegramId`. New users were not in `userIdentities`, so they saw:

```text
Akun ini belum terhubung ke Perpuskukaan...
```

This was partially fixed by `users.registerFromBot` and `upsertTelegramIdentity`, but the UX still needs a first-class onboarding flow.

### 2.5 Public Gateway Decision Was Unclear

Hermes direct gateway exposed built-in command behavior and was judged unsafe for public users. But replacing it with a thin Bot Layer made the public agent non-agentic. The missing middle ground is:

```text
Public-safe Agent Gateway
= OpenClaw/Hermes conversation runtime
+ strict public persona/system prompt
+ allowlisted Convex tools only
+ no raw built-in/admin command surface
```

## 3. Target Architecture

Use Bot Gateway as channel guardrail, not as brain.

```text
Telegram / WhatsApp / Web Chat
  -> Public Agent Gateway
      -> OpenClaw or Hermes public persona
          -> Convex tools only
              -> Convex source of truth
                  -> Vercel Next.js web UI reads same Convex data
```

### Roles

- **Vercel Next.js**: web UI, dashboard, catalog, profile, account linking.
- **VM Bot Gateway**: Telegram polling/webhook, WhatsApp Baileys, request logging, rate limits, secret handling.
- **OpenClaw/Hermes Public Agent**: natural conversation and tool orchestration.
- **Convex**: source of truth for users, channel identities, books, borrow requests, transactions, audit logs.

## 4. Core Decisions

1. **Public user should talk to an agent, not keyword router.**
   - Bot Layer remains only a transport/guardrail.

2. **Convex remains source of truth.**
   - No direct DB writes from OpenClaw/Hermes outside Convex functions.

3. **Public agent tools must be allowlisted.**
   - Allowed: search books, get my books, register, add book draft, request borrow.
   - Not allowed: unrestricted shell, filesystem, web admin commands, raw Hermes built-ins.

4. **Admin and public personas must be separate.**
   - Public persona: customer service + library assistant.
   - Admin persona: operator-only, authenticated, high-risk confirmations.

5. **One Telegram token owner at a time.**
   - Do not run OpenClaw polling and Bot Gateway/Hermes polling with same token simultaneously.

## 5. Implementation Units

### Unit 1 — Stabilize Current Production

Files:

- `src/lib/bot/intent-parser.ts`
- `src/lib/bot/router.ts`
- `src/lib/bot/replies.ts`
- `bot-service/` or `ops/bot-layer/`

Work:

- Keep `perpuskukaan-web.service` and `perpuskukaan-telegram-poller.service` active.
- Ensure NVIDIA fallback uses `nvidia/nemotron-3-super-120b-a12b`.
- Add logs for provider selection and intent decision.
- Make LLM errors visible in journal without leaking secrets.
- If both LLM providers fail, send a friendly degraded-mode response instead of pretending the bot understands everything.

Tests:

- `tests/bot-intent-schema.test.mjs`
- `tests/bot-router-surface.test.mjs`
- Add scenario: Z.AI failure -> NVIDIA success -> no local fallback.
- Add scenario: both providers fail -> graceful degraded response.

### Unit 2 — Public Agent Gateway Contract

Files:

- `src/lib/bot/router.ts`
- `src/lib/bot/convex-client.ts`
- new: `src/lib/bot/public-agent.ts`
- new tests: `tests/public-agent-gateway.test.mjs`

Work:

- Replace direct intent-only routing with an agent gateway interface:

```text
handlePublicMessage(message)
  -> call OpenClaw/Hermes public runtime
  -> runtime can call allowlisted Convex tools
  -> return human-style Indonesian answer
```

- Keep deterministic fallback only for outage mode.
- Tool calls must be structured and audited.

Allowed public tools:

- `registerFromBot`
- `searchBooksForAgent`
- `getMyBooksForAgent`
- `addBookFromAgent` as draft/confirmed action
- borrow request draft/create function once available

Tests:

- Natural Indonesian query maps to tool call, not keyword-only response.
- Built-in commands like `/add` do not leak raw OpenClaw/Hermes command surface.
- High-risk/admin tool calls rejected for public user.

### Unit 3 — OpenClaw/Hermes Public Runtime Selection

Files:

- `ops/hermes/skills/perpuskukaan-admin/SKILL.md`
- new: `ops/hermes/skills/perpuskukaan-public/SKILL.md`
- optional: `ops/openclaw/perpuskukaan-public.md`
- `docs/bot-layer.md`

Work:

- Create `perpuskukaan-public` persona with explicit scope:
  - speak Indonesian naturally
  - guide users through registration, adding books, searching, borrowing
  - call only Convex public tools
  - never expose shell/admin/internal commands

- Decide runtime after short bake-off:
  1. **OpenClaw public runtime** if it is easier to wire Telegram and tool calls fast.
  2. **Hermes public runtime** if its skill/tool isolation is cleaner and stable.

Acceptance criteria:

- User can say: `aku mau nitip buku ini ke katalog`
- Agent asks missing info naturally.
- When complete, agent creates a Convex action/draft.
- Web dashboard shows the resulting data.

### Unit 4 — Convex Identity and Admin Flow

Files:

- `convex/users.ts`
- `convex/agentBooks.ts`
- `convex/agentActions.ts`
- `convex/borrowRequests.ts`
- `convex/schema.ts`

Work:

- Ensure bot-only Telegram users, web users, and merged users share the same canonical Convex user identity.
- Keep `userIdentities` as channel mapping table.
- Add clear linking states:
  - bot-only user
  - web-only user
  - linked web+Telegram user
  - merged historical Telegram user

Tests:

- New Telegram user sends `daftar` -> user + identity created.
- Same Telegram user later links web account -> data merges or identity re-points safely.
- Existing linked user can search/add/list books.

### Unit 5 — Observability and Rollback

Files:

- `ops/bot-layer/README.md`
- `ops/bot-layer/deploy-vm.sh`
- new: `ops/bot-layer/rollback-openclaw.sh`
- new: `ops/bot-layer/status.sh`

Work:

- Add operator commands:

```bash
./ops/bot-layer/status.sh
./ops/bot-layer/rollback-openclaw.sh
```

Status should show:

- active service owner of Telegram token
- OpenClaw state
- Bot Gateway state
- last 20 public messages redacted
- current LLM provider health
- Convex function health

Rollback should:

- stop public poller
- disable poller
- enable/start OpenClaw
- verify Telegram mode

## 6. Rollout Plan

### Phase A — Stop Bleeding

- Keep current Bot Gateway active only if `daftar`, `bantuan`, and basic search work.
- If live user UX is unacceptable, rollback to OpenClaw immediately while gateway is fixed.

### Phase B — Fix LLM Path

- Use provider chain:

```text
Z.AI glm-5 -> NVIDIA nemotron -> local fallback
```

- Add logs showing active provider per message.
- Confirm natural language cases:
  - `eh ada ga buku masak?` -> search_books
  - `koleksi buku aku apa aja?` -> my_books
  - `aku mau daftar` -> bot_register

### Phase C — Agent Runtime Bake-off

Run same 20 public conversations against:

1. OpenClaw public persona
2. Hermes public skill/persona
3. Current Bot Gateway + LLM router

Score:

- naturalness
- tool correctness
- safety/no command leakage
- Convex consistency
- latency
- rollback simplicity

Choose one public runtime.

### Phase D — Full Public Agent Cutover

- Public Telegram routes to chosen agent runtime.
- Agent tools call Convex only.
- Web UI remains Vercel and reflects Convex state.
- Keep OpenClaw/Hermes alternate path as rollback for 48 hours.

## 7. Acceptance Criteria

User can send natural Indonesian messages:

```text
aku mau daftar
aku lagi cari buku parenting
buku aku apa aja ya?
aku mau masukin buku laskar pelangi, kondisinya bagus
aku mau pinjam buku atomic habits seminggu
```

Expected:

- agent replies naturally
- agent asks follow-up questions when data missing
- no raw OpenClaw/Hermes commands leak
- Convex receives all writes
- web UI sees data after refresh/realtime update
- logs show provider/tool path
- rollback to OpenClaw works in under 2 minutes

## 8. Current Known State

As of this plan:

```text
perpuskukaan-web.service: active
perpuskukaan-telegram-poller.service: active
openclaw.service: inactive
Z.AI: failing with 429 / insufficient resource package
NVIDIA: reachable with model nvidia/nemotron-3-super-120b-a12b
```

There are pending code edits in `src/lib/bot/intent-parser.ts` and `tests/bot-intent-schema.test.mjs` to correct NVIDIA fallback model ID.

## 9. Recommended Next Move

Do not keep iterating blindly in production. Next action should be a focused repair pass:

1. Commit/deploy NVIDIA provider fix.
2. Add provider/intent logging.
3. Test 10 natural Telegram messages.
4. If still stiff, rollback to OpenClaw while building proper OpenClaw/Hermes public persona.
5. Then run the bake-off and choose final public runtime.
