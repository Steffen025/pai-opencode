#!/bin/bash

# Uninstall Voice Server

# Platform guard - macOS only
if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "Error: This uninstaller only supports macOS" >&2
    exit 1
fi

SERVICE_NAME="com.pai.voice-server"
PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"
LOG_PATH="$HOME/Library/Logs/pai-voice-server.log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}     PAI Voice Server Uninstall${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo

# Confirm uninstall
echo -e "${YELLOW}This will:${NC}"
echo "  - Stop the voice server"
echo "  - Remove the LaunchAgent"
echo "  - Keep your server files and configuration"
echo
read -p "Are you sure you want to uninstall? (y/n): " -n 1 -r
echo
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Uninstall cancelled"
    exit 0
fi

# Stop the service if running
echo -e "${YELLOW}> Stopping voice server...${NC}"
if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
    launchctl unload "$PLIST_PATH" 2>/dev/null
    echo -e "${GREEN}OK Voice server stopped${NC}"
else
    echo -e "${YELLOW}  Service was not running${NC}"
fi

# Remove LaunchAgent plist
echo -e "${YELLOW}> Removing LaunchAgent...${NC}"
if [ -f "$PLIST_PATH" ]; then
    rm "$PLIST_PATH"
    echo -e "${GREEN}OK LaunchAgent removed${NC}"
else
    echo -e "${YELLOW}  LaunchAgent file not found${NC}"
fi

# Kill any remaining VoiceServer processes — use lsof -t for PID-only output
# (avoids accidentally matching the "PID" header line from tabular lsof output)
if lsof -ti :8888 > /dev/null 2>&1; then
    echo -e "${YELLOW}> Cleaning up VoiceServer processes on port 8888...${NC}"
    while IFS= read -r pid; do
        [ -z "$pid" ] && continue
        # Verify the process command matches VoiceServer, bun, or server.ts before killing
        cmd=$(ps -p "$pid" -o comm= 2>/dev/null || true)
        if echo "$cmd" | grep -qE '(bun|server\.ts|VoiceServer)'; then
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null
            fi
        fi
    done < <(lsof -ti :8888 2>/dev/null)
    echo -e "${GREEN}OK Port 8888 cleared${NC}"
fi

# Ask about logs
echo
read -p "Do you want to remove log files? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "$LOG_PATH" ]; then
        rm "$LOG_PATH"
        echo -e "${GREEN}OK Log file removed${NC}"
    fi
fi

echo
echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN}     Uninstall Complete${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo
echo -e "${BLUE}Notes:${NC}"
# Resolve actual script directory, following symlinks
_SCRIPT_REAL="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || realpath "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
_SCRIPT_DIR="$(dirname "$_SCRIPT_REAL")"
echo "  - Your server files are still in: ${_SCRIPT_DIR}"
echo "  - Your ~/.env configuration is preserved"
echo "  - To reinstall, run: ./install.sh"
echo
echo "To completely remove all files:"
echo "  rm -rf ${_SCRIPT_DIR}"
