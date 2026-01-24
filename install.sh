#!/bin/bash
#
# PAI-OpenCode Installer v1.0
# https://github.com/Steffen025/pai-opencode
#
# Usage: curl -fsSL https://pai-opencode.dev/install.sh | bash
#        OR: ./install.sh [--skip-opencode-build]
#
# This script:
# 1. Installs prerequisites (Go, Bun) if missing
# 2. Builds OpenCode from source with PAI branding
# 3. Clones and configures PAI-OpenCode
# 4. Sets up user preferences and AI provider
#

set -e

# ==================== COLORS ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# ==================== HELPERS ====================
info() { echo -e "${BLUE}ℹ${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }
step() { echo -e "\n${PURPLE}[$1/7]${NC} ${BOLD}$2${NC}"; }

# Spinner for long operations
spin() {
    local pid=$1
    local delay=0.1
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " ${CYAN}%c${NC} " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b"
    done
    printf "   \b\b\b"
}

# ==================== BANNER ====================
# Responsive banner based on terminal width
show_banner() {
    local cols=$(tput cols 2>/dev/null || echo 80)

    echo -e "${CYAN}"
    if [ "$cols" -ge 98 ]; then
        # Full PAI-OPENCODE banner (98 chars wide)
        cat << 'EOF'
  ╔════════════════════════════════════════════════════════════════════════════════════════════════╗
  ║                                                                                                ║
  ║   ██████╗  █████╗ ██╗       ██████╗ ██████╗ ███████╗███╗   ██╗ ██████╗ ██████╗ ██████╗ ███████╗║
  ║   ██╔══██╗██╔══██╗██║      ██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██╔═══██╗██╔══██╗██╔════╝║
  ║   ██████╔╝███████║██║█████╗██║   ██║██████╔╝█████╗  ██╔██╗ ██║██║     ██║   ██║██║  ██║█████╗  ║
  ║   ██╔═══╝ ██╔══██║██║╚════╝██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██║     ██║   ██║██║  ██║██╔══╝  ║
  ║   ██║     ██║  ██║██║      ╚██████╔╝██║     ███████╗██║ ╚████║╚██████╗╚██████╔╝██████╔╝███████╗║
  ║   ╚═╝     ╚═╝  ╚═╝╚═╝       ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝║
  ║                                                                                                ║
  ║                           Personal AI Infrastructure v1.0                                      ║
  ║                                                                                                ║
  ╚════════════════════════════════════════════════════════════════════════════════════════════════╝
EOF
    elif [ "$cols" -ge 70 ]; then
        # Compact PAI banner (68 chars wide)
        cat << 'EOF'
  ╔══════════════════════════════════════════════════════════════╗
  ║                                                              ║
  ║   ██████╗  █████╗ ██╗                                        ║
  ║   ██╔══██╗██╔══██╗██║                                        ║
  ║   ██████╔╝███████║██║█████╗  OpenCode                        ║
  ║   ██╔═══╝ ██╔══██║██║╚════╝                                  ║
  ║   ██║     ██║  ██║██║       Personal AI Infrastructure v1.0  ║
  ║   ╚═╝     ╚═╝  ╚═╝╚═╝                                        ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
EOF
    else
        # Minimal text-only for very narrow terminals
        echo ""
        echo "  ╔════════════════════════════════════════╗"
        echo "  ║  PAI-OpenCode v1.0                     ║"
        echo "  ║  Personal AI Infrastructure            ║"
        echo "  ╚════════════════════════════════════════╝"
        echo ""
    fi
    echo -e "${NC}"
}

show_banner

# ==================== ARGS ====================
SKIP_OPENCODE_BUILD=false
INSTALL_DIR="${PAI_INSTALL_DIR:-$HOME/pai-opencode}"

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-opencode-build)
            SKIP_OPENCODE_BUILD=true
            shift
            ;;
        --install-dir)
            INSTALL_DIR="$2"
            shift 2
            ;;
        *)
            warn "Unknown option: $1"
            shift
            ;;
    esac
done

# ==================== OS CHECK ====================
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
    Darwin)
        info "Detected macOS ($ARCH)"
        ;;
    Linux)
        info "Detected Linux ($ARCH)"
        ;;
    *)
        error "Unsupported operating system: $OS. PAI-OpenCode requires macOS or Linux."
        ;;
esac

# ==================== STEP 1: PREREQUISITES ====================
step "1" "Checking Prerequisites"

