# Bot Layer Deployment + Rollout

**Status:** ✅ Completed (bot layer deprecated, replaced by OpenClaw public gateway)  
**Date:** 2026-05-05  
**Original file:** `docs/plans/2026-05-05-bot-layer-deployment-rollout.md`

## Summary

Plan for deploying a custom Next.js Bot Layer to VM as a separate web service, with phased rollout: web/API staging first, then Telegram webhook cutover, then WhatsApp. Included deployment scripts, systemd service, and rollback procedures.

## What was done

1. Created VM deployment scripts (`ops/bot-layer/deploy-vm.sh`, systemd service)
2. Deployed Next.js app to VM on port 3001
3. Tested API routes before any Telegram changes
4. Eventually, the bot layer approach was deprecated in favor of OpenClaw as the public Telegram gateway

## Outcome

The bot layer served as a transitional architecture. OpenClaw now handles all public Telegram conversations directly, with Convex as the data backend. The deployment infrastructure (systemd, rsync, env management) informed later OpenClaw cutover scripts.
