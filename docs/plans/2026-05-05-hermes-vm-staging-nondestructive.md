# Hermes VM Staging Non-Destructive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stage Hermes on `perpuskukaan.exe.xyz` and validate OpenClaw migration readiness without stopping OpenClaw, cutting over Telegram, migrating secrets, pairing WhatsApp, or deleting files.

**Architecture:** Copy repo-side Hermes ops assets to the VM, run read-only/preflight checks, install Hermes if missing, install the Perpuskukaan Hermes skill, and run `hermes claw migrate --dry-run` only. OpenClaw remains the live production gateway throughout.

**Tech Stack:** Hermes Agent CLI, OpenClaw, systemd, SSH/rsync, Bash, Perpuskukaan ops scripts.

---

## Safety Contract

Do not run these commands in this plan:

```bash
sudo systemctl stop openclaw
sudo systemctl disable openclaw
hermes gateway start
hermes claw migrate --preset full --migrate-secrets
bash ops/hermes/scripts/cutover-to-hermes.sh
bash ops/hermes/scripts/remove-openclaw-after-cutover.sh
rm -rf ~/.openclaw
```

If any script prompts for destructive confirmation, answer nothing and stop.

---

## Task 1: Verify Local Repo and Copy Ops Assets to VM

**Files:**
- Read: `ops/hermes/README.md`
- Read: `ops/hermes/scripts/preflight.sh`
- Read: `ops/hermes/skills/perpuskukaan-admin/SKILL.md`

- [ ] **Step 1: Verify local repo is clean and tests/build already green enough for staging**

Run:

```bash
cd ~/Desktop/perpuskukaan-web
git status --short
git log --oneline -5
pnpm test
pnpm lint
pnpm build
```

Expected:

- `git status --short` is empty
- tests pass
- lint has 0 errors
- build succeeds

- [ ] **Step 2: Create remote staging directory**

Run:

```bash
ssh perpuskukaan.exe.xyz 'mkdir -p ~/perpuskukaan-web/ops'
```

Expected: exit 0.

- [ ] **Step 3: Copy Hermes ops folder only**

Run:

```bash
rsync -av --delete \
  ~/Desktop/perpuskukaan-web/ops/hermes/ \
  perpuskukaan.exe.xyz:~/perpuskukaan-web/ops/hermes/
```

Expected: files copied; no application source deployed.

---

## Task 2: Run VM Preflight Without Mutating OpenClaw

**Files:**
- Remote: `~/perpuskukaan-web/ops/hermes/scripts/preflight.sh`

- [ ] **Step 1: Run preflight script**

Run:

```bash
ssh perpuskukaan.exe.xyz 'bash ~/perpuskukaan-web/ops/hermes/scripts/preflight.sh'
```

Expected:

- Resource output includes RAM and disk
- OpenClaw status shown
- Hermes status shown or `Hermes is not installed`
- No OpenClaw service state changes

- [ ] **Step 2: Independently verify OpenClaw is still active**

Run:

```bash
ssh perpuskukaan.exe.xyz 'systemctl is-active openclaw && systemctl status openclaw --no-pager -l | sed -n "1,20p"'
```

Expected:

```text
active
```

---

## Task 3: Install Hermes If Missing

**Files:**
- Remote: `~/.hermes/` may be created by installer

- [ ] **Step 1: Check whether Hermes exists**

Run:

```bash
ssh perpuskukaan.exe.xyz 'export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"; command -v hermes || true'
```

Expected:

- If path printed: skip Step 2.
- If empty: run Step 2.

- [ ] **Step 2: Install Hermes only if missing**

Run only if Step 1 returned empty:

```bash
ssh perpuskukaan.exe.xyz 'curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash'
```

Expected: installer exits 0.

- [ ] **Step 3: Verify Hermes status without secrets output**

Run:

```bash
ssh perpuskukaan.exe.xyz 'export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"; hermes status 2>&1 | sed -E "s/(sk-|nvapi-|tvly-|gsk_|ntn_)[A-Za-z0-9_.-]+/\\1…/g" | sed -n "1,100p"'
```

