#!/usr/bin/env bash
set -euo pipefail

echo "== Perpuskukaan Hermes preflight =="
echo "host=$(hostname)"
echo "date=$(date -Is)"
echo

echo "== resources =="
uptime
free -h
df -h /
echo

echo "== services =="
systemctl status openclaw --no-pager -l | sed -n '1,35p' || true
systemctl --user status hermes-gateway --no-pager -l | sed -n '1,35p' || true
echo

echo "== config dirs =="
ls -ld "$HOME/.openclaw" "$HOME/.hermes" 2>/dev/null || true
du -sh "$HOME/.openclaw" "$HOME/.hermes" 2>/dev/null || true
echo

echo "== hermes status =="
export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"
if command -v hermes >/dev/null 2>&1; then
  hermes status | sed -E 's/(sk-|nvapi-|tvly-|gsk_|ntn_)[A-Za-z0-9_.-]+/\1…/g'
else
  echo "Hermes is not installed"
fi
