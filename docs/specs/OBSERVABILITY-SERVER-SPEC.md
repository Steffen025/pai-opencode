# Observability Server Specification

**Version:** 1.0 (Draft)
**Target Release:** v1.2.0
**Status:** In Development

---

## Overview

The Observability Server provides **real-time monitoring** of PAI-OpenCode activity through a web-based dashboard. It captures events from the plugin system and presents them in a visual, searchable interface.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PAI-OpenCode Runtime                            │
│                                                                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │ context-loader  │    │ security-valid. │    │ voice-notif.    │     │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘     │
│           │                      │                      │               │
│           └──────────────────────┼──────────────────────┘               │
│                                  │                                      │
│                                  ▼                                      │
│                    ┌─────────────────────────┐                          │
│                    │  observability-emitter  │  ◄── NEW HANDLER         │
│                    │  (plugin handler)       │                          │
│                    └───────────┬─────────────┘                          │
│                                │                                        │
└────────────────────────────────┼────────────────────────────────────────┘
                                 │
                                 │ HTTP POST /events
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Observability Server                               │
│                      (.opencode/observability-server/)                  │
│                                                                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │   Bun HTTP      │    │   SQLite DB     │    │   SSE Stream    │     │
│  │   Server        │───▶│   (events.db)   │───▶│   /stream       │     │
│  │   :8889         │    │                 │    │                 │     │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘     │
│           │                                              │              │
│           │              ┌─────────────────┐             │              │
│           └─────────────▶│   Vue 3 SPA     │◄────────────┘              │
│            GET /         │   Dashboard     │                            │
│                          └─────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Observability Emitter (Plugin Handler)

**Location:** `.opencode/plugins/handlers/observability-emitter.ts`

**Purpose:** Captures events from all plugin hooks and sends them to the Observability Server.

**Events Captured:**

| Event Type | Hook Source | Data |
|------------|-------------|------|
| `session.start` | `experimental.chat.system.transform` | Session ID, timestamp |
| `session.end` | `event` (session.ended) | Session ID, duration, stats |
| `tool.execute` | `tool.execute.before/after` | Tool name, args, duration, result |
| `security.block` | `permission.ask`, `tool.execute.before` | Tool, reason, pattern |
| `security.warn` | `permission.ask` | Tool, reason |
| `message.user` | `chat.message` | Message length, has rating |
| `message.assistant` | `chat.message` | Response length, voice line |
| `rating.explicit` | `chat.message` (rating-capture) | Score 1-10, comment |
| `rating.implicit` | `chat.message` (implicit-sentiment) | Score, confidence |
| `agent.spawn` | `tool.execute.after` (Task tool) | Agent type, prompt length |
| `agent.complete` | `tool.execute.after` (Task tool) | Agent type, result length |
| `voice.sent` | voice-notification | Message, voice_id, engine |
| `learning.captured` | learning-capture | Category, file path |

**Implementation:**

```typescript
interface ObservabilityEvent {
  id: string;           // UUID
  timestamp: string;    // ISO 8601
  session_id: string;
  event_type: string;
  data: Record<string, any>;
}

async function emitEvent(event: ObservabilityEvent): Promise<void> {
  try {
    await fetch('http://localhost:8889/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(1000), // Fast timeout, don't block
    });
  } catch {
    // Fail silently - observability is non-critical
  }
}
```

---

### 2. Observability Server (Bun HTTP)

**Location:** `.opencode/observability-server/server.ts`

