# Public Agent Recovery Plan

**Status:** ✅ Completed  
**Date:** 2026-05-05  
**Original file:** `docs/plans/2026-05-05-public-agent-recovery-plan.md`

## Summary

Root-cause analysis and recovery plan for the public Telegram experience. The bot had drifted from an agentic conversation layer (OpenClaw/Hermes) to a rigid keyword router, due to LLM parser failures (Z.AI 429s), missing observability, and identity model splits. The plan restored natural conversation by re-establishing OpenClaw as the public agent gateway.

## Key problems identified

1. Architecture drifted from OpenClaw to custom Bot Layer keyword router
2. Z.AI `glm-5.1` returning 429s, silently falling back to deterministic rules
3. NVIDIA model ID misconfigured (double `nvidia/` prefix)
4. No logging of provider selection, intent decisions, or error causes
5. Identity split between `users.telegramId` and `userIdentities`

## What was done

1. Fixed NVIDIA provider model ID
2. Added provider/intent logging
3. Restored OpenClaw as public Telegram gateway
4. Created public agent persona with allowlisted Convex tools
5. Unified identity model through `userIdentities.by_provider_user`

## Outcome

OpenClaw handles public conversations naturally, calling only allowlisted Convex actions. All writes go through Convex. Web UI stays in sync.
