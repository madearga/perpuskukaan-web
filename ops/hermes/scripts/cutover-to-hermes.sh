#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"
export XDG_RUNTIME_DIR="/run/user/$(id -u)"

if ! command -v hermes >/dev/null 2>&1; then
  echo "Hermes is not installed."
  exit 1
fi

echo "Stopping OpenClaw to avoid Telegram polling conflict..."
sudo systemctl stop openclaw || true
sleep 5

echo "Starting Hermes gateway..."
hermes gateway start || systemctl --user start hermes-gateway
sleep 15

echo "Hermes gateway status:"
hermes gateway status || systemctl --user status hermes-gateway --no-pager -l

echo "Verify in Telegram now: send a safe read-only message like 'status perpuskukaan'."
echo "Rollback if needed: sudo systemctl stop hermes-gateway || hermes gateway stop; sudo systemctl start openclaw"
