# Bot Layer Deployment + Rollout Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy Perpuskukaan Natural Language Bot Layer safely, verify web/API behavior first, then roll out Telegram webhook and later WhatsApp without breaking the existing OpenClaw bot.

**Architecture:** Deploy the Next.js app/API routes as a separate web service behind reverse proxy. Test `/api/chat` and `/api/bot/message` before touching Telegram. Telegram webhook cutover is a separate gated step that requires stopping OpenClaw or using a different bot token to avoid polling/webhook conflict.

**Tech Stack:** Next.js 16, Convex, systemd, nginx/Caddy, Telegram Bot API webhook, optional Baileys service, SSH/rsync/git, pnpm.

---

## Deployment Decision

Use a phased rollout:

1. **Phase A — Web/API staging:** deploy Next.js app to VM or Vercel, no Telegram changes.
2. **Phase B — API smoke tests:** test `/api/chat` and `/api/bot/message` with safe inputs.
3. **Phase C — Telegram staging:** use a separate staging Telegram bot token if available.
4. **Phase D — Production Telegram cutover:** stop OpenClaw, set webhook to Bot Layer, test, rollback if needed.
5. **Phase E — WhatsApp staging:** run Baileys service with QR pairing only after Telegram is stable.

---

## Hard Safety Rules

Do not do these until a separate cutover approval:

```bash
sudo systemctl stop openclaw
curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook
node bot-service/whatsapp.ts
rm -rf ~/.openclaw
```

Webhook setup and OpenClaw stop must happen together in the Telegram cutover phase.

---

## Task 1: Prepare Deployment Environment Inventory

**Files:**
- Read: `.env.production`
- Read: `package.json`
- Read: `next.config.ts`
- Remote read: VM services/proxy config

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

- working tree clean
- tests pass
- lint has 0 errors
- build succeeds

- [ ] **Step 2: Inspect VM current web services**

Run:

```bash
ssh perpuskukaan.exe.xyz 'hostname; systemctl --no-pager --type=service --state=running | grep -Ei "nginx|caddy|openclaw|hermes|next|node|p2p" || true; ss -ltnp 2>/dev/null | grep -E ":(80|443|3000|3001|8000|18789)" || true; sudo nginx -T 2>/dev/null | grep -E "server_name|proxy_pass|listen" | sed -n "1,120p" || true; sudo caddy validate 2>/dev/null || true'
```

Expected: current public routing known before deployment.

- [ ] **Step 3: Decide target runtime port**

Use:

```text
127.0.0.1:3001 for Next.js Bot Layer app
```

Reason: avoid collision with existing `p2p-library` on `:8000` and any future dashboard on `:18789`.

---

## Task 2: Create VM Deployment Scripts in Repo

**Files:**
- Create: `ops/bot-layer/deploy-vm.sh`
- Create: `ops/bot-layer/perpuskukaan-web.service`
- Create: `ops/bot-layer/README.md`
- Test: `tests/bot-deploy-scripts.test.mjs`

- [ ] **Step 1: Write failing tests**

Create `tests/bot-deploy-scripts.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, statSync } from "node:fs";

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const executable = (relativePath) => {
  const mode = statSync(new URL(`../${relativePath}`, import.meta.url)).mode;
  return (mode & 0o111) !== 0;
};

test("VM deploy script builds before syncing and never touches Telegram webhook", () => {
  const source = read("ops/bot-layer/deploy-vm.sh");

  assert.match(source, /pnpm test/);
  assert.match(source, /pnpm lint/);
  assert.match(source, /pnpm build/);
  assert.match(source, /rsync/);
  assert.match(source, /perpuskukaan-web\.service/);
  assert.doesNotMatch(source, /setWebhook/);
  assert.doesNotMatch(source, /systemctl stop openclaw/);
});

test("systemd service binds Next.js to localhost port 3001", () => {
  const source = read("ops/bot-layer/perpuskukaan-web.service");

  assert.match(source, /HOSTNAME=127\.0\.0\.1/);
  assert.match(source, /PORT=3001/);
  assert.match(source, /pnpm start/);
});

test("bot deploy scripts are executable", () => {
  assert.equal(executable("ops/bot-layer/deploy-vm.sh"), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
```

Expected: FAIL because files do not exist.

- [ ] **Step 3: Create `ops/bot-layer/perpuskukaan-web.service`**

