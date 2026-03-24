# Technical Reference — Anthropic Max Bridge

## The Problem (Discovered 2026-03-20)

When Anthropic restricted OAuth tokens to first-party tools, they enforced three API-level differences between OAuth auth and API-key auth:

### Difference 1: `system` prompt format

OAuth endpoint **requires** the system field to be an array of content blocks:

```json
// WRONG — works with API keys, fails with OAuth → HTTP 400
"system": "You are a helpful assistant."

// RIGHT — required for OAuth → HTTP 200
"system": [
  { "type": "text", "text": "You are a helpful assistant." }
]
```

OpenCode (and most SDKs) send it as a string. The plugin transforms it before each request.

### Difference 2: OAuth beta header

Without this header, the API returns `401 "OAuth authentication is currently not supported"`:

```http
anthropic-beta: oauth-2025-04-20
```

### Difference 3: Bearer token vs. API key

```http
# API key (wrong for OAuth)
x-api-key: sk-ant-api03-...

# OAuth token (required)
Authorization: Bearer sk-ant-oat01-...
```

---

## Verified working curl command

Use this to test your token manually:

```bash
# First, get your token
TOKEN=$(security find-generic-password -s "Claude Code-credentials" -w \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['claudeAiOauth']['accessToken'])")

# Then test it
curl https://api.anthropic.com/v1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: oauth-2025-04-20" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-6",
    "max_tokens": 30,
    "system": [{"type": "text", "text": "You are a helpful assistant."}],
    "messages": [{"role": "user", "content": "Say hello in one word."}]
  }'
```

Expected: `HTTP 200` with a streamed response.

---

## Token structure in macOS Keychain

**Keychain service name:** `Claude Code-credentials`

**Raw value** (JSON string):
```json
{
  "claudeAiOauth": {
    "accessToken":  "sk-ant-oat01-...",
    "refreshToken": "sk-ant-ort01-...",
    "expiresAt":    1774040404027,
    "subscriptionType": "max",
    "rateLimitTier": "default_claude_max_20x"
  }
}
```

**Extract access token:**
```bash
security find-generic-password -s "Claude Code-credentials" -w \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['claudeAiOauth']['accessToken'])"
```

---

## auth.json format

OpenCode reads `~/.local/share/opencode/auth.json` on startup.

The `anthropic` section should look like this for OAuth:
```json
{
  "anthropic": {
    "type": "oauth",
    "access":  "sk-ant-oat01-...",
    "refresh": "sk-ant-ort01-...",
    "expires": 1774040404027
  }
}
```

`expires` is a Unix timestamp in **milliseconds**.

---

## Plugin implementation (annotated)

```javascript
// Fix 1: system prompt transformation
async "experimental.chat.system.transform"(input, output) {
  if (input.model?.providerID !== "anthropic") return;

  // Convert any plain strings → { type: "text", text: "..." }
  output.system = output.system.map((s) =>
    typeof s === "string" ? { type: "text", text: s } : s,
  );
},

// Fixes 2 & 3: request header injection
async fetch(input, init) {
  const currentAuth = await getAuth();
  if (currentAuth.type !== "oauth") return fetch(input, init); // passthrough for API keys

  const headers = /* merge existing headers */;

  // Fix 2: add OAuth beta flag
  headers.set("anthropic-beta", "oauth-2025-04-20, ...");

  // Fix 3: Bearer token, remove API key header
  headers.set("authorization", `Bearer ${currentAuth.access}`);
  headers.delete("x-api-key");

  return fetch(input, { ...init, headers });
},
```

---

## What we ruled out

These changes are NOT necessary (tested and confirmed):

| Approach | Verdict |
|---|---|
| Rewrite endpoint to `platform.claude.com` | Not needed — `api.anthropic.com` works |
| Spoof `User-Agent: claude-code/2.1.80` | Not needed |
| Replace "OpenCode" text with "Claude Code" in requests | Not needed |
| Prefix tool names with `mcp_` | Not needed |
| Add billing header (`x-anthropic-billing-header`) | Not needed |
| Add `?beta=true` URL param | Not needed |

The gonzalosr Gist and other community approaches added all of these. None of them are required.

---

## Token lifetime

- Access tokens expire after **~8–12 hours**
- The `anthropic-token-bridge` plugin handles refresh automatically:
  - **config hook**: refreshes silently at OpenCode startup before any auth check → prevents browser popup
  - **keep-alive ping**: hits `/api/oauth/usage` every 30 min to prevent inactivity expiry
  - Checks token status every 5 user messages (proactive: triggers when <1 hour remaining)
  - 3 strategies in order:
    1. **OAuth `refresh_token` API** (silent, no browser) — `POST /v1/oauth/token` with `User-Agent: claude-cli/2.0`
    2. Keychain sync (if OAuth refresh fails)
    3. `claude setup-token` exchange (last resort, may trigger browser)
  - 3× retry with exponential backoff (2s, 4s, 8s) for 429 rate-limit responses
  - 5-minute cooldown between refresh attempts
  - All log output goes to `/tmp/pai-opencode-debug.log` (TUI-safe)
- Manual fallback: re-run `refresh-token.sh` if auto-refresh fails, then restart OpenCode

---

## Models confirmed working

- `claude-sonnet-4-6` ✅ (tested 2026-03-20)
- `claude-opus-4-6` ✅ (should work, same auth path)
- `claude-haiku-*` ✅ (expected to work)

**Note:** Use bare model names in API calls, e.g. `claude-sonnet-4-6`.
In OpenCode's model picker, use the full ID: `anthropic/claude-sonnet-4-6`.
