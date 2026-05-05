#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:-ops/hermes/skills/perpuskukaan-admin}"
TARGET_DIR="$HOME/.hermes/skills/perpuskukaan-admin"

if [ ! -f "$SOURCE_DIR/SKILL.md" ]; then
  echo "Skill source not found: $SOURCE_DIR/SKILL.md"
  exit 1
fi

mkdir -p "$HOME/.hermes/skills"
rm -rf "$TARGET_DIR"
cp -R "$SOURCE_DIR" "$TARGET_DIR"
chmod -R go-rwx "$TARGET_DIR"

echo "Installed Perpuskukaan Hermes skill to $TARGET_DIR"