```ini
[Unit]
Description=Perpuskukaan Web + Bot Layer
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/home/exedev/perpuskukaan-web-app/current
Environment=NODE_ENV=production
Environment=HOSTNAME=127.0.0.1
Environment=PORT=3001
ExecStart=/usr/bin/env pnpm start
Restart=always
RestartSec=10
KillMode=control-group

[Install]
WantedBy=default.target
```

- [ ] **Step 4: Create `ops/bot-layer/deploy-vm.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

VM="${VM:-perpuskukaan.exe.xyz}"
REMOTE_BASE="${REMOTE_BASE:-/home/exedev/perpuskukaan-web-app}"
RELEASE="$(date +%Y%m%d%H%M%S)"
REMOTE_RELEASE="$REMOTE_BASE/releases/$RELEASE"

cd "$(dirname "$0")/../.."

pnpm test
pnpm lint
pnpm build

ssh "$VM" "mkdir -p '$REMOTE_RELEASE' '$REMOTE_BASE/shared'"

rsync -az --delete \
  --exclude '.git' \
  --exclude '.next/cache' \
  --exclude 'node_modules' \
  --exclude '.env.local' \
  ./ "$VM:$REMOTE_RELEASE/"

ssh "$VM" "set -euo pipefail
  cd '$REMOTE_RELEASE'
  corepack enable || true
  pnpm install --prod=false --frozen-lockfile
  pnpm build
  if [ ! -f '$REMOTE_BASE/shared/.env.production' ]; then
    echo 'Missing $REMOTE_BASE/shared/.env.production. Create it before starting service.' >&2
    exit 1
  fi
  ln -sfn '$REMOTE_BASE/shared/.env.production' '$REMOTE_RELEASE/.env.production'
  ln -sfn '$REMOTE_RELEASE' '$REMOTE_BASE/current'
  mkdir -p ~/.config/systemd/user
  cp '$REMOTE_RELEASE/ops/bot-layer/perpuskukaan-web.service' ~/.config/systemd/user/perpuskukaan-web.service
  systemctl --user daemon-reload
  systemctl --user enable --now perpuskukaan-web.service
  sleep 5
  systemctl --user status perpuskukaan-web.service --no-pager -l | sed -n '1,60p'
"

echo "Deployed release $RELEASE to $VM:$REMOTE_RELEASE"
echo "No Telegram webhook was changed."
```

- [ ] **Step 5: Create `ops/bot-layer/README.md`**

```markdown
# Bot Layer Deployment

This deploys the Next.js web app and bot API routes. It does not modify Telegram webhook, WhatsApp pairing, Hermes gateway, or OpenClaw.

## Required VM env

Create `/home/exedev/perpuskukaan-web-app/shared/.env.production` with:

```env
NEXT_PUBLIC_CONVEX_URL=...
NEXT_PUBLIC_CONVEX_SITE_URL=...
SITE_URL=https://perpuskukaan.example
ZAI_API_KEY=...
BOT_INTENT_MODEL=glm-5
TELEGRAM_BOT_TOKEN=...
```

`TELEGRAM_BOT_TOKEN` is only used after webhook cutover.

## Deploy

```bash
VM=perpuskukaan.exe.xyz bash ops/bot-layer/deploy-vm.sh
```

## Smoke test

```bash
curl -s http://127.0.0.1:3001/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"text":"bantuan"}'
```

## Telegram cutover

Do not set Telegram webhook while OpenClaw polling is active. Stop OpenClaw first or use a separate staging bot token.
```

- [ ] **Step 6: Mark script executable and run tests**

```bash
cd ~/Desktop/perpuskukaan-web
chmod +x ops/bot-layer/deploy-vm.sh
pnpm test
pnpm lint
pnpm build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd ~/Desktop/perpuskukaan-web
git add ops/bot-layer tests/bot-deploy-scripts.test.mjs
git commit -m "ops: add bot layer VM deployment scripts"
```

---

## Task 3: Prepare VM Environment Without Starting Webhook

**Files:**
- Remote create: `/home/exedev/perpuskukaan-web-app/shared/.env.production`

- [ ] **Step 1: Create remote directories**

```bash
ssh perpuskukaan.exe.xyz 'mkdir -p ~/perpuskukaan-web-app/shared ~/perpuskukaan-web-app/releases'
```

Expected: directories exist.

- [ ] **Step 2: Securely create `.env.production` on VM**

Use local `.env.production` and add private server-only vars from known secure sources. Do not echo secrets.

