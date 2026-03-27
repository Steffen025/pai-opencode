#!/usr/bin/env bash
# PAI-OpenCode Installer Bootstrap
#
# WHY: Single entry point for deterministic CLI installation.
#
# Usage:
#   bash install.sh [args...]          # CLI installation (default)
#   bash install.sh --cli [args...]    # CLI installation (--cli flag accepted for backward compatibility)
#

set -euo pipefail

# ─── Colors ────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ─── Helpers ───────────────────────────────────────────────
info() { echo -e "${BLUE}[installer]${NC} $*"; }
success() { echo -e "${GREEN}[installer]${NC} $*"; }
warn() { echo -e "${YELLOW}[installer]${NC} $*"; }
error() { echo -e "${RED}[installer]${NC} $*" >&2; }

# ─── Resolve Script Directory ────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Check/Install Bun ───────────────────────────────────
if command -v bun &>/dev/null; then
  success "Bun found: v$(bun --version 2>/dev/null || echo 'unknown')"
else
  info "Installing Bun runtime..."
  curl -fsSL https://bun.sh/install | bash 2>/dev/null

  # Add to PATH for this session
  export PATH="$HOME/.bun/bin:$PATH"

  if command -v bun &>/dev/null; then
    success "Bun installed: v$(bun --version 2>/dev/null || echo 'unknown')"
  else
    error "Failed to install Bun. Please install manually: https://bun.sh"
    exit 1
  fi
fi

# ─── Check OpenCode ───────────────────────────────────
if command -v opencode &>/dev/null; then
  success "OpenCode found"
else
  warn "OpenCode not found — will install during setup"
fi

# ─── Launch Installer (CLI only) ─────────────────────────
INSTALLER_DIR="$SCRIPT_DIR"

info "Launching CLI installer..."
echo ""

# Scan all args so removed flags cannot slip through
args=("$@")
stripLeadingCli=0

for ((i = 0; i < ${#args[@]}; i++)); do
	arg="${args[$i]}"
	next="${args[$((i + 1))]:-}"

	if [ "$arg" = "--cli" ]; then
		if [ $i -eq 0 ]; then
			stripLeadingCli=1
		else
			error "Flag --cli is no longer required. Remove it and re-run."
			exit 2
		fi
	fi

	if [ "$arg" = "--gui" ] || [ "$arg" = "--mode=gui" ] || { [ "$arg" = "--mode" ] && [ "$next" = "gui" ]; }; then
		error "Requested GUI mode was removed. Use CLI options."
		exit 2
	fi

	if [ "$arg" = "--mode" ] || [[ "$arg" == --mode=* ]]; then
		error "Flag --mode is not supported. Use --migrate or --update."
		exit 2
	fi
done

# Backwards-compatible alias
if [ $stripLeadingCli -eq 1 ]; then
	shift
fi

exec bun "$INSTALLER_DIR/cli/quick-install.ts" "$@"
