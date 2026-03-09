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

# Check bun
if ! command -v bun &>/dev/null; then
	echo "Installing Bun..."
	curl -fsSL https://bun.sh/install | bash
	export PATH="$HOME/.bun/bin:$PATH"
fi

# Launch mode
if [ "${1:-}" = "--cli" ]; then
	# Headless mode
	shift
	exec bun PAI-Install/cli/quick-install.ts "$@"
else
	# GUI mode (default)
	cd PAI-Install/electron
	bun install --silent 2>/dev/null || true
	exec bunx electron .
fi
