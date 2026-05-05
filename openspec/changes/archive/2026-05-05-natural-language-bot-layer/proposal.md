# Natural Language Bot Layer

**Status:** ❌ Deprecated  
**Date:** 2026-05-05  
**Original file:** `docs/plans/2026-05-05-natural-language-bot-layer.md`

## Summary

Extensive plan to build a public-safe Perpuskukaan bot layer supporting natural-language conversations across Telegram, WhatsApp, and web. The Bot Layer would normalize channel messages into a `BotMessage` contract, use an intent parser (LLM-backed), route to Convex functions, and manage identity/audit.

## Why it was deprecated

The Bot Layer approach introduced a custom chat router between users and the AI agent. This:
- Removed the conversational agent from the public path
- Relied on brittle intent parsing (Z.AI 429 failures, NVIDIA config errors)
- Created a rigid keyword fallback that felt like a form bot
- Required maintaining parallel channel adapters

Instead, OpenClaw was restored as the public agent gateway with:
- Native natural-language conversation (OpenClaw is an agent, not a router)
- Persona-based constraints (allowlisted actions only)
- Direct Convex integration via signed HTTP route
- No custom intent parser needed

## Lessons carried forward

- Allowlisted Convex actions concept → adopted in publicAgent
- Channel identity model → adopted in userIdentities
- Idempotent writes → adopted in agentActions
- Audit logging → adopted in agentActions
