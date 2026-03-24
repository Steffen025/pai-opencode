# Anthropic Max Bridge for OpenCode

> **Use your Anthropic Max / Pro subscription in OpenCode — without paying extra for API keys.**
>
> **Standalone package** — no PAI-OpenCode installation required. Just bash and Python 3.

---

## Background

In March 2026, Anthropic blocked OAuth tokens from being used in third-party tools like OpenCode.
Teams paying $200–600/month for Max subscriptions were forced to either:
- Pay again for API keys, or
- Stop using OpenCode

This package provides a minimal, working fix.

---

## What this does

Three tiny changes to how OpenCode talks to the Anthropic API:

| # | What changes | Why it matters |
|---|---|---|
| 1 | `system` prompt sent as **array of objects** instead of a plain string | Plain string → HTTP 400 error |
| 2 | `anthropic-beta: oauth-2025-04-20` header added to every request | Without it → HTTP 401 "OAuth not supported" |
| 3 | `Authorization: Bearer <token>` instead of `x-api-key` | Required for OAuth auth flow |

That's the entire fix. No spoofing. No endpoint rewrites. No User-Agent games. Just these three changes.

---

## Requirements

- **macOS** (the token lives in the macOS Keychain)
- **Claude Code CLI** installed and authenticated
  → Download: https://claude.ai/code
  → After install, run `claude` once and log in with your Anthropic account
- **OpenCode** installed
  → Download: https://opencode.ai
- **Python 3** (pre-installed on macOS)

---

## Quick Start (5 minutes)

### Step 1 — Make sure Claude Code is authenticated

Open Terminal and run:
```bash
claude
```
Log in with the same Anthropic account that has your Max/Pro subscription.
You only need to do this once (or after your Claude Code session expires).

### Step 2 — Run the install script

From the directory containing this README:
```bash
bash install.sh
```

That's it. The script will:
1. Extract your OAuth token from the macOS Keychain
2. Copy both plugins to `~/.opencode/plugins/`
3. Write the token into `~/.local/share/opencode/auth.json`
4. Tell you how long the token is valid for

### Step 3 — Start OpenCode and pick a model

```bash
opencode
```

In the model picker, choose any `claude-*` model, e.g.:
- `anthropic/claude-sonnet-4-6`  ← recommended
- `anthropic/claude-opus-4-6`

You'll see **$0 input / $0 output** cost because it uses your subscription.

---

## Token Expiry

Anthropic OAuth tokens expire after **8–12 hours**.

**Auto-refresh (default):** The `anthropic-token-bridge` plugin handles refresh automatically using 3 strategies in order:
1. **Direct OAuth2 refresh** — calls the Anthropic token endpoint with the saved refresh_token (silent, no browser)
2. **Keychain sync** — reads the latest token from macOS Keychain (works if you've used `claude` recently)
3. **Setup token exchange** — calls `claude setup-token` and exchanges it (last resort)

No action needed in normal use.

**Manual refresh (fallback):** If auto-refresh fails for any reason, run:
```bash
claude           # ← IMPORTANT: run this FIRST to ensure Keychain has a fresh token
bash refresh-token.sh
```

Then restart OpenCode.

> [!important]
> **Day 2+ usage:** Tokens expire while you sleep. When you return the next morning:
> 1. Run `claude` once in Terminal (takes 2 seconds, refreshes the Keychain token)
> 2. If OpenCode is already running, run `bash refresh-token.sh` and restart it
>
> The auto-refresh plugin handles this silently if you use `claude` regularly.

> [!tip]
> Claude Code silently refreshes its own token in the background whenever you use it.
> So the Keychain always has a fresh token after any `claude` use — which is what the auto-refresh plugin pulls from.

---

## File Reference

```text
contrib/anthropic-max-bridge/
├── README.md              ← You are here
├── install.sh             ← One-time setup (run this first)
├── refresh-token.sh       ← Manual fallback token refresh
├── TECHNICAL.md           ← Deep dive: how the API fix works
└── plugins/
    ├── anthropic-max-bridge.js   ← API fix plugin (3 OAuth fixes)
    └── anthropic-token-bridge.js ← Auto-refresh plugin (every 5 messages)
```

---

## How tokens get from Claude Code into OpenCode

```
Claude Code CLI
    └─ authenticates with Anthropic
    └─ stores token in macOS Keychain
           Service: "Claude Code-credentials"

install.sh / refresh-token.sh
    └─ reads token from Keychain
    └─ writes to ~/.local/share/opencode/auth.json

OpenCode
    └─ reads auth.json on startup
    └─ anthropic-max-bridge:   3 API fixes on every request
    └─ anthropic-token-bridge: checks token every 5 messages,
                               auto-refreshes from Keychain if expiring
    └─ Anthropic API accepts → response streams back
```

---

## Sharing with teammates

Each person needs to run this on their own Mac because:
- The token is personal (tied to their Anthropic account)
- The token lives in their local Keychain

Send them this folder and have them follow **Quick Start** above.

---

## Troubleshooting

### "No credentials found in Keychain"
→ Run `claude` in Terminal and log in first. This authenticates Claude Code and stores the token in Keychain.

### "Token has already expired" / HTTP 401 in OpenCode
The token expired (happens after ~8–12 hours). Fix:
```bash
claude                    # Step 1: refresh the Keychain token (REQUIRED first)
bash refresh-token.sh     # Step 2: write it to auth.json
# Then restart OpenCode
```
**Do not skip Step 1.** `refresh-token.sh` reads from Keychain — if the Keychain token is also expired, the script will fail with "Keychain token is already expired".

### HTTP 400 in OpenCode
→ The `anthropic-max-bridge` plugin is not loaded. Check that `~/.opencode/plugins/anthropic-max-bridge.js` exists. Re-run `install.sh` if needed.

### Auto-refresh not working (token keeps expiring)
→ Check the debug log: `cat /tmp/pai-opencode-debug.log`
→ If it shows "claude setup-token failed", make sure `claude` is in your PATH and authenticated.
→ If it shows "OAuth refresh failed — invalid_grant", your refresh token was revoked. Run `claude` to re-authenticate, then `bash refresh-token.sh`.

### Model shows a non-zero cost
→ The `anthropic-max-bridge` plugin may not be active, or you're using an API key instead of OAuth. Re-run `install.sh`, restart OpenCode, and verify `auth.json` has `"type": "oauth"`:
```bash
cat ~/.local/share/opencode/auth.json | python3 -m json.tool | grep type
```

### I don't see `claude-sonnet-4-6` in the model list
→ In OpenCode settings, make sure `anthropic` is an enabled provider.

### How to check debug logs
All plugin activity is logged to `/tmp/pai-opencode-debug.log`:
```bash
tail -f /tmp/pai-opencode-debug.log
```

---

## Disclaimer

Using your Max/Pro OAuth token in a third-party tool may violate Anthropic's Terms of Service.
Anthropic can revoke tokens or block this approach at any time.

This is a temporary workaround, not an official solution.
Use at your own risk.

---

## Technical details

See [TECHNICAL.md](TECHNICAL.md) for:
- Exact API request format that works
- Why each fix is necessary
- curl command you can use to verify your token manually

---

## PAI-OpenCode integration

If you want the full PAI-OpenCode experience (preset models, installer, UI), see
[docs/providers/anthropic-max.md](../../docs/providers/anthropic-max.md).

This `contrib/` package is for users who just want the OAuth fix for a plain OpenCode install.
