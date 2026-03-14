#!/usr/bin/env bash
#
# PAI-OpenCode Wrapper — {AI_NAME}-wrapper
#
# WHY: The Homebrew build of OpenCode doesn't support our custom agent system
# (model_tiers, agent frontmatter metadata, PAI CODE branding). We compile our
# own binary from the feature/model-tiers branch of Steffen025/opencode.
#
# The compiled binary runs from ANY directory - no --cwd tricks, no symlinks,
# no process.cwd() overrides needed. Just a normal binary like Homebrew's.
#
# Usage:
#   {AI_NAME}-wrapper [opencode args...]
#   {AI_NAME}-wrapper --status       # Show build info and symlink health
#   {AI_NAME}-wrapper --brew          # Fall back to Homebrew version
#   {AI_NAME}-wrapper --rebuild       # Rebuild from source
#   {AI_NAME}-wrapper --fix-symlink   # Recreate ~/.opencode symlink to current PWD
#   {AI_NAME}-wrapper --help-wrapper  # Show this help
#
# Called from .zshrc {AI_NAME}() function:
#   {AI_NAME}() {
#     {AI_NAME}-wrapper "$@"
#   }
#

set -euo pipefail

# ─── Configuration ─────────────────────────────────────────
AI_NAME="{AI_NAME}"
PAI_BIN_DIR="${HOME}/.opencode/tools"
PAI_BIN="${PAI_BIN_DIR}/opencode"

# Detect Homebrew location (supports both Intel and Apple Silicon)
BREW_BIN=""
if [[ -x "/opt/homebrew/bin/opencode" ]]; then
    BREW_BIN="/opt/homebrew/bin/opencode"  # Apple Silicon
elif [[ -x "/usr/local/bin/opencode" ]]; then
    BREW_BIN="/usr/local/bin/opencode"     # Intel Mac
fi

# Resolve PAI installation directory from ~/.opencode symlink
PAI_INSTALL_DIR=""
if [[ -L "${HOME}/.opencode" ]]; then
    PAI_INSTALL_DIR=$(readlink -f "${HOME}/.opencode" 2>/dev/null || readlink "${HOME}/.opencode" 2>/dev/null)
fi

# Build directory is relative to the PAI installation
# (where the installer cloned the opencode source)
BUILD_DIR="${PAI_INSTALL_DIR:-${PWD}}/opencode-build"

# ─── Colors ────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─── Architecture Detection ──────────────────────────────
detect_binary() {
    local arch=$(uname -m)
    local os=$(uname -s | tr '[:upper:]' '[:lower:]')

    case "${arch}" in
        x86_64)  echo "${BUILD_DIR}/packages/opencode/dist/opencode-${os}-x64/bin/opencode" ;;
        arm64)   echo "${BUILD_DIR}/packages/opencode/dist/opencode-${os}-arm64/bin/opencode" ;;
        aarch64) echo "${BUILD_DIR}/packages/opencode/dist/opencode-${os}-arm64/bin/opencode" ;;
        *)       echo "" ;;
    esac
}

