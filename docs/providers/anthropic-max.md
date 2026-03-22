---
title: Anthropic Max/Pro — OAuth Preset
tags: [providers, anthropic]
published: true
type: guide
summary: Use your Anthropic Max or Pro subscription inside PAI-OpenCode via OAuth — no API key required.
---

# Anthropic Max/Pro — OAuth Preset

> Use your existing Anthropic Max or Pro subscription inside PAI-OpenCode.  
> No API key required. No extra monthly cost.

---

## What this is

In March 2026, Anthropic blocked OAuth tokens from being used in third-party tools like
OpenCode. Users paying $20–200/month for Max or Pro subscriptions could no longer use
those subscriptions with OpenCode without also paying for separate API keys.

The `anthropic-max` installer preset solves this with a minimal plugin that makes three
small request adjustments required by the OAuth endpoint — and nothing else.

---

## Prerequisites

| Requirement | Why |
|---|---|
| **macOS** | Token lives in macOS Keychain |
| **Claude Code CLI** installed | Source of the OAuth token |
| **Claude Code CLI authenticated** | Run `claude` and log in with your Anthropic account |

Install Claude Code CLI: https://claude.ai/code

---

## Install

### Option A — PAI-OpenCode installer (recommended)

```bash
# Interactive (GUI or CLI wizard)
bash install.sh

# Headless / CI
bun PAI-Install/cli/quick-install.ts \
  --preset anthropic-max \
  --name "Your Name" \
  --ai-name "PAI"
```

The installer will:
1. Copy the `anthropic-max-bridge` plugin to `~/.opencode/plugins/`
2. Extract your OAuth token from the macOS Keychain automatically
3. Write it to `~/.local/share/opencode/auth.json`
4. Report how long the token is valid

### Option B — Standalone (no full PAI install)

See [`contrib/anthropic-max-bridge/`](../../contrib/anthropic-max-bridge/README.md) in this
repository. No Bun, no PAI installer — just bash and Python 3.

---

## Models

| Tier | Model |
|---|---|
| Quick | `anthropic/claude-haiku-4-5` |
| Standard | `anthropic/claude-sonnet-4-6` |
| Advanced | `anthropic/claude-opus-4-6` |

All models show **$0 cost** in the OpenCode UI — they use your subscription quota.

---

## Token expiry and refresh

OAuth tokens expire after **8–12 hours**.

When you get an auth error, run:

```bash
bash PAI-Install/anthropic-max-refresh.sh
```

Then restart OpenCode.

> [!tip]
> Claude Code CLI silently refreshes its own token whenever you use it.  
> So `bash PAI-Install/anthropic-max-refresh.sh` right after any `claude` session
> will always find a fresh token.

---

## How it works (technical)

Three fixes applied by the plugin on every API request:

| # | Change | Without it |
|---|---|---|
| 1 | `system` prompt sent as **array of objects** `[{type,text}]` | HTTP 400 |
| 2 | `anthropic-beta: oauth-2025-04-20` header added | HTTP 401 "OAuth not supported" |
| 3 | `Authorization: Bearer <token>` instead of `x-api-key` | HTTP 401 |

The plugin itself is 80 lines with zero spoofing, zero endpoint rewrites, and zero
User-Agent manipulation. Those approaches are unnecessary.

Token path: `macOS Keychain → auth.json → plugin → Anthropic API`

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "No credentials in Keychain" | Run `claude` and log in |
| HTTP 401 in OpenCode | Token expired — run `anthropic-max-refresh.sh` |
| HTTP 400 in OpenCode | Plugin not loaded — check `~/.opencode/plugins/anthropic-max-bridge.js` exists |
| Model shows non-zero cost | Plugin not active — re-run installer |
| Linux / Windows | Not supported — Keychain is macOS-only |

---

## Disclaimer

Using an OAuth token from Claude Code in a third-party tool may violate Anthropic's
Terms of Service. This is a community workaround, not an official integration.
Anthropic can revoke tokens or block this approach at any time.

Use at your own risk.
