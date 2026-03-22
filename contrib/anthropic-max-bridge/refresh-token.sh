#!/usr/bin/env bash
# ============================================================
# Anthropic Max Bridge — Token Refresh Script
# ============================================================
# Run this when your token has expired (usually every 8-12 hours).
# Much faster than the full install — just syncs the Keychain token.
#
# Usage:
#   bash refresh-token.sh
# ============================================================

set -euo pipefail

CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

AUTH_FILE="$HOME/.local/share/opencode/auth.json"

info() { echo -e "${CYAN}[INFO]${RESET}  $*"; }
ok()   { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
die()  { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }

echo ""
info "Refreshing Anthropic OAuth token from Keychain..."
echo ""

# Pull from Keychain
KEYCHAIN_JSON=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null || true)

if [[ -z "$KEYCHAIN_JSON" ]]; then
  die "No credentials in Keychain. Run 'claude' to authenticate first."
fi

ACCESS_TOKEN=$(echo "$KEYCHAIN_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data.get('claudeAiOauth', {}).get('accessToken', ''))
")

REFRESH_TOKEN=$(echo "$KEYCHAIN_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data.get('claudeAiOauth', {}).get('refreshToken', ''))
")

EXPIRES_AT=$(echo "$KEYCHAIN_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data.get('claudeAiOauth', {}).get('expiresAt', 0))
")

if [[ -z "$ACCESS_TOKEN" || "$ACCESS_TOKEN" != sk-ant-oat* ]]; then
  warn "Token not fresh or Claude Code session expired."
  warn "Run:  claude"
  warn "Then re-run:  bash refresh-token.sh"
  exit 1
fi

# Validate REFRESH_TOKEN is non-empty
[[ -z "$REFRESH_TOKEN" ]] && die "Refresh token is missing. Run 'claude' to re-authenticate."

# Validate EXPIRES_AT is numeric and positive
if ! [[ "$EXPIRES_AT" =~ ^[0-9]+$ ]] || [[ "$EXPIRES_AT" -le 0 ]]; then
  die "Invalid expiry timestamp ($EXPIRES_AT). Run 'claude' to re-authenticate."
fi

# Fail if the Keychain token is already expired
NOW_CHECK_MS=$(python3 -c "import time; print(int(time.time()*1000))")
if [[ "$EXPIRES_AT" -le "$NOW_CHECK_MS" ]]; then
  die "Keychain token is already expired. Run 'claude' once to re-authenticate, then retry."
fi

# Read existing auth.json
if [[ ! -f "$AUTH_FILE" ]]; then
  die "auth.json not found at $AUTH_FILE. Run install.sh first."
fi

# Export tokens as environment variables so the heredoc cannot be injected via token values
export PAI_ACCESS_TOKEN="$ACCESS_TOKEN"
export PAI_REFRESH_TOKEN="$REFRESH_TOKEN"
export PAI_EXPIRES_AT="$EXPIRES_AT"
export PAI_AUTH_FILE="$AUTH_FILE"

python3 - <<'PYEOF'
import json, os

auth_file  = os.environ["PAI_AUTH_FILE"]
access     = os.environ["PAI_ACCESS_TOKEN"]
refresh    = os.environ["PAI_REFRESH_TOKEN"]
expires_at = int(os.environ["PAI_EXPIRES_AT"])

with open(auth_file) as f:
    data = json.load(f)

data["anthropic"] = {
    "type":    "oauth",
    "access":  access,
    "refresh": refresh,
    "expires": expires_at,
}

with open(auth_file, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PYEOF

# Restore secure file permissions
chmod 600 "$AUTH_FILE"

# Clean up exported vars — they are no longer needed
unset PAI_ACCESS_TOKEN PAI_REFRESH_TOKEN PAI_EXPIRES_AT PAI_AUTH_FILE

NOW_MS=$(python3 -c "import time; print(int(time.time() * 1000))")
HOURS_LEFT=$(python3 -c "print(round(($EXPIRES_AT - $NOW_MS) / 3600000, 1))")
MASKED="${ACCESS_TOKEN:0:16}...${ACCESS_TOKEN: -4}"

ok "Token refreshed: $MASKED"
ok "Valid for ~${HOURS_LEFT} more hours"
echo ""
info "Restart OpenCode to pick up the new token."
echo ""