# ─── Rebuild from Source ──────────────────────────────────
rebuild() {
    echo -e "${BLUE}[${AI_NAME}]${NC} Rebuilding from source..."
    
    # If no PAI installation detected, we can't rebuild
    if [[ -z "${PAI_INSTALL_DIR}" ]]; then
        echo -e "${YELLOW}[${AI_NAME}]${NC} No PAI installation found at ~/.opencode"
        echo -e "${YELLOW}[${AI_NAME}]${NC} Please run the installer first or use --fix-symlink"
        return 1
    fi
    
    # Check for build directory or clone
    if [[ ! -d "${BUILD_DIR}" ]]; then
        echo -e "${BLUE}[${AI_NAME}]${NC} Cloning opencode source..."
        git clone https://github.com/Steffen025/opencode.git "${BUILD_DIR}" || {
            echo -e "${RED}[${AI_NAME}]${NC} Failed to clone source!"
            return 1
        }
        
        # Checkout feature/model-tiers branch
        echo -e "${BLUE}[${AI_NAME}]${NC} Checking out feature/model-tiers branch..."
        (cd "${BUILD_DIR}" && git fetch && git checkout feature/model-tiers) || {
            echo -e "${RED}[${AI_NAME}]${NC} Failed to checkout feature/model-tiers branch!"
            return 1
        }
        
        # Install dependencies
        echo -e "${BLUE}[${AI_NAME}]${NC} Installing dependencies (this may take 2-3 minutes)..."
        (cd "${BUILD_DIR}" && bun install) || {
            echo -e "${RED}[${AI_NAME}]${NC} Failed to install dependencies!"
            return 1
        }
    fi
    
    local branch=$(cd "${BUILD_DIR}" && git branch --show-current 2>/dev/null || echo "unknown")
    echo -e "${BLUE}[${AI_NAME}]${NC} Branch: ${branch}"

    # Build
    (cd "${BUILD_DIR}" && bun run --filter=opencode build) || {
        echo -e "${RED}[${AI_NAME}]${NC} Build failed!"
        return 1
    }

    # Symlink binary (Bun-compiled binaries MUST stay in dist/)
    local dist_bin=$(detect_binary)

    if [[ -z "${dist_bin}" || ! -f "${dist_bin}" ]]; then
        echo -e "${RED}[${AI_NAME}]${NC} Binary not found at: ${dist_bin}"
        return 1
    fi

    mkdir -p "${PAI_BIN_DIR}"
    rm -f "${PAI_BIN}"
    ln -s "${dist_bin}" "${PAI_BIN}"

    local commit=$(cd "${BUILD_DIR}" && git log --oneline -1 2>/dev/null || echo "unknown")
    echo -e "${GREEN}[${AI_NAME}]${NC} Build complete!"
    echo -e "${GREEN}[${AI_NAME}]${NC} Binary: ${PAI_BIN}"
    echo -e "${GREEN}[${AI_NAME}]${NC} Commit: ${commit}"
}

# ─── Fix Symlink ──────────────────────────────────────────
fix_symlink() {
    echo -e "${BLUE}[${AI_NAME}]${NC} Checking ~/.opencode symlink..."
    
    local target_dir="${PWD}/.opencode"
    local symlink_path="${HOME}/.opencode"
    
    # Check if target directory exists
    if [[ ! -d "${target_dir}" ]]; then
        echo -e "${RED}[${AI_NAME}]${NC} No .opencode directory found in current directory: ${PWD}"
        echo -e "${YELLOW}[${AI_NAME}]${NC} Run the installer first to create the installation."
        return 1
    fi
    
    # Check current symlink status
    if [[ -L "${symlink_path}" ]]; then
        local current_target=$(readlink -f "${symlink_path}" 2>/dev/null || readlink "${symlink_path}" 2>/dev/null)
        if [[ "${current_target}" == "${target_dir}" ]]; then
            echo -e "${GREEN}[${AI_NAME}]${NC} Symlink is already correct!"
            echo -e "${GREEN}[${AI_NAME}]${NC} ~/.opencode → ${target_dir}"
            return 0
        else
            echo -e "${YELLOW}[${AI_NAME}]${NC} Symlink points to wrong location: ${current_target}"
            echo -e "${BLUE}[${AI_NAME}]${NC} Updating to: ${target_dir}"
            rm -f "${symlink_path}"
        fi
    elif [[ -e "${symlink_path}" ]]; then
        echo -e "${RED}[${AI_NAME}]${NC} ~/.opencode exists but is not a symlink!"
        echo -e "${YELLOW}[${AI_NAME}]${NC} Please backup and remove it manually:"
        echo "  mv ~/.opencode ~/.opencode.backup-$(date +%Y%m%d)"
        return 1
    fi
    
    # Create symlink
    ln -s "${target_dir}" "${symlink_path}"
    echo -e "${GREEN}[${AI_NAME}]${NC} Symlink created!"
    echo -e "${GREEN}[${AI_NAME}]${NC} ~/.opencode → ${target_dir}"
    echo ""
    echo -e "${BLUE}[${AI_NAME}]${NC} You can now use ${AI_NAME} from any directory."
}

# ─── Check Symlink Health ────────────────────────────────
check_symlink_health() {
    local symlink_path="${HOME}/.opencode"
    
    if [[ ! -L "${symlink_path}" ]]; then
        if [[ -d "${symlink_path}" ]]; then
            echo "DIRECTORY"
        else
            echo "MISSING"
        fi
        return
    fi
    
    local target=$(readlink -f "${symlink_path}" 2>/dev/null || readlink "${symlink_path}" 2>/dev/null)
    
    if [[ ! -d "${target}" ]]; then
        echo "BROKEN"
    else
        echo "OK"
    fi
}

