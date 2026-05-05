# Tasks — OpenClaw Public Convex Sync

**Status:** ✅ All completed

## Task 1: Build Convex public-agent contract
- [x] Write failing tests for public-agent surface
- [x] Write minimal Convex public-agent implementation (registerTelegramUser, searchBooks, getMyBooks, createBookDraft, createBorrowDraft)
- [x] Run tests → PASS

## Task 2: Add signed local action route for OpenClaw
- [x] Create `src/app/api/public-agent/action/route.ts`
- [x] Route validates X-OpenClaw-Secret header
- [x] Dispatches only allowlisted actions
- [x] Tests pass

## Task 3: Define OpenClaw public persona and rollout scripts
- [x] Write `ops/openclaw/public/system-prompt.md`
- [x] Write `ops/openclaw/public/examples.md`
- [x] Write enable/rollback scripts
- [x] Tests pass

## Task 4: Surface OpenClaw + Convex state in web UI
- [x] Profile shows Telegram/OpenClaw linking state
- [x] Dashboard shows recent public agent actions

## Task 5: Cut over safely and verify end-to-end
- [x] Local checks pass (test, lint, build)
- [x] Convex deployed
- [x] OpenClaw enabled as sole Telegram owner
- [x] Telegram and web UI verified
