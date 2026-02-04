# PAI-OpenCode Observability Dashboard

Vue 3 + Vite + Tailwind CSS dashboard for the PAI-OpenCode observability server.

## Features

- **Real-time Event Stream**: Live SSE connection showing events as they happen
- **Statistics Cards**: Aggregated metrics refreshed every 30 seconds
- **Event Browser**: Searchable, paginated event list with filters
- **Session Browser**: View all sessions and their associated events
- **GitHub Dark Theme**: Professional dark theme matching GitHub's design

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

The dashboard will be available at `http://localhost:5173`

## Prerequisites

The observability server must be running on port 8889. Start it with:

```bash
cd ../
bun run server.ts
```

## Architecture

```
src/
├── main.ts              # App entry point with Vue Router
├── App.vue              # Root component with navigation
├── api.ts               # API client for observability server
├── types.ts             # TypeScript interfaces
├── components/
│   ├── StatsCards.vue   # Dashboard statistics
│   ├── EventStream.vue  # Live SSE event feed
│   ├── EventList.vue    # Paginated event browser
│   └── SessionList.vue  # Session list with details
└── pages/
    ├── Dashboard.vue    # Main overview page
    ├── Events.vue       # Event browser page
    └── Sessions.vue     # Session browser page
```

## API Integration

The dashboard connects to these observability server endpoints:

- `GET /api/stats` - Aggregated statistics
- `GET /api/events` - Query events (with filtering)
- `GET /api/events/stream` - SSE real-time stream
- `GET /api/sessions` - Query sessions

## Color Scheme

Using GitHub Dark theme:
- Background: `#0d1117`
- Card background: `#161b22`
- Border: `#30363d`
- Text primary: `#c9d1d9`
- Text secondary: `#8b949e`
- Accent blue: `#58a6ff`
- Success green: `#3fb950`
- Warning orange: `#d29922`
- Error red: `#f85149`

## Development

Built with:
- Vue 3 (Composition API)
- TypeScript
- Vite
- Tailwind CSS
- Vue Router

## License

MIT
