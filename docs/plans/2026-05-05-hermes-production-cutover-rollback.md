# Hermes Production Cutover + Rollback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut over `@Perpuskukaanbot` on `perpuskukaan.exe.xyz` from OpenClaw to Hermes with a tested rollback path, then delay OpenClaw deletion until Hermes is stable.

**Architecture:** OpenClaw remains installed as rollback while Hermes imports OpenClaw config/secrets, starts the Telegram gateway, and passes smoke tests. Final OpenClaw removal is a separate post-stability plan and must not happen during cutover.

**Tech Stack:** Hermes Agent CLI, OpenClaw, Telegram polling, systemd, Bash, SSH, Perpuskukaan Convex-backed web app.

---

## Hard Safety Rules

- Do not delete `~/.openclaw` during this cutover.
- Do not disable/remove `openclaw.service` during this cutover.
- Do not pair WhatsApp during this cutover.
- Do not expose secrets in logs or chat.
- Do not run both OpenClaw and Hermes gateway with the same Telegram bot token.
- If Hermes fails Telegram smoke tests, rollback immediately to OpenClaw.

---

## Task 1: Local and VM Preflight

**Files:**
- Read: `ops/hermes/scripts/preflight.sh`
- Read: `ops/hermes/scripts/migrate-openclaw-to-hermes.sh`
- Read: `ops/hermes/scripts/cutover-to-hermes.sh`

- [ ] **Step 1: Verify local repo clean and checks green**

Run:

```bash
cd ~/Desktop/perpuskukaan-web
git status --short
pnpm test
pnpm lint
pnpm build
```

Expected:

- status empty
- tests pass
- lint 0 errors
- build succeeds

- [ ] **Step 2: Verify VM resource health**

Run:

```bash
ssh perpuskukaan.exe.xyz 'bash ~/perpuskukaan-web/ops/hermes/scripts/preflight.sh'
```

Expected:

- OpenClaw active
- Hermes installed
- RAM available > 1GB
- disk available > 2GB

- [ ] **Step 3: Verify Telegram bot conflict risk**

Run:

```bash
ssh perpuskukaan.exe.xyz 'systemctl is-active openclaw; export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"; hermes gateway status || true'
```

Expected:

- OpenClaw active
- Hermes gateway not running

---

## Task 2: Create Rollback Snapshot

**Files:**
- Remote backup output: `~/backups/perpuskukaan-hermes/openclaw-cutover-*.tgz`
- Remote backup output: `~/backups/perpuskukaan-hermes/hermes-cutover-*.tgz` if `.hermes` exists

- [ ] **Step 1: Create backups without stopping services**

Run:

```bash
ssh perpuskukaan.exe.xyz 'set -euo pipefail; BACKUP_DIR="$HOME/backups/perpuskukaan-hermes"; STAMP="$(date +%Y%m%d%H%M%S)"; mkdir -p "$BACKUP_DIR"; tar -C "$HOME" -czf "$BACKUP_DIR/openclaw-cutover-$STAMP.tgz" .openclaw; if [ -d "$HOME/.hermes" ]; then tar -C "$HOME" -czf "$BACKUP_DIR/hermes-cutover-$STAMP.tgz" .hermes; fi; ls -lh "$BACKUP_DIR"/*cutover-$STAMP.tgz'
```

Expected: backup archives exist.

- [ ] **Step 2: Record rollback commands**

Keep these ready in a local note before cutover:

```bash
ssh perpuskukaan.exe.xyz 'sudo systemctl stop hermes-gateway || systemctl --user stop hermes-gateway || hermes gateway stop || true; sudo systemctl start openclaw; systemctl status openclaw --no-pager -l | sed -n "1,30p"'
```

Expected: no command run yet, just ready.

---

## Task 3: Stop OpenClaw and Run Full Hermes Migration

**Files:**
- Remote source: `~/.openclaw/`
- Remote target: `~/.hermes/`

- [ ] **Step 1: Stop OpenClaw to avoid Telegram polling conflict**

Run:

```bash
ssh perpuskukaan.exe.xyz 'sudo systemctl stop openclaw; sleep 5; systemctl is-active openclaw || true'
```

Expected:

```text
inactive
```

- [ ] **Step 2: Run full migration with secrets**

Run:

```bash
ssh perpuskukaan.exe.xyz 'export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"; hermes claw migrate --source "$HOME/.openclaw" --preset full --migrate-secrets --yes 2>&1 | sed -E "s/(sk-|nvapi-|tvly-|gsk_|ntn_)[A-Za-z0-9_.-]+/\\1…/g" | sed -n "1,220p"'
```

Expected:

- migration applies
- no raw secrets in output
- if `soul` conflict blocks migration, rerun with explicit conflict strategy:

```bash
ssh perpuskukaan.exe.xyz 'export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"; hermes claw migrate --source "$HOME/.openclaw" --preset full --migrate-secrets --skill-conflict skip --yes 2>&1 | sed -E "s/(sk-|nvapi-|tvly-|gsk_|ntn_)[A-Za-z0-9_.-]+/\\1…/g" | sed -n "1,220p"'
```

- [ ] **Step 3: Verify Hermes status after migration**

Run:

