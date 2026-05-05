# Perpuskukaan Hermes Operations

## Preflight

```bash
ssh perpuskukaan.exe.xyz
bash ~/perpuskukaan-web/ops/hermes/scripts/preflight.sh
```

## Install Hermes

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"
hermes status
```

## Migrate OpenClaw Config

```bash
bash ~/perpuskukaan-web/ops/hermes/scripts/migrate-openclaw-to-hermes.sh
```

## Install Perpuskukaan Skill

```bash
cd ~/perpuskukaan-web
bash ops/hermes/scripts/install-perpuskukaan-skill.sh
```

## Cut Over Telegram

Do not run OpenClaw and Hermes with the same Telegram token at the same time.

```bash
bash ~/perpuskukaan-web/ops/hermes/scripts/cutover-to-hermes.sh
```

## Rollback

```bash
sudo systemctl stop hermes-gateway || hermes gateway stop || true
sudo systemctl start openclaw
systemctl status openclaw --no-pager -l
```

## Final OpenClaw Removal

Only after Hermes has been stable for 48 hours:

```bash
bash ~/perpuskukaan-web/ops/hermes/scripts/remove-openclaw-after-cutover.sh
```

## Future WhatsApp/Baileys Migration

Hermes supports WhatsApp via Baileys-style QR pairing. Do not assume OpenClaw WhatsApp session state is portable. Plan to re-pair WhatsApp after Hermes is stable on Telegram.

Checklist:

1. Keep Telegram stable on Hermes first.
2. Add/link WhatsApp identity in Convex using `userIdentities.provider = "whatsapp"`.
3. Pair WhatsApp through Hermes using the current Hermes WhatsApp setup command.
4. Test read-only catalog search from WhatsApp.
5. Test one safe low-risk write with idempotency.
6. Require exact confirmation for high-risk admin actions.
7. Keep WhatsApp and Telegram identities mapped to the same app user where appropriate.