# Check Go (check common paths first if not in PATH)
find_go() {
    if command -v go &> /dev/null; then
        echo "$(command -v go)"
        return 0
    fi
    # Check common Go installation paths
    local go_paths=(
        "/usr/local/go/bin/go"
        "/opt/homebrew/bin/go"
        "$HOME/go/bin/go"
        "/usr/local/bin/go"
    )
    for gp in "${go_paths[@]}"; do
        if [[ -x "$gp" ]]; then
            echo "$gp"
            return 0
        fi
    done
    return 1
}

GO_BIN=$(find_go || echo "")
if [[ -n "$GO_BIN" ]]; then
    GO_VERSION=$("$GO_BIN" version | awk '{print $3}' | sed 's/go//')
    success "Go $GO_VERSION found at $GO_BIN"
    # Ensure Go is in PATH for this session
    GO_DIR=$(dirname "$GO_BIN")
    if [[ ":$PATH:" != *":$GO_DIR:"* ]]; then
        export PATH="$GO_DIR:$PATH"
    fi
else
    info "Go not found. Installing..."
    if [[ "$OS" == "Darwin" ]]; then
        if command -v brew &> /dev/null; then
            # Run brew install in foreground (it has its own progress display)
            # Capture output to detect permission errors
            BREW_OUTPUT=$(brew install go 2>&1) || {
                if echo "$BREW_OUTPUT" | grep -q "not writable"; then
                    echo
                    error "Homebrew permission error detected!"
                    echo
                    echo -e "  ${YELLOW}Your user doesn't have write access to Homebrew directories.${NC}"
                    echo -e "  ${YELLOW}This often happens on shared Macs with multiple admin users.${NC}"
                    echo
                    echo -e "  ${BOLD}Fix with:${NC}"
                    echo -e "    ${CYAN}sudo chgrp -R admin /usr/local/Homebrew /usr/local/bin /usr/local/lib${NC}"
                    echo -e "    ${CYAN}sudo chmod -R g+w /usr/local/Homebrew /usr/local/bin /usr/local/lib${NC}"
                    echo
                    echo -e "  Then re-run the installer."
                    echo
                    exit 1
                else
                    echo "$BREW_OUTPUT"
                    error "Failed to install Go via Homebrew"
                fi
            }
            echo "$BREW_OUTPUT"

            # After Homebrew install, find Go in common locations
            GO_BIN=$(find_go || echo "")
            if [[ -z "$GO_BIN" ]]; then
                # Homebrew on Apple Silicon
                if [[ -x "/opt/homebrew/bin/go" ]]; then
                    GO_BIN="/opt/homebrew/bin/go"
                # Homebrew on Intel
                elif [[ -x "/usr/local/bin/go" ]]; then
                    GO_BIN="/usr/local/bin/go"
                fi
            fi

            if [[ -n "$GO_BIN" ]]; then
                GO_DIR=$(dirname "$GO_BIN")
                export PATH="$GO_DIR:$PATH"
                success "Go installed at $GO_BIN"
            else
                error "Go installation completed but binary not found. Please restart your terminal and re-run."
            fi
        else
            error "Homebrew not found. Please install Go manually: https://go.dev/dl/"
        fi
    else
        warn "Please install Go manually: https://go.dev/dl/"
        warn "Then re-run this installer."
        exit 1
    fi
fi

# Check Bun
if command -v bun &> /dev/null; then
    BUN_VERSION=$(bun --version 2>/dev/null || echo "unknown")
    success "Bun $BUN_VERSION found"
else
    info "Bun not found. Installing..."
    curl -fsSL https://bun.sh/install | bash &
    spin $!
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    success "Bun installed"
fi

# ==================== STEP 2: BUILD OPENCODE ====================
step "2" "Building OpenCode with PAI Branding"

if [[ "$SKIP_OPENCODE_BUILD" == "true" ]]; then
    warn "Skipping OpenCode build (--skip-opencode-build)"
    if ! command -v opencode &> /dev/null; then
        error "OpenCode not found and build was skipped. Cannot continue."
    fi
