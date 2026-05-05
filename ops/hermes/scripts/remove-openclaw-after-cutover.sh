#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="$HOME/backups/perpuskukaan-hermes"
STAMP="$(date +%Y%m%d%H%M%S)"
mkdir -p "$BACKUP_DIR"

read -r -p "Only run after Hermes has been stable for 48h. Type I_UNDERSTAND_OPENCLAW_REMOVAL: " answer
if [ "$answer" != "I_UNDERSTAND_OPENCLAW_REMOVAL" ]; then
  echo "Cancelled."
  exit 1
fi

echo "Archiving final OpenClaw state..."
if [ -d "$HOME/.openclaw" ]; then
  tar -C "$HOME" -czf "$BACKUP_DIR/openclaw-final-$STAMP.tgz" .openclaw
fi

echo "Stopping and disabling OpenClaw..."
sudo systemctl stop openclaw || true
sudo systemctl disable openclaw || true
sudo rm -f /etc/systemd/system/openclaw.service
sudo rm -rf /etc/systemd/system/openclaw.service.d
sudo systemctl daemon-reload

echo "Removing OpenClaw user state and binaries..."
rm -rf "$HOME/.openclaw"
sudo rm -f /bin/openclaw /usr/local/bin/openclaw /usr/bin/openclaw || true

echo "OpenClaw removed. Backup stored in $BACKUP_DIR"
