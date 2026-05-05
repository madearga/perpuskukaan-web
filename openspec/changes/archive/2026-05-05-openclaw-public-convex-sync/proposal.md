# OpenClaw Public Convex Sync

**Status:** ✅ Completed  
**Date:** 2026-05-05  
**Original file:** `docs/plans/2026-05-05-openclaw-public-convex-sync.md`

## Summary

Restored OpenClaw as the sole public Telegram gateway, routing natural conversations into Convex through a signed local HTTP adapter. Convex remains the single source of truth; the web UI reads the same Convex tables for profile, dashboard, and activity state.

## What was done

1. Built `convex/publicAgent.ts` with 5 initial actions (register, searchBooks, getMyBooks, createBookDraft, createBorrowDraft)
2. Created `src/app/api/public-agent/action/route.ts` — signed route with allowlisted action dispatch
3. Defined OpenClaw public persona in `ops/openclaw/public/system-prompt.md` and examples
4. Added rollout/rollback scripts (`enable-public-gateway.sh`, `rollback-to-bot-layer.sh`)
5. Surfaced OpenClaw + Convex state in web UI (profile Telegram status, dashboard public actions)

## Outcome

OpenClaw handles public Telegram conversations naturally, calling Convex for all data operations. Web UI stays in sync via real-time Convex subscriptions.
