# Tasks — Public Agent Recovery

**Status:** ✅ Completed

## Unit 1: Stabilize current production
- [x] Fix NVIDIA fallback model ID (`nvidia/nemotron-3-super-120b-a12b`)
- [x] Add provider selection and intent logging
- [x] Graceful degraded-mode response when both LLMs fail

## Unit 2: Public Agent Gateway Contract
- [x] Replace direct intent routing with agent gateway interface
- [x] Define allowlisted public tools
- [x] Natural Indonesian query maps to tool calls

## Unit 3: OpenClaw/Hermes public runtime selection
- [x] Created `perpuskukaan-public` persona
- [x] OpenClaw selected as public runtime

## Unit 4: Convex Identity and Admin Flow
- [x] Unified identity through userIdentities table
- [x] Clear linking states: bot-only, web-only, linked, merged

## Unit 5: Observability and Rollback
- [x] Status and rollback operator scripts
- [x] OpenClaw cutover/rollback verified