**Port:** 8889 (configurable via `PAI_OBSERVABILITY_PORT`)

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/` | Serve Vue SPA dashboard |
| `GET` | `/api/events` | Query events (with filters) |
| `GET` | `/api/events/stream` | SSE real-time stream |
| `POST` | `/events` | Receive events from plugin |
| `GET` | `/api/stats` | Aggregated statistics |
| `GET` | `/api/sessions` | List sessions |
| `GET` | `/api/sessions/:id` | Session detail |
| `GET` | `/health` | Health check |

**Query Parameters for `/api/events`:**

| Param | Type | Description |
|-------|------|-------------|
| `type` | string | Filter by event type |
| `session_id` | string | Filter by session |
| `from` | ISO date | Start time |
| `to` | ISO date | End time |
| `limit` | number | Max results (default 100) |
| `offset` | number | Pagination offset |

---

### 3. SQLite Database

**Location:** `.opencode/observability-server/data/events.db`

**Schema:**

```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  data TEXT NOT NULL,  -- JSON
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_session ON events(session_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_timestamp ON events(timestamp);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  event_count INTEGER DEFAULT 0,
  tool_count INTEGER DEFAULT 0,
  rating_avg REAL,
  status TEXT DEFAULT 'active'  -- active, completed, error
);
```

**Retention:** 30 days (matches OpenCode's project retention)

---

### 4. Vue 3 Dashboard

**Location:** `.opencode/observability-server/dashboard/`

**Tech Stack:**
- Vue 3 (Composition API)
- Vite (build tool)
- Tailwind CSS (styling)
- Chart.js (visualizations)

**Pages:**

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `Dashboard.vue` | Overview with live stats |
| `/events` | `EventList.vue` | Searchable event list |
| `/sessions` | `SessionList.vue` | Session browser |
| `/sessions/:id` | `SessionDetail.vue` | Single session view |
| `/analytics` | `Analytics.vue` | Charts and trends |

**Dashboard Overview Cards:**

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Sessions    │ │ Tools Used  │ │ Avg Rating  │ │ Sec Blocks  │
│    42       │ │    1,234    │ │    8.2      │ │     3       │
│ today       │ │ today       │ │ this week   │ │ all time    │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Live Event Stream                                    [Pause]│
├─────────────────────────────────────────────────────────────┤
│ 14:32:05  tool.execute     Bash: git status          12ms  │
│ 14:32:04  message.user     "Check the build"               │
│ 14:32:01  session.start    ses_abc123                      │
│ ...                                                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────┐ ┌────────────────────────────────┐
│ Tool Usage (24h)         │ │ Rating Distribution            │
│ ████████████ Read (45%)  │ │     ██                         │
│ ████████ Bash (30%)      │ │    ████  ██                    │
│ ████ Edit (15%)          │ │ ██ ████ ████ ██               │
│ ██ Task (10%)            │ │ 1  2  3  4  5  6  7  8  9  10  │
└──────────────────────────┘ └────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

1. **observability-emitter.ts** handler
   - Event emission function
   - Integration into pai-unified.ts
   - All event types captured

2. **server.ts** basic server
   - POST /events endpoint
   - GET /health endpoint
   - SQLite initialization

### Phase 2: API & Storage (Week 2)

3. **SQLite schema** implementation
   - Events table
   - Sessions table
   - Indexes and retention

4. **REST API** endpoints
   - GET /api/events with filters
   - GET /api/sessions
   - GET /api/stats

### Phase 3: Real-time & Dashboard (Week 3)

5. **SSE stream** implementation
   - /api/events/stream endpoint
   - Connection management
   - Heartbeat

6. **Vue dashboard** basic views
   - Dashboard overview
   - Event list
   - Session list

### Phase 4: Polish & Release (Week 4)

7. **Analytics** page
   - Charts with Chart.js
   - Trend analysis

8. **Documentation** & testing
   - README.md
   - INSTALL instructions
   - Integration tests

---

## Configuration

**Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `PAI_OBSERVABILITY_PORT` | `8889` | Server port |
| `PAI_OBSERVABILITY_ENABLED` | `true` | Enable/disable |
| `PAI_OBSERVABILITY_RETENTION_DAYS` | `30` | Event retention |
| `PAI_OBSERVABILITY_DB_PATH` | `.opencode/observability-server/data/events.db` | Database path |

**settings.json addition:**

```json
{
  "observability": {
    "enabled": true,
    "port": 8889,
    "retentionDays": 30,
    "autoStart": false
  }
}
```

---

## File Structure

```
.opencode/
├── plugins/
│   └── handlers/
│       └── observability-emitter.ts    # NEW
├── observability-server/               # NEW
│   ├── server.ts                       # Bun HTTP server
│   ├── db.ts                           # SQLite operations
│   ├── routes/
│   │   ├── events.ts
│   │   ├── sessions.ts
│   │   └── stats.ts
│   ├── dashboard/                      # Vue 3 SPA
│   │   ├── src/
│   │   │   ├── App.vue
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   └── main.ts
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   ├── data/
│   │   └── events.db                   # SQLite database
│   ├── package.json
│   └── README.md
```

---

## Security Considerations

1. **Local only** - Server binds to `127.0.0.1`, not accessible remotely
2. **No authentication** - Runs locally, same trust model as OpenCode
3. **No sensitive data** - Events don't include file contents or secrets
4. **Graceful failure** - Plugin continues if server unavailable

---

## Open Questions

1. **Dashboard bundling** - Ship pre-built or build on install?
2. **Auto-start** - Start server automatically with OpenCode?
3. **Export formats** - JSON, CSV, what else?
4. **Retention cleanup** - Cron job or on-demand?

---

## Related Documents

- [ROADMAP.md](../ROADMAP.md) - Version roadmap
- [DEFERRED-FEATURES.md](../DEFERRED-FEATURES.md) - Feature status
- [PLUGIN-SYSTEM.md](PLUGIN-SYSTEM.md) - Plugin architecture

---

*Created: 2026-02-04*
*Author: PAI-OpenCode Team*
