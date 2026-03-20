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

[[ ! -f "$AUTH_FILE" ]] && die "auth.json not found. Run the PAI-OpenCode installer first."

python3 - <<PYEOF
import json
with open("$AUTH_FILE") as f:
    data = json.load(f)
data["anthropic"] = {"type":"oauth","access":"$ACCESS_TOKEN","refresh":"$REFRESH_TOKEN","expires":$EXPIRES_AT}
with open("$AUTH_FILE","w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PYEOF

NOW_MS=$(python3 -c "import time; print(int(time.time()*1000))")
HOURS=$(python3 -c "print(round(($EXPIRES_AT - $NOW_MS)/3600000, 1))")
MASKED="${ACCESS_TOKEN:0:16}...${ACCESS_TOKEN: -4}"

ok "Token refreshed: $MASKED"
ok "Valid for ~${HOURS} more hours"
echo ""
info "Restart OpenCode to pick up the new token."
echo ""
