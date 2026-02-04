# Changelog

All notable changes to PAI-OpenCode are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-02-05

### Major Feature: Real-Time Observability Dashboard

This release introduces a complete monitoring infrastructure for PAI-OpenCode with real-time event streaming, SQLite persistence, and a Vue 3 dashboard.

### Added

#### Observability Server
- **Bun HTTP Server** on port 8889 with REST API and SSE streaming
- **SQLite Database** for event persistence with 30-day retention
- **14 Event Types** captured across all plugin hooks
- **Real-time SSE Stream** at `/api/events/stream`

#### API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check with server stats |
| `/events` | POST | Event ingestion from plugins |
| `/api/events` | GET | Query events with filters |
| `/api/events/stream` | GET | SSE real-time stream |
| `/api/sessions` | GET | Query sessions |
| `/api/stats` | GET | Aggregated statistics |

#### Vue 3 Dashboard
- **Dashboard Page**: Real-time stats cards + live event stream
- **Events Page**: Searchable/filterable event browser with pagination
- **Sessions Page**: Session list with expandable event details
- **GitHub Dark Theme**: Professional #0d1117 color scheme
- **SSE Connection**: Live updates with pause/resume and reconnect

#### New Handler
| Handler | Purpose |
|---------|---------|
| `observability-emitter.ts` | Fire-and-forget event emission to observability server |

#### Event Types Captured
- Session lifecycle: `session.start`, `session.end`
- Tool execution: `tool.execute`, `tool.blocked`
- Security: `security.block`, `security.warn`
- Messages: `message.user`, `message.assistant`
- Ratings: `rating.explicit`, `rating.implicit`
- Agents: `agent.spawn`, `agent.complete`
- Voice: `voice.sent`
- Learning: `learning.captured`
- Validation: `isc.validated`, `context.loaded`

### Technical Details
- **Server Stack**: Bun HTTP + SQLite (bun:sqlite)
- **Dashboard Stack**: Vue 3.4 + Vite 5 + Tailwind CSS 3.4 + TypeScript
- **Plugin Integration**: 82 new lines in `pai-unified.ts`
- **Event Emission**: 1s timeout, fail silently (non-blocking)

### File Structure
```
.opencode/observability-server/
├── server.ts          # HTTP server (:8889)
├── db.ts              # SQLite operations
├── README.md          # Documentation
└── dashboard/         # Vue 3 SPA
    ├── src/components/  # StatsCards, EventStream, EventList, SessionList
    ├── src/pages/       # Dashboard, Events, Sessions
    └── [config]         # Vite, Tailwind, TypeScript
```

---

## [1.1.0] - 2026-02-02

### Major Upgrade: PAI 2.5 + Voice/Sentiment Handlers

This release brings full PAI 2.5 Algorithm compatibility and adds 5 new handlers for voice notifications, sentiment detection, and observability.

### Added

#### PAI 2.5 Algorithm Core
- **Full 7-phase Algorithm** (v0.2.25): OBSERVE, THINK, PLAN, BUILD, EXECUTE, VERIFY, LEARN
- **ISC Validator** with TaskCreate/TaskList for verifiable criteria
- **Capability Selection** with Thinking Tools Assessment in THINK phase
- **Two-Pass capability selection**: Hook hints (Pass 1) + THINK validation (Pass 2)
- **Parallel-by-default execution**: Independent tasks run concurrently
- **Justify-exclusion principle**: Thinking tools are opt-OUT, not opt-IN

#### New Handlers (v1.1)
| Handler | Purpose |
|---------|---------|
| `voice-notification.ts` | TTS via ElevenLabs Voice Server, Google Cloud TTS, or macOS `say` fallback |
| `implicit-sentiment.ts` | Automatic satisfaction detection from natural language (uses Haiku inference) |
| `tab-state.ts` | Updates Kitty terminal tab title and color based on task context |
| `update-counts.ts` | Counts skills, workflows, plugins, signals at session end |
| `response-capture.ts` | ISC extraction, satisfaction tracking, learning capture |

