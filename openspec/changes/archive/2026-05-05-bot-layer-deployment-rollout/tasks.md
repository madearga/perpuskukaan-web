# Tasks — Bot Layer Deployment + Rollout

**Status:** ✅ Completed (deprecated in favor of OpenClaw)

## Task 1: Prepare deployment environment inventory
- [x] Verify local repo clean and checks green
- [x] Inspect VM current web services
- [x] Decide target runtime port (3001)

## Task 2: Create VM deployment scripts
- [x] Write tests for deploy scripts
- [x] Create systemd service file
- [x] Create deploy-vm.sh script
- [x] Create README

## Task 3: Prepare VM environment
- [x] Create remote directories
- [x] Set up .env.production
- [x] Verify env presence

## Task 4: Deploy web/API service
- [x] Run deploy script
- [x] Verify local VM API route
- [x] Verify no Telegram webhook changed

## Task 5-8: Reverse proxy, Telegram staging, cutover, WhatsApp
- [x] Superseded by OpenClaw public gateway approach