```bash
ssh perpuskukaan.exe.xyz 'export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"; hermes status 2>&1 | sed -E "s/(sk-|nvapi-|tvly-|gsk_|ntn_)[A-Za-z0-9_.-]+/\\1…/g" | sed -n "1,140p"'
```

Expected:

- provider/model configured
- Telegram token present if migrator found it
- Perpuskukaan skill still installed

---

## Task 4: Start Hermes Gateway and Verify Telegram

**Files:**
- Remote service: `hermes-gateway.service`
- Remote logs: `~/.hermes/logs/gateway.log`

- [ ] **Step 1: Start Hermes gateway**

Run:

```bash
ssh perpuskukaan.exe.xyz 'export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"; export XDG_RUNTIME_DIR="/run/user/$(id -u)"; hermes gateway start; sleep 20; hermes gateway status 2>&1 | sed -n "1,80p"'
```

Expected:

- Hermes gateway active
- Telegram connected in polling mode

- [ ] **Step 2: Verify logs show Telegram connected**

Run:

```bash
ssh perpuskukaan.exe.xyz 'tail -80 ~/.hermes/logs/gateway.log | grep -Ei "Connected to Telegram|Gateway running|telegram connected|Telegram menu"'
```

Expected: Telegram connected line found.

- [ ] **Step 3: Human Telegram smoke test — read-only**

Ask user to send this to `@Perpuskukaanbot`:

```text
Status bot dan model yang kamu pakai apa?
```

Expected:

- bot replies
- no Convex mutation required
- response mentions Hermes/model or gives normal assistant answer

- [ ] **Step 4: Human Telegram smoke test — safe Perpuskukaan behavior**

Ask user to send:

```text
Cari buku Atomic Habits di katalog Perpuskukaan
```

Expected:

- bot replies in Indonesian
- if Convex tool not wired yet, bot should state limitation safely, not hallucinate DB write
- no destructive action

- [ ] **Step 5: Verify OpenClaw remains stopped during Hermes test**

Run:

```bash
ssh perpuskukaan.exe.xyz 'systemctl is-active openclaw || true; pgrep -af openclaw || true'
```

Expected: OpenClaw inactive, no gateway process.

---

## Task 5: Rollback If Hermes Fails

**Files:**
- No repo changes.

Run rollback immediately if any of these happen:

- Hermes gateway cannot start
- Telegram cannot connect
- bot does not reply after reasonable wait
- migration did not import Telegram token
- repeated gateway crash

- [ ] **Step 1: Stop Hermes gateway**

```bash
ssh perpuskukaan.exe.xyz 'export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"; sudo systemctl stop hermes-gateway || systemctl --user stop hermes-gateway || hermes gateway stop || true'
```

Expected: Hermes gateway stopped.

- [ ] **Step 2: Restart OpenClaw**

```bash
ssh perpuskukaan.exe.xyz 'sudo systemctl start openclaw; sleep 10; systemctl status openclaw --no-pager -l | sed -n "1,40p"'
```

Expected: OpenClaw active.

- [ ] **Step 3: Verify Telegram replies through OpenClaw**

Ask user to send:

```text
Tes rollback
```

Expected: `@Perpuskukaanbot` replies.

---

## Task 6: Post-Cutover Monitoring Window

**Files:**
- No repo changes.

Only if Hermes passes smoke tests.

- [ ] **Step 1: Monitor gateway logs for 15 minutes**

Run:

```bash
ssh perpuskukaan.exe.xyz 'timeout 900 tail -f ~/.hermes/logs/gateway.log'
```

Expected: no crash loop, no repeated Telegram polling errors.

- [ ] **Step 2: Monitor resources**

Run:

```bash
ssh perpuskukaan.exe.xyz 'free -h; df -h /; ps -eo pid,etime,%cpu,%mem,rss,cmd | grep -E "hermes|pinchtab|lightpanda" | grep -v grep'
```

Expected: RAM safe, disk safe.

- [ ] **Step 3: Leave OpenClaw installed but stopped**

Run:

```bash
ssh perpuskukaan.exe.xyz 'systemctl is-enabled openclaw; systemctl is-active openclaw || true; export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"; hermes gateway status | sed -n "1,60p"'
```

Expected:

- OpenClaw enabled but inactive
- Hermes active

- [ ] **Step 4: Report final cutover state**

Report:

```text
Cutover result:
- Migration:
- Hermes gateway:
- Telegram read test:
- Perpuskukaan catalog test:
- OpenClaw state:
- Rollback available:
- Recommended next: wait 48h before OpenClaw removal
```

---

## Self-Review

### Spec Coverage

- Full migration with secrets covered.
- OpenClaw stop only during actual cutover covered.
- Rollback covered before and after Hermes start.
- Telegram smoke tests require human verification.
- OpenClaw removal intentionally excluded until after stability window.

### Placeholder Scan

No TBD/TODO placeholders. All commands and expected outcomes are concrete.

### Type/Name Consistency

- VM hostname: `perpuskukaan.exe.xyz`.
- OpenClaw service: `openclaw`.
- Hermes gateway service/status commands use Hermes CLI with user systemd fallback.

---

Plan complete and saved to `docs/plans/2026-05-05-hermes-production-cutover-rollback.md`.