#### Support Libraries
- `lib/time.ts` - ISO timestamps, PST timestamps, year-month formatting

### Changed
- Upgraded from PAI 2.4 to PAI 2.5 Algorithm
- Plugin system now has 13 handlers (up from 8)
- Enhanced SKILL.md with full Algorithm v0.2.25 documentation

### Technical Details
- Build: 21 modules, 85.77 KB total
- All handlers integrated in `pai-unified.ts`
- Graceful fallbacks: Voice handlers fail silently if services unavailable

---

## [1.0.1] - 2026-02-01

### Fixed
- Anthropic Max Subscription API blocking workaround
- ISCValidator integration improvements

---

## [1.0.0] - 2026-01-24

### Initial Release: Core PAI on OpenCode

**The complete port of Daniel Miessler's PAI to OpenCode.**

### Added

#### Core Systems
- **Skills System**: 29 skills (CORE, Algorithm, Fabric, Research, Art, etc.)
- **Agent System**: 14 agents with PascalCase naming
- **Memory System**: Projects, sessions, learning loops
- **Plugin System**: Security validator, context loader

#### Plugin Handlers (v1.0)
| Handler | Purpose |
|---------|---------|
| `context-loader.ts` | Loads CORE context at session start |
| `security-validator.ts` | Blocks dangerous commands |
| `rating-capture.ts` | Captures user ratings (1-10) |
| `isc-validator.ts` | Validates ISC criteria |
| `learning-capture.ts` | Saves learnings to MEMORY |
| `work-tracker.ts` | Tracks work sessions |
| `skill-restore.ts` | Restores skill context |
| `agent-capture.ts` | Captures agent outputs |

#### Installation
- `PAIOpenCodeWizard.ts` - Interactive setup wizard
- 8 AI providers supported (Anthropic, OpenAI, Google, Groq, AWS Bedrock, Azure, ZEN, Ollama)
- TELOS personalization framework

#### Documentation
- 7 Architecture Decision Records (ADRs)
- Complete migration guide from Claude Code PAI
- Plugin development documentation

### Architecture Decisions
| ADR | Decision |
|-----|----------|
| ADR-001 | Hooks → Plugins architecture |
| ADR-002 | `.claude/` → `.opencode/` directory |
| ADR-003 | Skills system unchanged |
| ADR-004 | File-based plugin logging |
| ADR-005 | Dual config files approach |
| ADR-006 | Security patterns preserved |
| ADR-007 | Memory structure preserved |

---

## Version Comparison

| Feature | v1.0.0 | v1.1.0 |
|---------|--------|--------|
| PAI Version | 2.4 | **2.5** |
| Algorithm | Basic | **Full 7-phase v0.2.25** |
| Handlers | 8 | **13** |
| Voice Notifications | No | **Yes** |
| Sentiment Detection | No | **Yes** |
| Tab State | No | **Yes** |
| ISC Tracking | Basic | **Full with TaskCreate** |
| Thinking Tools | No | **Yes (Council, RedTeam, etc.)** |

---

## Upgrade Path

### From v1.0.x to v1.1.0

```bash
git fetch origin
git checkout main
git pull origin main
```

All new handlers are automatically available. No configuration changes needed.

### Voice Server Setup (Optional)

To enable voice notifications:

1. Start the included voice server:
   ```bash
   cd .opencode/voice-server && bun run server.ts
   ```
2. Configure TTS provider in `.opencode/.env`:
   - ElevenLabs: `ELEVENLABS_API_KEY=your_key`
   - Google Cloud TTS: `GOOGLE_API_KEY=your_key`
3. Fallback: macOS `say` command works automatically

See `.opencode/voice-server/README.md` for full documentation.

---

**Links:**
- [PAI 2.5 Upstream](https://github.com/danielmiessler/Personal_AI_Infrastructure)
- [OpenCode](https://github.com/anomalyco/opencode)
- [ROADMAP.md](ROADMAP.md)