```bash
ssh perpuskukaan.exe.xyz 'umask 077; touch ~/perpuskukaan-web-app/shared/.env.production; chmod 600 ~/perpuskukaan-web-app/shared/.env.production'
```

Then transfer with `scp` or edit via SSH. Required keys:

```env
NEXT_PUBLIC_CONVEX_URL=...
NEXT_PUBLIC_CONVEX_SITE_URL=...
SITE_URL=...
ZAI_API_KEY=...
BOT_INTENT_MODEL=glm-5
TELEGRAM_BOT_TOKEN=...
```

Expected: file exists with chmod `600`.

- [ ] **Step 3: Verify env presence without revealing values**

```bash
ssh perpuskukaan.exe.xyz 'python3 - <<"PY"
from pathlib import Path
p=Path.home()/"perpuskukaan-web-app/shared/.env.production"
for key in ["NEXT_PUBLIC_CONVEX_URL","NEXT_PUBLIC_CONVEX_SITE_URL","SITE_URL","ZAI_API_KEY","BOT_INTENT_MODEL","TELEGRAM_BOT_TOKEN"]:
    found=False
    for line in p.read_text().splitlines():
        if line.startswith(key+"=") and line.split("=",1)[1].strip():
            found=True
    print(key, "set" if found else "missing")
PY'
```

Expected: all `set`.

---

## Task 4: Deploy Web/API Service to VM

**Files:**
- Remote service: `perpuskukaan-web.service`
- Remote app: `/home/exedev/perpuskukaan-web-app/current`

- [ ] **Step 1: Run deploy script**

```bash
cd ~/Desktop/perpuskukaan-web
VM=perpuskukaan.exe.xyz bash ops/bot-layer/deploy-vm.sh
```

Expected:

- local checks pass
- release copied
- remote install/build pass
- user service active

- [ ] **Step 2: Verify local VM API route**

```bash
ssh perpuskukaan.exe.xyz 'curl -s http://127.0.0.1:3001/api/chat -H "Content-Type: application/json" -d "{\"text\":\"bantuan\"}" | python3 -m json.tool'
```

Expected: Indonesian help response.

- [ ] **Step 3: Verify no Telegram webhook changed**

```bash
ssh perpuskukaan.exe.xyz 'python3 - <<"PY"
from pathlib import Path
import os, urllib.request, json
for line in (Path.home()/"perpuskukaan-web-app/shared/.env.production").read_text().splitlines():
    if line.startswith("TELEGRAM_BOT_TOKEN="):
        token=line.split("=",1)[1].strip()
        break
else:
    raise SystemExit("missing token")
url=f"https://api.telegram.org/bot{token}/getWebhookInfo"
info=json.load(urllib.request.urlopen(url, timeout=20))
print({"ok": info.get("ok"), "url_set": bool(info.get("result",{}).get("url")), "pending": info.get("result",{}).get("pending_update_count")})
PY'
```

Expected: read-only output. If `url_set` is false, OpenClaw polling can continue.

---

## Task 5: Reverse Proxy Staging Route

**Files:**
- Remote proxy config: nginx/Caddy route

- [ ] **Step 1: Choose staging URL**

Preferred:

```text
http://perpuskukaan.exe.xyz/bot-health or /api/chat through same host
```

If existing service uses root, add path proxy only:

```nginx
location /api/bot/ { proxy_pass http://127.0.0.1:3001; }
location /api/chat { proxy_pass http://127.0.0.1:3001; }
location /api/telegram/ { proxy_pass http://127.0.0.1:3001; }
```

- [ ] **Step 2: Apply proxy config with backup**

Before edit:

```bash
ssh perpuskukaan.exe.xyz 'sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak.$(date +%Y%m%d%H%M%S)'
```

Apply only API path proxy. Do not replace existing root app.

- [ ] **Step 3: Test and reload proxy**

```bash
ssh perpuskukaan.exe.xyz 'sudo nginx -t && sudo systemctl reload nginx'
```

Expected: nginx config valid.

- [ ] **Step 4: Test public API route**

```bash
curl -s http://perpuskukaan.exe.xyz/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"text":"bantuan"}' | python3 -m json.tool
```

Expected: Indonesian help response.

---

## Task 6: Telegram Staging Strategy

**Files:**
- No code changes unless adding docs.

Pick one:

### Option A — Separate staging bot token

