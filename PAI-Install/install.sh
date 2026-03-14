#!/usr/bin/env bash
# PAI-OpenCode Installer Bootstrap
#
# WHY: Single entry point for both GUI and headless installation.
#
# Usage:
#   bash install.sh                    # Launch Electron GUI (default)
#   bash install.sh --cli [args...]  # Headless installation
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

# ─── Launch Installer ────────────────────────────────────
# Resolve PAI-Install directory (may be sibling or child of script location)
INSTALLER_DIR=""
if [ -d "$SCRIPT_DIR/PAI-Install" ]; then
  INSTALLER_DIR="$SCRIPT_DIR/PAI-Install"
elif [ -f "$SCRIPT_DIR/main.ts" ]; then
  INSTALLER_DIR="$SCRIPT_DIR"
else
  error "Cannot find PAI-Install directory. Expected at: $SCRIPT_DIR/PAI-Install/"
  exit 1
fi

info "Launching installer..."
echo ""

# Launch mode
if [ "${1:-}" = "--cli" ]; then
	# Headless mode
	shift
	exec bun "$INSTALLER_DIR/cli/quick-install.ts" "$@"
else
	# GUI mode (default) - runs from electron subdirectory
	cd "$INSTALLER_DIR/electron"
	if ! bun install 2>&1 | tee /tmp/pai-install-deps.log; then
		echo "⚠️  Warning: bun install had issues. Check /tmp/pai-install-deps.log"
	fi
	exec bunx electron .
fi
