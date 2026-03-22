#!/bin/bash

# Voice Server Installation Script
# This script installs the voice server as a macOS service

set -e

# Platform guard - macOS only
if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "Error: This installer only supports macOS" >&2
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVICE_NAME="com.pai.voice-server"
PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"
LOG_PATH="$HOME/Library/Logs/pai-voice-server.log"
# Match the server's env path: $OPENCODE_DIR/.env → $PAI_DIR/.env → ~/.opencode/.env
ENV_FILE="${OPENCODE_DIR:-${PAI_DIR:-$HOME/.opencode}}/.env"

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}     PAI Voice Server Installation${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo

# Check for Bun
echo -e "${YELLOW}> Checking prerequisites...${NC}"
if ! command -v bun &> /dev/null; then
    echo -e "${RED}X Bun is not installed${NC}"
    echo "  Please install Bun first:"
    echo "  curl -fsSL https://bun.sh/install | bash"
    exit 1
fi
echo -e "${GREEN}OK Bun is installed${NC}"

# Check for existing installation
if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
    echo -e "${YELLOW}! Voice server is already installed${NC}"
    read -p "Do you want to reinstall? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}> Stopping existing service...${NC}"
        launchctl unload "$PLIST_PATH" 2>/dev/null || true
        echo -e "${GREEN}OK Existing service stopped${NC}"
    else
        echo "Installation cancelled"
        exit 0
    fi
fi

# Check for ElevenLabs configuration
echo -e "${YELLOW}> Checking ElevenLabs configuration...${NC}"
if [ -f "$ENV_FILE" ] && grep -q "ELEVENLABS_API_KEY=" "$ENV_FILE"; then
    # Use grep -m1 to take only the first match (avoids concatenating multiple lines).
    # Strip the key name, remove surrounding quotes, trim whitespace.
    # Inline-comment stripping only removes a trailing ' #...' that sits outside quotes
    # (matches [space]#[^"']* at end-of-line) so '#' inside a value is preserved.
    API_KEY=$(grep -m1 "ELEVENLABS_API_KEY=" "$ENV_FILE" \
        | sed 's/^[^=]*=//' \
        | sed "s/^['\"]//;s/['\"]$//" \
        | sed "s/[[:space:]]*#[^\"']*$//" \
        | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    if [ "$API_KEY" != "your_api_key_here" ] && [ -n "$API_KEY" ]; then
        echo -e "${GREEN}OK ElevenLabs API key configured${NC}"
        ELEVENLABS_CONFIGURED=true
    else
        echo -e "${YELLOW}! ElevenLabs API key not configured${NC}"
        echo "  Voice server will use macOS 'say' command as fallback"
        ELEVENLABS_CONFIGURED=false
    fi
else
    echo -e "${YELLOW}! No ElevenLabs configuration found${NC}"
    echo "  Voice server will use macOS 'say' command as fallback"
    ELEVENLABS_CONFIGURED=false
fi

if [ "$ELEVENLABS_CONFIGURED" = false ]; then
    echo
    echo "To enable AI voices, add your ElevenLabs API key to ~/.env:"
    echo "  echo 'ELEVENLABS_API_KEY=your_api_key_here' >> ~/.env"
    echo "  Get a free key at: https://elevenlabs.io"
    echo
fi

# Create runtime wrapper script so Bun is resolved at launch time, not install time
WRAPPER_PATH="${SCRIPT_DIR}/run-server.sh"
cat > "$WRAPPER_PATH" << 'WRAPPER_EOF'
#!/bin/bash
# Runtime wrapper: resolves Bun from PATH at launch time so moves/upgrades don't break the service
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUN="$(which bun 2>/dev/null || echo "${HOME}/.bun/bin/bun")"
exec "$BUN" run "${SCRIPT_DIR}/server.ts" "$@"
WRAPPER_EOF
chmod +x "$WRAPPER_PATH"

# Create LaunchAgent plist
echo -e "${YELLOW}> Creating LaunchAgent configuration...${NC}"
mkdir -p "$HOME/Library/LaunchAgents"

# Build ELEVENLABS_API_KEY plist entry only when the key is non-empty
if [ -n "${API_KEY:-}" ]; then
    ELEVENLABS_PLIST_ENTRY="        <key>ELEVENLABS_API_KEY</key>
        <string>${API_KEY}</string>"
else
    ELEVENLABS_PLIST_ENTRY=""
fi

cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${SERVICE_NAME}</string>

    <key>ProgramArguments</key>
    <array>
        <string>${WRAPPER_PATH}</string>
    </array>

    <key>WorkingDirectory</key>
    <string>${SCRIPT_DIR}</string>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>

    <key>StandardOutPath</key>
    <string>${LOG_PATH}</string>

    <key>StandardErrorPath</key>
    <string>${LOG_PATH}</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>HOME</key>
        <string>${HOME}</string>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${HOME}/.bun/bin</string>
${ELEVENLABS_PLIST_ENTRY}
    </dict>
</dict>
</plist>
EOF

echo -e "${GREEN}OK LaunchAgent configuration created${NC}"

# Load the LaunchAgent
echo -e "${YELLOW}> Starting voice server service...${NC}"
launchctl load "$PLIST_PATH" 2>/dev/null || {
    echo -e "${RED}X Failed to load LaunchAgent${NC}"
    echo "  Try manually: launchctl load $PLIST_PATH"
    exit 1
}

# Poll until server is ready (or timeout)
echo -e "${YELLOW}> Waiting for voice server to start...${NC}"
HEALTH_TIMEOUT=60
HEALTH_INTERVAL=1
HEALTH_ELAPSED=0
SERVER_READY=false
while [ "$HEALTH_ELAPSED" -lt "$HEALTH_TIMEOUT" ]; do
    if curl -s -f -X GET http://localhost:8888/health > /dev/null 2>&1; then
        SERVER_READY=true
        break
    fi
    sleep "$HEALTH_INTERVAL"
    HEALTH_ELAPSED=$(( HEALTH_ELAPSED + HEALTH_INTERVAL ))
done

if [ "$SERVER_READY" != "true" ]; then
    echo -e "${RED}X Voice server did not respond within ${HEALTH_TIMEOUT}s${NC}"
    echo "  Check logs at: $LOG_PATH"
    echo "  Try running manually: bun run $SCRIPT_DIR/server.ts"
    exit 1
fi

# Server is ready (confirmed by polling loop above)
echo -e "${GREEN}OK Voice server is running${NC}"

# Send test notification
echo -e "${YELLOW}> Sending test notification...${NC}"
if curl -s -f -X POST http://localhost:8888/notify \
    -H "Content-Type: application/json" \
    -d '{"message": "Voice server installed successfully"}' > /dev/null 2>&1; then
    echo -e "${GREEN}OK Test notification sent${NC}"
else
    echo -e "${YELLOW}! Test notification failed (server running but notification endpoint error)${NC}"
fi

# Show summary
echo
echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN}     Installation Complete!${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo
echo -e "${BLUE}Service Information:${NC}"
echo "  - Service: $SERVICE_NAME"
echo "  - Status: Running"
echo "  - Port: 8888"
echo "  - Logs: $LOG_PATH"

if [ "$ELEVENLABS_CONFIGURED" = true ]; then
    echo "  - Voice: ElevenLabs AI"
else
    echo "  - Voice: macOS Say (fallback)"
fi

echo
echo -e "${BLUE}Management Commands:${NC}"
echo "  - Status:   ./status.sh"
echo "  - Stop:     ./stop.sh"
echo "  - Start:    ./start.sh"
echo "  - Restart:  ./restart.sh"
echo "  - Uninstall: ./uninstall.sh"

echo
echo -e "${BLUE}Test the server:${NC}"
echo "  curl -X POST http://localhost:8888/notify \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"message\": \"Hello from PAI\"}'"

echo
echo -e "${GREEN}The voice server will now start automatically when you log in.${NC}"

# Ask about menu bar indicator
echo
read -p "Would you like to install a menu bar indicator? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}> Installing menu bar indicator...${NC}"
    if [ -f "$SCRIPT_DIR/menubar/install-menubar.sh" ]; then
        chmod +x "$SCRIPT_DIR/menubar/install-menubar.sh"
        "$SCRIPT_DIR/menubar/install-menubar.sh"
    else
        echo -e "${YELLOW}! Menu bar installer not found${NC}"
        echo "  You can install it manually later from:"
        echo "  $SCRIPT_DIR/menubar/install-menubar.sh"
    fi
fi
