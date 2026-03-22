#!/bin/bash

# Restart the Voice Server

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Colors
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${YELLOW}> Restarting Voice Server...${NC}"

# Stop the server
if ! "$SCRIPT_DIR/stop.sh"; then
    echo -e "${YELLOW}Warning: stop.sh returned an error${NC}"
fi

# Wait a moment
sleep 2

# Start the server
if ! "$SCRIPT_DIR/start.sh"; then
    echo -e "\033[0;31m[ERROR] start.sh failed${NC}"
    exit 1
fi

echo -e "${GREEN}OK Voice server restarted${NC}"