else
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"

    info "Cloning OpenCode repository..."
    git clone --depth 1 https://github.com/opencode-ai/opencode.git opencode-src &
    spin $!

    cd opencode-src

    info "Patching logo to 'PAI-OpenCode'..."
    # Patch the logo in chat.go (line 101 based on research)
    CHAT_FILE="internal/tui/components/chat/chat.go"
    if [[ -f "$CHAT_FILE" ]]; then
        # Use sed to replace "OpenCode" with "PAI-OpenCode" in the logo line
        if [[ "$OS" == "Darwin" ]]; then
            sed -i '' 's/"OpenCode"/"PAI-OpenCode"/g' "$CHAT_FILE"
        else
            sed -i 's/"OpenCode"/"PAI-OpenCode"/g' "$CHAT_FILE"
        fi
        success "Logo patched"
    else
        warn "Could not find chat.go - logo will show 'OpenCode'"
    fi

    info "Building OpenCode binary..."
    "$GO_BIN" build -o opencode ./main.go &
    spin $!

    # Install to GOPATH/bin
    GOPATH_BIN="$("$GO_BIN" env GOPATH 2>/dev/null || echo "$HOME/go")/bin"
    mkdir -p "$GOPATH_BIN"
    mv opencode "$GOPATH_BIN/"
    success "OpenCode installed to $GOPATH_BIN/opencode"

    # Cleanup
    cd "$HOME"
    rm -rf "$TEMP_DIR"

    # Ensure GOPATH/bin is in PATH
    if [[ ":$PATH:" != *":$GOPATH_BIN:"* ]]; then
        export PATH="$GOPATH_BIN:$PATH"
        warn "Added $GOPATH_BIN to PATH for this session"
        warn "Add this to your shell profile for persistence:"
        echo -e "    ${DIM}export PATH=\"\$PATH:$GOPATH_BIN\"${NC}"
    fi
fi

# ==================== STEP 3: CLONE PAI-OPENCODE ====================
step "3" "Setting up PAI-OpenCode"

if [[ -d "$INSTALL_DIR" ]]; then
    warn "PAI-OpenCode already exists at $INSTALL_DIR"
    read -p "$(echo -e "${YELLOW}?${NC} Overwrite? (y/N): ")" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$INSTALL_DIR"
    else
        info "Using existing installation"
    fi
fi

if [[ ! -d "$INSTALL_DIR" ]]; then
    info "Cloning PAI-OpenCode repository..."
    git clone https://github.com/Steffen025/pai-opencode.git "$INSTALL_DIR" &
    spin $!
    success "PAI-OpenCode cloned to $INSTALL_DIR"
fi

cd "$INSTALL_DIR"

info "Installing dependencies..."
bun install &
spin $!
success "Dependencies installed"

# ==================== STEP 4: SYMLINK ====================
step "4" "Creating Configuration Symlink"

OPENCODE_DIR="$HOME/.opencode"

if [[ -L "$OPENCODE_DIR" ]]; then
    info "Removing existing symlink..."
    rm "$OPENCODE_DIR"
elif [[ -d "$OPENCODE_DIR" ]]; then
    warn "Backing up existing ~/.opencode to ~/.opencode.backup"
    mv "$OPENCODE_DIR" "$OPENCODE_DIR.backup.$(date +%Y%m%d%H%M%S)"
fi

ln -s "$INSTALL_DIR/.opencode" "$OPENCODE_DIR"
success "Symlink created: ~/.opencode → $INSTALL_DIR/.opencode"

# ==================== STEP 5: USER CONFIGURATION ====================
step "5" "Personal Configuration"

echo -e "${DIM}Configure your PAI-OpenCode identity${NC}\n"

# Get user name
read -p "$(echo -e "${CYAN}?${NC} Your name: ")" USER_NAME
USER_NAME="${USER_NAME:-User}"

# Get assistant name
read -p "$(echo -e "${CYAN}?${NC} AI assistant name ${DIM}[PAI]${NC}: ")" ASSISTANT_NAME
ASSISTANT_NAME="${ASSISTANT_NAME:-PAI}"

# Get timezone
DEFAULT_TZ="Europe/Berlin"
if [[ -f /etc/timezone ]]; then
    DEFAULT_TZ=$(cat /etc/timezone)
elif [[ -L /etc/localtime ]]; then
    DEFAULT_TZ=$(readlink /etc/localtime | sed 's/.*zoneinfo\///')
fi
read -p "$(echo -e "${CYAN}?${NC} Timezone ${DIM}[$DEFAULT_TZ]${NC}: ")" TIMEZONE
TIMEZONE="${TIMEZONE:-$DEFAULT_TZ}"

# Update settings.json
SETTINGS_FILE="$INSTALL_DIR/.opencode/settings.json"
cat > "$SETTINGS_FILE" << EOF
{
  "identity": {
    "assistant_name": "$ASSISTANT_NAME",
    "user_name": "$USER_NAME"
  },
  "environment": {
    "PAI_DIR": ".opencode",
    "TIME_ZONE": "$TIMEZONE"
  },
  "preferences": {
    "language": "TypeScript",
    "package_manager": "bun",
    "runtime": "bun"
  }
}
EOF

success "Configuration saved to settings.json"

