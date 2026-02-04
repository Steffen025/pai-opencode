# Quick Start Guide

## Prerequisites

- Bun runtime installed
- Observability server running on port 8889

## 1. Install Dependencies

```bash
bun install
```

## 2. Start Development Server

```bash
bun run dev
```

The dashboard will open at `http://localhost:5173`

## 3. Verify Connection

The dashboard should show:
- ✅ **Green dot** in the live event stream (connected)
- **Statistics cards** with data (if server has events)
- **Live events** appearing in real-time

## Testing Without Server

To test the UI without a running server:

1. The dashboard will display connection errors (expected)
2. You can still navigate between pages
3. UI elements and layout will be visible

## Full Setup

For complete setup with the observability server:

```bash
# Terminal 1: Start observability server
cd ../
bun run server.ts

# Terminal 2: Start dashboard
bun run dev
```

## Pages

- **Dashboard** (`/`) - Overview with stats and live stream
- **Events** (`/events`) - Searchable event browser
- **Sessions** (`/sessions`) - Session list with details

## Features at a Glance

### Dashboard Page
- Real-time statistics (refreshes every 30s)
- Live event stream via SSE
- Pause/Resume stream
- Connection status indicator

### Events Page
- Filter by event type
- Search by session ID
- Expandable event details
- Pagination (20 per page)

### Sessions Page
- List all sessions
- Active vs ended status
- Event and tool counts
- Expandable session details with all events

## Keyboard Shortcuts

- Click event/session to expand
- Click again to collapse

## Troubleshooting

### "Failed to fetch stats"

**Solution:** Ensure observability server is running:
```bash
curl http://localhost:8889/api/stats
```

### Red dot in event stream

**Solution:** Server is not running or SSE endpoint is down. The dashboard will auto-reconnect every 5 seconds.

### Port 5173 already in use

**Solution:** Kill the existing process or use a different port:
```bash
vite --port 5174
```

## Build for Production

```bash
bun run build
```

Output will be in `dist/` directory.

## Next Steps

See `DEVELOPMENT.md` for detailed development guide.
