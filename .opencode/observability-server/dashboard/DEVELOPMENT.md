# Development Guide

## Running the Dashboard

### 1. Start the Observability Server

First, ensure the observability server is running:

```bash
cd /Users/steffen/workspace/github.com/Steffen025/pai-opencode/.opencode/observability-server
bun run server.ts
```

The server should be running on `http://localhost:8889`

### 2. Start the Dashboard

In a new terminal:

```bash
cd /Users/steffen/workspace/github.com/Steffen025/pai-opencode/.opencode/observability-server/dashboard
bun run dev
```

The dashboard will be available at `http://localhost:5173`

## Project Structure

```
dashboard/
├── src/
│   ├── main.ts              # Application entry point
│   ├── App.vue              # Root component with navigation
│   ├── style.css            # Tailwind CSS imports
│   ├── api.ts               # API client for observability server
│   ├── types.ts             # TypeScript type definitions
│   ├── env.d.ts             # TypeScript declarations
│   ├── components/
│   │   ├── StatsCards.vue   # Real-time statistics display
│   │   ├── EventStream.vue  # Live SSE event feed
│   │   ├── EventList.vue    # Paginated event browser
│   │   └── SessionList.vue  # Session list with expandable details
│   └── pages/
│       ├── Dashboard.vue    # Main dashboard page
│       ├── Events.vue       # Event browser page
│       └── Sessions.vue     # Session browser page
├── index.html               # HTML entry point
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

## Components

### StatsCards.vue

Displays four key metrics:
- Sessions today
- Tools executed today
- Average rating
- Security blocks

Fetches from `/api/stats` on mount and refreshes every 30 seconds.

### EventStream.vue

Real-time event stream using Server-Sent Events (SSE):
- Connects to `/api/events/stream`
- Displays last 50 events
- Pause/Resume functionality
- Connection status indicator
- Auto-reconnect on disconnect
- Color-coded event types

### EventList.vue

Paginated, searchable event list:
- Filter by event type
- Search by session ID
- Expandable event details
- Pagination controls
- Shows event data and metadata

### SessionList.vue

Session browser with details:
- Lists all sessions
- Shows session status (active/ended)
- Event and tool counts
- Expandable to show all session events
- Lazy-loads events on expand

## Pages

### Dashboard.vue

Main overview page combining:
- Statistics cards (top)
- Live event stream (bottom)

### Events.vue

Full event browser with search and filtering.

### Sessions.vue

Session list with expandable details.

## API Client (api.ts)

Provides typed functions for all API endpoints:

```typescript
getStats(): Promise<Stats>
getEvents(params?): Promise<EventsResponse>
createEventStream(): EventSource
getSessions(): Promise<SessionsResponse>
```

## Type System (types.ts)

Comprehensive TypeScript interfaces for:
- `Stats` - Aggregated statistics
- `Event` - Individual event with metadata
- `Session` - Session information
- `EventsResponse` - Paginated event response
- `SessionsResponse` - Session list response

## Styling

Uses Tailwind CSS with custom GitHub Dark theme:

```javascript
// tailwind.config.js
colors: {
  github: {
    bg: '#0d1117',        // Background
    card: '#161b22',      // Card background
    border: '#30363d',    // Borders
    text: '#c9d1d9',      // Primary text
    muted: '#8b949e',     // Secondary text
    blue: '#58a6ff',      // Links and accents
    green: '#3fb950',     // Success states
    orange: '#d29922',    // Warnings
    red: '#f85149',       // Errors
  }
}
```

## Event Type Colors

Events are color-coded based on type:

- **Blue** (`text-github-blue`): Session events
- **Green** (`text-github-green`): Tool execution
- **Orange** (`text-github-orange`): Messages
- **Red** (`text-github-red`): Errors and security events

## Building for Production

```bash
# Build
bun run build

# Preview production build
bun run preview
```

The built files will be in the `dist/` directory.

## Common Tasks

### Adding a New Page

1. Create component in `src/pages/NewPage.vue`
2. Add route in `src/main.ts`:
   ```typescript
   { path: '/new-page', component: NewPage }
   ```
3. Add navigation link in `src/App.vue`

### Adding a New API Endpoint

1. Add function in `src/api.ts`:
   ```typescript
   export async function getNewData(): Promise<NewDataType> {
     const res = await fetch(`${BASE_URL}/api/new-endpoint`)
     return res.json()
   }
   ```
2. Add type in `src/types.ts`:
   ```typescript
   export interface NewDataType {
     // fields
   }
   ```

### Modifying the Theme

Edit `tailwind.config.js` to change colors or add new utilities.

## Troubleshooting

### Dashboard won't connect to server

Ensure the observability server is running on port 8889:
```bash
curl http://localhost:8889/api/stats
```

### SSE connection drops

The EventStream component has auto-reconnect. Check browser console for errors.

### TypeScript errors

The project uses TypeScript strict mode. Ensure all types are properly defined.

### Build fails

Clear node_modules and reinstall:
```bash
rm -rf node_modules
bun install
```

## Performance Notes

- Event stream keeps only last 50 events in memory
- Stats auto-refresh every 30 seconds
- Session events lazy-load on expand
- Event list uses pagination (20 per page)

## Browser Support

Requires modern browser with:
- ES2020 support
- Server-Sent Events (SSE)
- Fetch API
- CSS Grid

Tested on:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
