#!/usr/bin/env bash
# ============================================================
# Anthropic Max Bridge — Install Script
# ============================================================
# This script sets up OpenCode to use your Anthropic Max / Pro
# subscription instead of a paid API key.
#
# Requirements:
#   - macOS (uses Keychain)
#   - Claude Code CLI installed and authenticated
#     (install: https://claude.ai/code  →  run: claude)
#   - OpenCode installed
#     (install: https://opencode.ai)
#
# Usage:
#   bash install.sh
# ============================================================

set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
CYAN="\033[36m"
RESET="\033[0m"

PLUGIN_DIR="$HOME/.opencode/plugins"
AUTH_FILE="$HOME/.local/share/opencode/auth.json"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Helpers ──────────────────────────────────────────────────

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
ok()      { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
die()     { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }
sep()     { echo -e "${BOLD}────────────────────────────────────────${RESET}"; }

# ── Banner ───────────────────────────────────────────────────

echo ""
echo -e "${BOLD}Anthropic Max Bridge — OpenCode Installer${RESET}"
sep
echo ""

# ── Step 1: Check dependencies ───────────────────────────────

info "Checking dependencies..."

if ! command -v opencode &>/dev/null; then
  warn "opencode not found in PATH."
  warn "Install from https://opencode.ai and re-run this script."
  # Non-fatal — user might have it elsewhere
fi

if ! command -v claude &>/dev/null; then
  die "Claude Code CLI not found. Install from https://claude.ai/code and run 'claude' to authenticate, then re-run this script."
fi

ok "Claude Code CLI found: $(command -v claude)"

# ── Step 2: Extract token from macOS Keychain ────────────────

sep
info "Extracting OAuth token from macOS Keychain..."
info "(You may see a Keychain permission prompt — click Allow)"
echo ""

KEYCHAIN_JSON=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null || true)

if [[ -z "$KEYCHAIN_JSON" ]]; then
  echo ""
  die "No Claude Code credentials found in Keychain.
  
  Please authenticate Claude Code first:
    1. Run:  claude
    2. Log in with your Anthropic account
    3. Re-run this install script"
fi

# Parse the JSON
ACCESS_TOKEN=$(echo "$KEYCHAIN_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
oauth = data.get('claudeAiOauth', {})
token = oauth.get('accessToken', '')
print(token)
" 2>/dev/null || true)

REFRESH_TOKEN=$(echo "$KEYCHAIN_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
oauth = data.get('claudeAiOauth', {})
print(oauth.get('refreshToken', ''))
" 2>/dev/null || true)

EXPIRES_AT=$(echo "$KEYCHAIN_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
oauth = data.get('claudeAiOauth', {})
print(oauth.get('expiresAt', 0))
" 2>/dev/null || true)

if [[ -z "$ACCESS_TOKEN" || "$ACCESS_TOKEN" != sk-ant-oat* ]]; then
  die "Token extraction failed or token format unexpected.
  
  Expected token starting with: sk-ant-oat01-...
  Got: ${ACCESS_TOKEN:0:20}...
  
  Try re-authenticating: claude logout && claude"
fi

# Validate REFRESH_TOKEN is non-empty
[[ -z "$REFRESH_TOKEN" ]] && die "Refresh token is missing. Run 'claude' to re-authenticate."

# Validate EXPIRES_AT is numeric and positive
if ! [[ "$EXPIRES_AT" =~ ^[0-9]+$ ]] || [[ "$EXPIRES_AT" -le 0 ]]; then
  die "Invalid expiry timestamp ($EXPIRES_AT). Run 'claude' to re-authenticate."
fi

# Mask for display
MASKED="${ACCESS_TOKEN:0:16}...${ACCESS_TOKEN: -4}"
ok "Token found: $MASKED"

# ── Step 3: Install the plugin ───────────────────────────────

sep
info "Installing plugin to $PLUGIN_DIR ..."

mkdir -p "$PLUGIN_DIR"
cp "$SCRIPT_DIR/plugins/anthropic-max-bridge.js" "$PLUGIN_DIR/anthropic-max-bridge.js"
cp "$SCRIPT_DIR/plugins/anthropic-token-bridge.js" "$PLUGIN_DIR/anthropic-token-bridge.js"

ok "Plugins installed:"
ok "  $PLUGIN_DIR/anthropic-max-bridge.js"
ok "  $PLUGIN_DIR/anthropic-token-bridge.js"

# ── Step 4: Write token to auth.json ─────────────────────────

sep
info "Writing token to $AUTH_FILE ..."

# Create parent directory if missing
mkdir -p "$(dirname "$AUTH_FILE")"

# Read existing auth.json (or start fresh)
if [[ -f "$AUTH_FILE" ]]; then
  EXISTING_JSON=$(cat "$AUTH_FILE")
else
  EXISTING_JSON="{}"
fi

# Export tokens as environment variables so the heredoc cannot be injected via token values
export PAI_ACCESS_TOKEN="$ACCESS_TOKEN"
export PAI_REFRESH_TOKEN="$REFRESH_TOKEN"
export PAI_EXPIRES_AT="$EXPIRES_AT"
export PAI_AUTH_FILE="$AUTH_FILE"
export PAI_EXISTING_JSON="$EXISTING_JSON"

python3 - <<'PYEOF'
import json, os, stat

auth_file    = os.environ["PAI_AUTH_FILE"]
access       = os.environ["PAI_ACCESS_TOKEN"]
refresh      = os.environ["PAI_REFRESH_TOKEN"]
expires_at   = int(os.environ["PAI_EXPIRES_AT"])
existing_raw = os.environ["PAI_EXISTING_JSON"]

existing = json.loads(existing_raw)
existing["anthropic"] = {
    "type":    "oauth",
    "access":  access,
    "refresh": refresh,
    "expires": expires_at,
}

with open(auth_file, "w") as f:
    json.dump(existing, f, indent=2)
    f.write("\n")

# Restrict to owner read/write only — tokens must not be world-readable
os.chmod(auth_file, stat.S_IRUSR | stat.S_IWUSR)

print("auth.json updated")
PYEOF

# Clean up exported vars — they are no longer needed
unset PAI_ACCESS_TOKEN PAI_REFRESH_TOKEN PAI_EXPIRES_AT PAI_AUTH_FILE PAI_EXISTING_JSON

ok "Token written to auth.json"

# ── Step 5: Verify token is not already expired ───────────────

NOW_MS=$(python3 -c "import time; print(int(time.time() * 1000))")

if [[ "$EXPIRES_AT" -le "$NOW_MS" ]]; then
  warn "Token has already expired!"
  warn "Re-authenticate Claude Code:  claude logout && claude"
  warn "Then re-run this script."
else
  HOURS_LEFT=$(python3 -c "print(round(($EXPIRES_AT - $NOW_MS) / 3600000, 1))")
  ok "Token is valid for ~${HOURS_LEFT} hours"
fi

# ── Done ─────────────────────────────────────────────────────

sep
echo ""
echo -e "${BOLD}${GREEN}Installation complete!${RESET}"
echo ""
echo "Next steps:"
echo "  1. Start (or restart) OpenCode"
echo "  2. Select model:  anthropic/claude-sonnet-4-6"
echo "     (or any other claude-* model)"
echo ""
echo "Token refresh:"
echo "  Tokens expire after ~8-12 hours."
echo "  The token-bridge plugin refreshes automatically every 5 messages."
echo "  If needed, you can also refresh manually:  bash refresh-token.sh"
echo ""
echo -e "${YELLOW}Note:${RESET} This uses your Max subscription quota."
echo "      All models show \$0 cost in the UI (already paid for)."
echo ""