Expected: Hermes status visible; keys redacted if present.

- [ ] **Step 4: Verify OpenClaw still active after install**

Run:

```bash
ssh perpuskukaan.exe.xyz 'systemctl is-active openclaw'
```

Expected:

```text
active
```

---

## Task 4: Install Perpuskukaan Hermes Skill on VM

**Files:**
- Remote create/modify: `~/.hermes/skills/perpuskukaan-admin/SKILL.md`

- [ ] **Step 1: Install skill from staged ops folder**

Run:

```bash
ssh perpuskukaan.exe.xyz 'cd ~/perpuskukaan-web && bash ops/hermes/scripts/install-perpuskukaan-skill.sh'
```

Expected: script prints installed path.

- [ ] **Step 2: Verify skill exists and contains safety contract**

Run:

```bash
ssh perpuskukaan.exe.xyz 'test -f ~/.hermes/skills/perpuskukaan-admin/SKILL.md && grep -E "Convex is the source of truth|Do not write directly|Idempotency" ~/.hermes/skills/perpuskukaan-admin/SKILL.md'
```

Expected: all grep lines found.

- [ ] **Step 3: Verify OpenClaw still active**

Run:

```bash
ssh perpuskukaan.exe.xyz 'systemctl is-active openclaw'
```

Expected:

```text
active
```

---

## Task 5: Run OpenClaw → Hermes Migration Dry-Run Only

**Files:**
- Remote read: `~/.openclaw/`
- Remote no writes expected from `--dry-run`

- [ ] **Step 1: Run official dry-run**

Run:

```bash
ssh perpuskukaan.exe.xyz 'export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"; hermes claw migrate --source "$HOME/.openclaw" --dry-run 2>&1 | sed -E "s/(sk-|nvapi-|tvly-|gsk_|ntn_)[A-Za-z0-9_.-]+/\\1…/g" | sed -n "1,220p"'
```

Expected:

- Preview appears
- No confirmation prompt is accepted
- No secrets printed
- No apply occurs

- [ ] **Step 2: Capture migration readiness summary**

From dry-run output, record:

```text
- detected source directory
- config files to import
- model/provider mapping
- Telegram token/allowed user mapping presence, redacted
- conflicts, if any
- warnings, if any
```

- [ ] **Step 3: Verify OpenClaw still active after dry-run**

Run:

```bash
ssh perpuskukaan.exe.xyz 'systemctl is-active openclaw && ps -o pid,etime,%mem,cmd -p $(pgrep -f "openclaw gateway|/bin/openclaw gateway" | head -1)'
```

Expected:

```text
active
```

---

## Task 6: Produce Staging Report

**Files:**
- No code changes required unless scripts need fixes.

- [ ] **Step 1: Summarize result**

Report in Indonesian, concise:

```text
Staging result:
- OpenClaw status:
- Hermes installed:
- Skill installed:
- Dry-run status:
- Conflicts/warnings:
- Secrets exposed: no/yes
- Safe for full migration later: yes/no
- Next recommended command:
```

- [ ] **Step 2: If script fixes were needed, commit them**

Only if local files changed:

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
pnpm lint
pnpm build
git add ops/hermes docs/plans
git commit -m "fix: harden Hermes VM staging runbook"
```

Expected: commit only when local files changed.

---

## Self-Review

### Spec Coverage

- Creates a specific plan: yes.
- Executes by worker/subagent: yes, plan is safe for delegated execution.
- Uses Hermes/OpenClaw migration docs behavior: yes, uses `hermes claw migrate --dry-run` only.
- Prevents destructive VM changes: explicit forbidden commands.

### Placeholder Scan

No TBD/TODO/fill-later placeholders. All commands and expected results are concrete.

### Type/Name Consistency

- VM hostname consistently `perpuskukaan.exe.xyz`.
- Remote staging path consistently `~/perpuskukaan-web/ops/hermes/`.
- Skill path consistently `~/.hermes/skills/perpuskukaan-admin/SKILL.md`.

---

Plan complete and saved to `docs/plans/2026-05-05-hermes-vm-staging-nondestructive.md`.