# ==================== STEP 6: AI PROVIDER ====================
step "6" "AI Provider Setup"

echo -e "${DIM}Choose your AI provider${NC}\n"
echo -e "  ${GREEN}1)${NC} Claude Subscription (Pro/Max) ${DIM}← Recommended if you have a subscription${NC}"
echo -e "  ${BLUE}2)${NC} Anthropic API Key ${DIM}(console.anthropic.com)${NC}"
echo -e "  ${PURPLE}3)${NC} OpenAI API Key ${DIM}(platform.openai.com)${NC}"
echo -e "  ${CYAN}4)${NC} Google Gemini API Key ${DIM}(aistudio.google.com)${NC}"
echo -e "  ${YELLOW}5)${NC} xAI Grok API Key ${DIM}(console.x.ai)${NC}"
echo -e "  ${DIM}6)${NC} Groq API Key ${DIM}(console.groq.com - fast & cheap)${NC}"
echo -e "  ${DIM}7)${NC} Other / Manual Configuration"
echo

read -p "$(echo -e "${CYAN}?${NC} Select provider [1-7]: ")" PROVIDER_CHOICE
PROVIDER_CHOICE="${PROVIDER_CHOICE:-1}"

case "$PROVIDER_CHOICE" in
    1)
        # Claude Subscription
        echo
        success "Claude Subscription selected"
        echo
        echo -e "${YELLOW}IMPORTANT:${NC} After installation, run these commands inside OpenCode:"
        echo -e "  ${DIM}1.${NC} /login     ${DIM}# Opens browser for Claude authentication${NC}"
        echo -e "  ${DIM}2.${NC} /provider anthropic"
        echo
        info "Agents will use Anthropic models via your subscription"
        PROVIDER="anthropic"
        MODEL_SONNET="anthropic/claude-sonnet-4-5"
        MODEL_HAIKU="anthropic/claude-haiku-4-5"
        ;;
    2)
        # Anthropic API
        echo
        echo -e "${DIM}Get your API key at: https://console.anthropic.com/${NC}"
        read -p "$(echo -e "${CYAN}?${NC} Anthropic API Key: ")" -s API_KEY
        echo
        if [[ -z "$API_KEY" ]]; then
            warn "No API key provided. Run 'opencode config' after installation."
        else
            info "Run 'opencode config' and enter this key when prompted"
        fi
        PROVIDER="anthropic"
        MODEL_SONNET="anthropic/claude-sonnet-4-5"
        MODEL_HAIKU="anthropic/claude-haiku-4-5"
        ;;
    3)
        # OpenAI
        echo
        echo -e "${DIM}Get your API key at: https://platform.openai.com/api-keys${NC}"
        echo -e "${DIM}Note: ChatGPT Plus subscription does NOT include API access${NC}"
        read -p "$(echo -e "${CYAN}?${NC} OpenAI API Key: ")" -s API_KEY
        echo
        if [[ -z "$API_KEY" ]]; then
            warn "No API key provided. Run 'opencode config' after installation."
        else
            info "Run 'opencode config' and enter this key when prompted"
        fi
        PROVIDER="openai"
        MODEL_SONNET="openai/gpt-4o"
        MODEL_HAIKU="openai/gpt-4o-mini"
        ;;
    4)
        # Google Gemini
        echo
        echo -e "${DIM}Get your API key at: https://aistudio.google.com/apikey${NC}"
        read -p "$(echo -e "${CYAN}?${NC} Google Gemini API Key: ")" -s API_KEY
        echo
        if [[ -z "$API_KEY" ]]; then
            warn "No API key provided. Run 'opencode config' after installation."
        else
            info "Run 'opencode config' and enter this key when prompted"
        fi
        PROVIDER="google"
        MODEL_SONNET="google/gemini-2.0-flash"
        MODEL_HAIKU="google/gemini-2.0-flash-lite"
        ;;
    5)
        # xAI Grok
        echo
        echo -e "${DIM}Get your API key at: https://console.x.ai/${NC}"
        read -p "$(echo -e "${CYAN}?${NC} xAI Grok API Key: ")" -s API_KEY
        echo
        if [[ -z "$API_KEY" ]]; then
            warn "No API key provided. Run 'opencode config' after installation."
        else
            info "Run 'opencode config' and enter this key when prompted"
        fi
        PROVIDER="xai"
        MODEL_SONNET="xai/grok-2"
        MODEL_HAIKU="xai/grok-2"
        ;;
    6)
        # Groq
        echo
        echo -e "${DIM}Get your API key at: https://console.groq.com/keys${NC}"
        echo -e "${DIM}Groq offers fast inference for open-source models${NC}"
        read -p "$(echo -e "${CYAN}?${NC} Groq API Key: ")" -s API_KEY
        echo
        if [[ -z "$API_KEY" ]]; then
            warn "No API key provided. Run 'opencode config' after installation."
        else
            info "Run 'opencode config' and enter this key when prompted"
        fi
        PROVIDER="groq"
        MODEL_SONNET="groq/llama-3.3-70b-versatile"
        MODEL_HAIKU="groq/llama-3.1-8b-instant"
        ;;
    7)
        # Manual
        echo
        info "Manual configuration selected"
        echo -e "${DIM}Run 'opencode config' after installation to set up your provider.${NC}"
        echo -e "${DIM}Then update agent configs in .opencode/agents/*.md${NC}"
        PROVIDER="manual"
        MODEL_SONNET=""
        MODEL_HAIKU=""
        ;;
    *)
        warn "Invalid choice, defaulting to Claude Subscription"
        PROVIDER="anthropic"
        MODEL_SONNET="anthropic/claude-sonnet-4-5"
        MODEL_HAIKU="anthropic/claude-haiku-4-5"
        ;;
