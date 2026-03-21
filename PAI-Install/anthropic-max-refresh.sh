#!/usr/bin/env bash
# ============================================================
# PAI-OpenCode — Anthropic Max Token Refresh
# ============================================================
# Run this when your Anthropic OAuth token has expired.
# Tokens last ~8-12 hours. Claude Code CLI refreshes its own
# token silently, so just run this script after using 'claude'.
#
# Usage:
#   bash PAI-Install/anthropic-max-refresh.sh
# ============================================================

set -euo pipefail

CYAN="\033[36m"; GREEN="\033[32m"; YELLOW="\033[33m"; RED="\033[31m"; RESET="\033[0m"
AUTH_FILE="$HOME/.local/share/opencode/auth.json"

info() { echo -e "${CYAN}[INFO]${RESET}  $*"; }
ok()   { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
die()  { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }

echo ""
info "Refreshing Anthropic OAuth token from macOS Keychain..."
echo ""

KEYCHAIN_JSON=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null || true)
[[ -z "$KEYCHAIN_JSON" ]] && die "No credentials found. Run 'claude' to authenticate first."

ACCESS_TOKEN=$(echo "$KEYCHAIN_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('claudeAiOauth',{}).get('accessToken',''))")
REFRESH_TOKEN=$(echo "$KEYCHAIN_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('claudeAiOauth',{}).get('refreshToken',''))")
EXPIRES_AT=$(echo "$KEYCHAIN_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('claudeAiOauth',{}).get('expiresAt',0))")

[[ -z "$ACCESS_TOKEN" || "$ACCESS_TOKEN" != sk-ant-oat* ]] && \
  die "Token not fresh. Run 'claude' to re-authenticate, then retry."

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

[[ ! -f "$AUTH_FILE" ]] && die "auth.json not found. Run the PAI-OpenCode installer first."

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
data["anthropic"] = {"type": "oauth", "access": access, "refresh": refresh, "expires": expires_at}
with open(auth_file, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PYEOF

# Restore secure file permissions (matching installer invariant)
chmod 600 "$AUTH_FILE"

# Clean up exported vars — they are no longer needed
unset PAI_ACCESS_TOKEN PAI_REFRESH_TOKEN PAI_EXPIRES_AT PAI_AUTH_FILE

NOW_MS=$(python3 -c "import time; print(int(time.time()*1000))")
HOURS=$(python3 -c "print(round(($EXPIRES_AT - $NOW_MS)/3600000, 1))")
MASKED="${ACCESS_TOKEN:0:16}...${ACCESS_TOKEN: -4}"

ok "Token refreshed: $MASKED"
ok "Valid for ~${HOURS} more hours"
echo ""
info "Restart OpenCode to pick up the new token."
echo ""
