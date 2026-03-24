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

**Auto-refresh (fully silent):** The `anthropic-token-bridge` plugin refreshes your token automatically — no browser, no manual steps required.

- At **startup**: refreshes using the stored `refresh_token` (OAuth2 flow) before OpenCode checks auth
- Every **30 minutes**: keep-alive ping keeps the token from expiring due to inactivity
- Every **5 messages**: proactively refreshes when <1 hour remaining

**Manual refresh (fallback):** If auto-refresh fails for any reason (e.g. refresh token revoked), run:
```bash
bash refresh-token.sh
```

Then restart OpenCode.

> [!tip]
> The plugin uses the OAuth2 `refresh_token` flow directly — it does **not** require Claude Code to be running
> and does **not** open a browser. Silent background refresh, just like Claude Code itself does.

---

## File Reference

```
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
→ Run `claude` and log in first.

### "Token has already expired"
→ Run `claude` (to refresh Claude Code's own token), then `bash refresh-token.sh`.

### HTTP 401 in OpenCode
→ Token expired and auto-refresh failed. Run `bash refresh-token.sh`, then restart OpenCode.

### HTTP 400 in OpenCode
→ Plugin not loaded. Check that `~/.opencode/plugins/anthropic-max-bridge.js` exists.

### Model shows a non-zero cost
→ The plugin may not be active. Check OpenCode logs or re-run `install.sh`.

### I don't see `claude-sonnet-4-6` in the model list
→ In OpenCode settings, make sure `anthropic` is an enabled provider.

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