# ─── Show Status ─────────────────────────────────────────
show_status() {
    local brew_version=$("${BREW_BIN}" --version 2>/dev/null || echo "not installed")
    local binary_exists=$([[ -f "${PAI_BIN}" ]] && echo "yes" || echo "NO - run --rebuild")
    local binary_size=$([[ -f "${PAI_BIN}" ]] && du -hL "${PAI_BIN}" 2>/dev/null | awk '{print $1}' || echo "n/a")
    local symlink_status=$(check_symlink_health)
    local install_dir="${PAI_INSTALL_DIR:-"not detected"}"

    echo -e "${CYAN}${AI_NAME} - Custom Build Status${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "Binary:           ${PAI_BIN} (${binary_size})"
    echo -e "Binary exists:    ${binary_exists}"
    echo -e "Symlink:          ${symlink_status}"
    if [[ "${symlink_status}" == "BROKEN" ]]; then
        echo -e "${RED}  ⚠ Symlink is broken! Run: ${AI_NAME}-wrapper --fix-symlink${NC}"
    elif [[ "${symlink_status}" == "DIRECTORY" ]]; then
        echo -e "${YELLOW}  ⚠ ~/.opencode is a directory, not a symlink${NC}"
    elif [[ "${symlink_status}" == "MISSING" ]]; then
        echo -e "${YELLOW}  ⚠ Symlink missing! Run: ${AI_NAME}-wrapper --fix-symlink${NC}"
    else
        echo -e "  → ${install_dir}"
    fi
    echo -e "Build source:     ${BUILD_DIR}"
    echo -e "Brew version:     ${YELLOW}${brew_version}${NC} (inactive)"
    echo ""
    echo -e "${BLUE}Custom features:${NC}"
    echo "  - Agent model_tier support (quick/standard/advanced)"
    echo "  - Agent frontmatter metadata (voice, fallback, etc.)"
    echo "  - PAI CODE branding"
    echo ""
    echo -e "Fix symlink: ${YELLOW}${AI_NAME}-wrapper --fix-symlink${NC}"
    echo -e "Rebuild:     ${YELLOW}${AI_NAME}-wrapper --rebuild${NC}"
    echo -e "Escape:      ${YELLOW}${AI_NAME}-wrapper --brew${NC}"
}

# ─── Main ───────────────────────────────────────────────
main() {
    case "${1:-}" in
        --status)
            show_status
            exit 0
            ;;
        --brew)
            shift
            echo -e "${YELLOW}[${AI_NAME}]${NC} Using Homebrew version..."
            exec "${BREW_BIN}" "$@"
            ;;
        --rebuild)
            rebuild
            exit $?
            ;;
        --fix-symlink)
            fix_symlink
            exit $?
            ;;
        --help-wrapper)
            echo "${AI_NAME}-wrapper - PAI CODE Custom Build Launcher"
            echo ""
            echo "Runs a custom-compiled OpenCode binary with agent system support."
            echo ""
            echo "Special commands:"
            echo "  --status        Show build info and symlink health"
            echo "  --fix-symlink   Recreate ~/.opencode symlink to current directory"
            echo "  --brew          Use Homebrew OpenCode (escape hatch)"
            echo "  --rebuild       Rebuild binary from source"
            echo "  --help-wrapper  Show this help"
            echo ""
            echo "All other arguments are passed to ${AI_NAME}."
            echo ""
            echo "Symlink health:"
            echo "  ~/.opencode should point to your PAI installation directory"
            echo "  Use --fix-symlink to repair broken/missing symlinks"
            echo ""
            echo "Binary: ${PAI_BIN}"
            echo "Install: ${PAI_INSTALL_DIR:-"unknown (run --fix-symlink)"}"
            exit 0
            ;;
    esac

    # Check symlink health before running
    local symlink_status=$(check_symlink_health)
    if [[ "${symlink_status}" != "OK" ]]; then
        echo -e "${RED}[${AI_NAME}]${NC} ~/.opencode symlink is ${symlink_status}!"
        echo -e "${YELLOW}[${AI_NAME}]${NC} Run: ${AI_NAME}-wrapper --fix-symlink"
        exit 1
    fi

    # Verify binary exists
    if [[ ! -f "${PAI_BIN}" ]]; then
        echo -e "${RED}[${AI_NAME}]${NC} Binary not found at: ${PAI_BIN}"
        echo -e "${YELLOW}[${AI_NAME}]${NC} Run: ${AI_NAME}-wrapper --rebuild"
        echo -e "${YELLOW}[${AI_NAME}]${NC} Or use Homebrew version: ${AI_NAME}-wrapper --brew"
        exit 1
    fi

    # Run custom binary
    exec "${PAI_BIN}" "$@"
}

main "$@"
