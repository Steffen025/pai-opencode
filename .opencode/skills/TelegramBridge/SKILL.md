---
name: TelegramBridge
description: Bridge entre Telegram et PAI via OpenCode. USE WHEN telegram, bot, messenger, bridge telegram.
---

# TelegramBridge

Bridge persistant qui connecte Telegram à Kirito (PAI) via OpenCode.
Session unique réutilisée entre les messages, support images et documents.

## Customization

**Before executing, check for user customizations at:**
`~/.opencode/skills/PAI/USER/SKILLCUSTOMIZATIONS/TelegramBridge/`

## Architecture

```
Telegram → grammY Bot → Bun.spawn("opencode run --session <id>") → API Anthropic → JSON stream → parse → reply Telegram
```

## Fichiers

| Fichier | Rôle |
|---------|------|
| `~/.opencode/telegram-bridge/bridge.ts` | Script principal du bridge v2.1 |
| `~/.opencode/telegram-bridge/pai-telegram-bridge.service` | Service systemd |
| `~/.opencode/telegram-bridge/sessions/` | Résumés de session archivés |
| `~/.opencode/telegram-bridge/package.json` | Dépendances (grammy) |

## Gestion du service

```bash
# Status
systemctl status pai-telegram-bridge

# Restart
systemctl restart pai-telegram-bridge

# Logs
journalctl -u pai-telegram-bridge -f

# Stop
systemctl stop pai-telegram-bridge
```

## Commandes Telegram

| Commande | Action |
|----------|--------|
| `/start` | Message d'accueil |
| `/reset` | Résume la session, sauvegarde, nouvelle session avec contexte |
| `/summarize` | Résumé de la session sans la fermer |
| `/session` | Info session en cours |

## Configuration

Variables d'environnement dans le service systemd :

| Variable | Description | Défaut |
|----------|-------------|--------|
| `TELEGRAM_BOT_TOKEN` | Token du bot (@BotFather) | Configuré |
| `OPENCODE_MODEL` | Modèle AI | `anthropic/claude-sonnet-4-6` |
| `ALLOWED_USERS` | IDs Telegram autorisés (séparés par virgule) | Tous |

## Examples

**Example 1: Message texte**
```
User: "Salut Kirito"
→ opencode run --session <id> --model anthropic/claude-sonnet-4-6
→ Réponse concise en ~5 secondes
→ Session persiste pour le prochain message
```

**Example 2: Envoi d'image**
```
User: [envoie une photo avec caption "qu'est-ce que c'est ?"]
→ Télécharge l'image depuis Telegram
→ opencode run --session <id> --file /tmp/image.jpg "qu'est-ce que c'est ?"
→ Vision du modèle analyse l'image
→ Réponse envoyée
```

**Example 3: Changement de session**
```
User: /reset
→ Kirito résume la session en cours
→ Sauvegarde dans ~/.opencode/telegram-bridge/sessions/
→ Nouvelle session créée au prochain message
→ Le résumé est injecté comme contexte
```
