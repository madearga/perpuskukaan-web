# Bot Layer VM Deployment

## Overview
Deploys the Perpuskukaan Next.js app as a Bot Layer service on the VM at `perpuskukaan.exe.xyz`.

## Architecture
- **Runtime**: Next.js `next start` on `127.0.0.1:3001`
- **Reverse Proxy**: Caddy (Tailscale) or nginx (public) → `127.0.0.1:3001`
- **API Routes**: `/api/chat`, `/api/bot/message`, `/api/telegram/webhook`
- **Service**: systemd `perpuskukaan-web.service`

## Files
| File | Purpose |
|------|---------|
| `deploy-vm.sh` | Build locally, rsync to VM, install deps, start service |
| `perpuskukaan-web.service` | systemd unit file |
| `README.md` | This file |

## Usage

```bash
# Full deploy (from repo root)
./ops/bot-layer/deploy-vm.sh

# Custom SSH target
./ops/bot-layer/deploy-vm.sh my-vm-host /opt/custom-dir

# Smoke test after deploy
ssh perpuskukaan.exe.xyz 'curl -sf -X POST http://127.0.0.1:3001/api/chat \
  -H "Content-Type: application/json" -d "{\"text\":\"Halo\"}"'
```

## VM Prerequisites
- Node.js 20+ and pnpm installed
- `/opt/perpuskukaan-web` directory writable by `exedev` user
- `.env.production` with required env vars (see `.env.production`)

## Safety Rules
- **NEVER** set Telegram webhook without approval
- **NEVER** stop OpenClaw without approval  
- **NEVER** start WhatsApp without Telegram stable first
- Only proxy `/api/bot`, `/api/chat`, `/api/telegram` paths