- Create new Telegram bot, e.g. `PerpuskukaanStagingBot`.
- Put token in VM `.env.production` as `TELEGRAM_BOT_TOKEN` for staging.
- Set webhook to staging URL.
- OpenClaw production bot remains running.

### Option B — Production bot cutover

- Stop OpenClaw.
- Set webhook to Bot Layer.
- Test.
- Rollback by deleting webhook and restarting OpenClaw.

Recommended: **Option A first**.

---

## Task 7: Production Telegram Webhook Cutover Plan

Only after API staging passes.

- [ ] **Step 1: Stop OpenClaw**

```bash
ssh perpuskukaan.exe.xyz 'sudo systemctl stop openclaw; sleep 5; systemctl is-active openclaw || true'
```

Expected: inactive.

- [ ] **Step 2: Set Telegram webhook to Bot Layer**

```bash
ssh perpuskukaan.exe.xyz 'python3 - <<"PY"
from pathlib import Path
import urllib.parse, urllib.request, json
p=Path.home()/"perpuskukaan-web-app/shared/.env.production"
token=None
for line in p.read_text().splitlines():
    if line.startswith("TELEGRAM_BOT_TOKEN="):
        token=line.split("=",1)[1].strip()
if not token:
    raise SystemExit("missing token")
webhook="https://YOUR_PUBLIC_DOMAIN/api/telegram/webhook"
url=f"https://api.telegram.org/bot{token}/setWebhook?"+urllib.parse.urlencode({"url": webhook})
print(json.load(urllib.request.urlopen(url, timeout=20)).get("ok"))
PY'
```

Expected: `true`.

- [ ] **Step 3: Telegram smoke tests**

Send:

```text
bantuan
cari buku Atomic Habits
```

Expected: product bot responses, no Hermes built-in command surface.

- [ ] **Step 4: Rollback if failed**

```bash
ssh perpuskukaan.exe.xyz 'python3 - <<"PY"
from pathlib import Path
import urllib.request, json
p=Path.home()/"perpuskukaan-web-app/shared/.env.production"
token=[line.split("=",1)[1].strip() for line in p.read_text().splitlines() if line.startswith("TELEGRAM_BOT_TOKEN=")][0]
print(json.load(urllib.request.urlopen(f"https://api.telegram.org/bot{token}/deleteWebhook", timeout=20)).get("ok"))
PY
sudo systemctl start openclaw
systemctl status openclaw --no-pager -l | sed -n "1,30p"'
```

Expected: OpenClaw restored.

---

## Task 8: WhatsApp Rollout Plan

Do this after Telegram stable.

- [ ] **Step 1: Install bot-service dependencies on VM**

```bash
ssh perpuskukaan.exe.xyz 'cd ~/perpuskukaan-web-app/current/bot-service && pnpm install'
```

- [ ] **Step 2: Create WhatsApp systemd service draft**

Service should run:

```bash
BOT_MESSAGE_ENDPOINT=https://PUBLIC_DOMAIN/api/bot/message pnpm whatsapp
```

- [ ] **Step 3: Pair QR manually**

Run in interactive SSH, scan QR with dedicated Perpuskukaan WhatsApp number.

- [ ] **Step 4: Smoke test**

Send:

```text
bantuan
cari buku Atomic Habits
```

Expected: same product responses as Telegram/web.

---

## Final Verification

Before any production Telegram cutover:

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
pnpm lint
pnpm build
ssh perpuskukaan.exe.xyz 'systemctl --user status perpuskukaan-web --no-pager -l | sed -n "1,60p"; curl -s http://127.0.0.1:3001/api/chat -H "Content-Type: application/json" -d "{\"text\":\"bantuan\"}"'
```

Expected:

- local checks pass
- remote web service active
- `/api/chat` returns help

---

## Self-Review

### Spec Coverage

- Deployment plan provided before touching webhook.
- Bot Layer supports Telegram/WhatsApp/web path.
- Preserves OpenClaw until explicit webhook cutover.
- Includes rollback for Telegram production.

### Placeholder Scan

Only `YOUR_PUBLIC_DOMAIN` remains as an intentional operator replacement in production webhook command; staging tasks avoid webhook changes.

### Type Consistency

- Next service name: `perpuskukaan-web.service`.
- Next port: `127.0.0.1:3001`.
- Remote base: `/home/exedev/perpuskukaan-web-app`.

---

Plan complete and saved to `docs/plans/2026-05-05-bot-layer-deployment-rollout.md`.