esac

# Update agent configurations if provider was selected
if [[ "$PROVIDER" != "manual" && -n "$MODEL_SONNET" ]]; then
    info "Updating agent configurations..."

    AGENTS_DIR="$INSTALL_DIR/.opencode/agents"
    AGENT_COUNT=0

    for agent_file in "$AGENTS_DIR"/*.md; do
        if [[ -f "$agent_file" ]]; then
            # Replace model references
            if [[ "$OS" == "Darwin" ]]; then
                sed -i '' "s|model: anthropic/claude-sonnet-4-5|model: $MODEL_SONNET|g" "$agent_file"
                sed -i '' "s|model: anthropic/claude-haiku-4-5|model: $MODEL_HAIKU|g" "$agent_file"
            else
                sed -i "s|model: anthropic/claude-sonnet-4-5|model: $MODEL_SONNET|g" "$agent_file"
                sed -i "s|model: anthropic/claude-haiku-4-5|model: $MODEL_HAIKU|g" "$agent_file"
            fi
            ((AGENT_COUNT++))
        fi
    done

    success "$AGENT_COUNT agents updated to use $PROVIDER"
fi

# ==================== STEP 7: VERIFICATION ====================
step "7" "Verification"

ERRORS=0

# Check binary
if command -v opencode &> /dev/null; then
    success "OpenCode binary installed"
else
    error "OpenCode binary not found in PATH"
    ((ERRORS++))
fi

# Check symlink
if [[ -L "$HOME/.opencode" ]]; then
    success "Symlink ~/.opencode exists"
else
    error "Symlink ~/.opencode not found"
    ((ERRORS++))
fi

# Check settings
if [[ -f "$INSTALL_DIR/.opencode/settings.json" ]]; then
    success "Settings configured"
else
    error "Settings file not found"
    ((ERRORS++))
fi

# Check skills directory
if [[ -d "$INSTALL_DIR/.opencode/skills" ]]; then
    SKILL_COUNT=$(find "$INSTALL_DIR/.opencode/skills" -name "SKILL.md" | wc -l | tr -d ' ')
    success "$SKILL_COUNT skills available"
else
    error "Skills directory not found"
    ((ERRORS++))
fi

# ==================== DONE ====================
echo
if [[ $ERRORS -eq 0 ]]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                               ║${NC}"
    echo -e "${GREEN}║   ${BOLD}🎉 PAI-OpenCode installed successfully!${NC}                     ${GREEN}║${NC}"
    echo -e "${GREEN}║                                                               ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${BOLD}Next steps:${NC}"
    echo
    if [[ "$PROVIDER_CHOICE" == "1" ]]; then
        echo -e "  1. Run ${CYAN}opencode${NC}"
        echo -e "  2. Inside OpenCode, run ${CYAN}/login${NC} to connect your Claude subscription"
        echo -e "  3. Run ${CYAN}/provider anthropic${NC} to select Claude"
    else
        echo -e "  1. Run ${CYAN}opencode${NC} to start PAI-OpenCode"
    fi
    echo
    echo -e "  ${DIM}Ask: \"What skills do I have?\" to see available capabilities${NC}"
    echo
    echo -e "${DIM}Documentation: https://github.com/Steffen025/pai-opencode${NC}"
else
    echo -e "${RED}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║   Installation completed with $ERRORS error(s)                     ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "Please check the errors above and try again."
    exit 1
fi
