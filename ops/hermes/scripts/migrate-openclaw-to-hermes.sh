#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"
BACKUP_DIR="$HOME/backups/perpuskukaan-hermes"
STAMP="$(date +%Y%m%d%H%M%S)"
mkdir -p "$BACKUP_DIR"

if ! command -v hermes >/dev/null 2>&1; then
  echo "Hermes is not installed. Install first:"
  echo "curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash"
  exit 1
fi

if [ ! -d "$HOME/.openclaw" ]; then
  echo "No ~/.openclaw directory found; nothing to migrate."
  exit 1
fi

echo "Creating OpenClaw backup..."
tar -C "$HOME" -czf "$BACKUP_DIR/openclaw-pre-hermes-$STAMP.tgz" .openclaw

echo "Creating Hermes backup if present..."
if [ -d "$HOME/.hermes" ]; then
  tar -C "$HOME" -czf "$BACKUP_DIR/hermes-pre-migration-$STAMP.tgz" .hermes
fi

echo "Running dry-run preview..."
hermes claw migrate --source "$HOME/.openclaw" --dry-run

read -r -p "Apply full migration with secrets? Type MIGRATE_HERMES: " answer
if [ "$answer" != "MIGRATE_HERMES" ]; then
  echo "Cancelled."
  exit 1
fi

hermes claw migrate --source "$HOME/.openclaw" --preset full --migrate-secrets

echo "Migration complete. Run: hermes status"
