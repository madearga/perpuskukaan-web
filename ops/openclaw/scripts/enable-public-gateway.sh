#!/usr/bin/env bash
# enable-public-gateway.sh
# Cutover: disable poller, enable OpenClaw as sole Telegram owner.
# Run on perpuskukaan.exe.xyz only.
set -euo pipefail

echo "==> Stopping perpuskukaan-telegram-poller..."
sudo systemctl stop perpuskukaan-telegram-poller
sudo systemctl disable perpuskukaan-telegram-poller

echo "==> Enabling and starting OpenClaw..."
sudo systemctl enable --now openclaw

echo "==> Verifying service states..."
sudo systemctl is-active openclaw
sudo systemctl is-active perpuskukaan-telegram-poller || true

echo "==> Done. OpenClaw is now the public Telegram gateway."
