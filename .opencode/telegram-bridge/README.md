# PAI Telegram Bridge

Bridge entre Telegram et PAI (OpenCode).

## Installation

```bash
cd ~/.opencode/telegram-bridge
bun install
```

## Configuration

Le token du bot est déjà configuré dans `bridge.ts`. Pour changer :
```bash
export TELEGRAM_BOT_TOKEN="ton:token"
```

Chaîne de modèles par défaut (fallback automatique) :
- `google/gemini-2.5-flash`
- `openai/gpt-5.2-codex`
- `openai/gpt-5.1-codex-mini`
- `anthropic/claude-sonnet-4-6`

Tu peux la surcharger :
```bash
export OPENCODE_MODELS="google/gemini-2.5-flash,openai/gpt-5.2-codex,openai/gpt-5.1-codex-mini,anthropic/claude-sonnet-4-6"
```

## Démarrage

### Mode développement
```bash
bun bridge.ts
```

### En arrière-plan (VPS)
```bash
# Avec nohup
nohup bun bridge.ts > bridge.log 2>&1 &

# Avec systemd
sudo cp pai-telegram-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable pai-telegram-bridge
sudo systemctl start pai-telegram-bridge
```

## Vérification

```bash
# Voir les logs
tail -f bridge.log

# Vérifier que le bot tourne
ps aux | grep bridge
```

## Test

Envoyer un message à ton bot Telegram (@Kirito_Bot ou vérifier avec @BotFather).
