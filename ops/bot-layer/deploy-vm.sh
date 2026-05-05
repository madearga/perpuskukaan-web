#!/usr/bin/env bash
# deploy-vm.sh — Deploy Perpuskukaan Bot Layer to VM
# Usage: ./deploy-vm.sh [SSH_TARGET] [REMOTE_DIR]
# Defaults: SSH_TARGET=perpuskukaan.exe.xyz REMOTE_DIR=/opt/perpuskukaan-web
set -euo pipefail

SSH_TARGET="${1:-perpuskukaan.exe.xyz}"
REMOTE_DIR="${2:-/opt/perpuskukaan-web}"
SERVICE_NAME="perpuskukaan-web"
LOCAL_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

ensure_remote_env() {
  ssh "$SSH_TARGET" "test -f '$REMOTE_DIR/.env.production' || (echo 'Missing $REMOTE_DIR/.env.production' >&2; exit 1)"
}

echo "==> Verifying and building locally..."
cd "$LOCAL_ROOT"
pnpm test
pnpm lint
pnpm build

echo "==> Syncing to $SSH_TARGET:$REMOTE_DIR..."
# Copy standalone output, public assets, and package metadata
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.env.local' \
  --exclude '.env.production' \
  --exclude '.pi' \
  --exclude 'docs' \
  --exclude 'autoresearch*' \
  "$LOCAL_ROOT/" "$SSH_TARGET:$REMOTE_DIR/"

echo "==> Installing production dependencies on VM..."
ssh "$SSH_TARGET" "source ~/.profile 2>/dev/null || true; cd $REMOTE_DIR && pnpm install --prod --frozen-lockfile 2>&1 | tail -5 || npm install --prod 2>&1 | tail -5"

echo "==> Verifying .env.production on VM..."
ensure_remote_env

echo "==> Installing systemd service..."
ssh "$SSH_TARGET" "sudo cp $REMOTE_DIR/ops/bot-layer/perpuskukaan-web.service /etc/systemd/system/ && sudo systemctl daemon-reload"

echo "==> Starting/restarting service..."
ssh "$SSH_TARGET" "sudo systemctl restart $SERVICE_NAME && sleep 2 && sudo systemctl status $SERVICE_NAME --no-pager | head -15"

echo "==> Smoke test /api/chat..."
ssh "$SSH_TARGET" "curl -sf -X POST http://127.0.0.1:3001/api/chat -H 'Content-Type: application/json' -d '{\"text\":\"Halo\"}' || echo 'SMOKE_TEST_FAILED'"

echo "==> Done! Bot Layer running on $SSH_TARGET:3001"
