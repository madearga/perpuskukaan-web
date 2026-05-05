#!/usr/bin/env bash
# rollback-to-bot-layer.sh
# Rollback: disable OpenClaw, re-enable poller as Telegram owner.
# Run on perpuskukaan.exe.xyz only.
set -euo pipefail

echo "==> Stopping OpenClaw..."
sudo systemctl stop openclaw
sudo systemctl disable openclaw

echo "==> Re-enabling perpuskukaan-telegram-poller..."
sudo systemctl enable --now perpuskukaan-telegram-poller

echo "==> Verifying service states..."
sudo systemctl is-active perpuskukaan-telegram-poller
sudo systemctl is-active openclaw || true

echo "==> Done. Bot layer is back as the public Telegram gateway."
