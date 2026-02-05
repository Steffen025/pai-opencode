# Deferred Features

**Features from PAI 2.5 that are not yet in PAI-OpenCode, and when they're coming**

---

## Overview

PAI-OpenCode v1.2 includes **full PAI 2.5 functionality**—skills, agents, security, memory, voice, sentiment detection, and observability dashboard. Some advanced features are **deferred to future releases**.

---

## Feature Status Matrix

| Feature | PAI 2.5 Status | PAI-OpenCode v1.1 | Target Version | Priority |
|---------|----------------|-------------------|----------------|----------|
| Skills System | ✅ Stable | ✅ Included | v1.0 | P0 |
| Agent System | ✅ Stable | ✅ Included | v1.0 | P0 |
| Security Validation | ✅ Stable | ✅ Included | v1.0 | P0 |
| MEMORY System | ✅ Stable | ✅ Included | v1.0 | P0 |
| Voice Server | ✅ Stable | ✅ **Included** | v1.1 | P1 |
| Implicit Sentiment | ✅ Stable | ✅ **Included** | v1.1 | P1 |
| Observability Dashboard | ✅ Stable | ✅ **Included** | v1.2 | P2 |
| Auto-Migration | ✅ Stable | ⏳ Deferred | v1.x | P3 |
| MCP Server Adapters | ⚠️ Experimental | ⏳ Deferred | v1.x | P3 |

---

## 1. Voice Server (TTS Notifications) ✅ INCLUDED IN v1.1

**Status:** ✅ Included in v1.1
**Priority:** P1 (High)

### What It Does

The Voice Server provides **text-to-speech notifications** for:
- Task completion alerts
- Error notifications
- Session milestone announcements
- Long-running command completion

### Implementation (v1.1)

The voice server is now included in `.opencode/voice-server/`:

```bash
# Start the voice server
cd .opencode/voice-server && bun run server.ts
```

**Supported TTS Providers:**
1. **ElevenLabs** (default) - High-quality voices, requires API key
2. **Google Cloud TTS** - Alternative, requires API key
3. **macOS `say`** - Free fallback, built-in

See `.opencode/voice-server/README.md` for setup details.

---

## 2. Observability Dashboard ✅ INCLUDED IN v1.2

**Status:** ✅ Included in v1.2
**Priority:** P2 (Medium)

### What It Does

The Observability Dashboard provides **real-time monitoring** of:
- Active sessions
- Tool usage metrics
- Security events
- Learning capture
- Agent invocations

### Implementation (v1.2)

The observability server is now included in `.opencode/observability-server/`:

```bash
# Start the observability server
cd .opencode/observability-server
bun run server.ts
```

**Features:**
- **Real-time SSE streaming** at `http://localhost:8889`
- **Vue 3 Dashboard** with GitHub Dark theme
- **14 Event Types** captured across all plugin hooks
- **SQLite persistence** with 30-day retention
- **REST API** for querying events, sessions, and statistics

See `.opencode/observability-server/README.md` for full documentation.

---

## 3. Auto-Migration

**Status:** Deferred to v1.x
**Priority:** P3 (Low)

### What It Does

Auto-Migration provides **automatic updates** from Claude Code PAI:
- Detects new PAI 2.x releases
- Pulls upstream changes
- Applies to OpenCode installation
- Preserves USER customizations

### Why Deferred

- Need stable v1.1 baseline first
- Upstream detection requires GitHub API
- Migration strategies need per-component logic

### Workaround (v1.1)

Manual migration using converter:
```bash
bun Tools/pai-to-opencode-converter.ts \
  --source vendor/PAI/Releases/v2.x \
  --target .opencode \
  --mode selective
```

---

## 4. MCP Server Adapters

**Status:** Deferred to v1.x
**Priority:** P3 (Low)

### What It Does

MCP Server Adapters provide **external tool integration**:
- **deepwiki-enhanced**: GitHub repo Q&A via Devin API
- **Community MCP servers**: Various integrations from the MCP ecosystem

### Why Deferred

- OpenCode MCP server support needs testing
- MCP protocol compatibility unknown
- Authentication needs secure handling

### Workaround (v1.1)

Use external tools directly or via web interfaces.

---

## Roadmap Summary

### v1.0 - Foundation

**Included:**
- ✅ Skills System (29 skills)
- ✅ Agent System (16 agents, PascalCase)
- ✅ Security Validation (pattern-based)
- ✅ MEMORY System (work, learning, state)
- ✅ Unified Plugin (8 handlers)
- ✅ Converter Tool (Claude Code → OpenCode)
- ✅ Installation Wizard (PAIOpenCodeWizard.ts)

---

### v1.2 (Current) - Observability Dashboard

**Released:** February 2026

**Included:**
- ✅ Observability Server (Bun HTTP + SQLite)
- ✅ Vue 3 Dashboard (real-time SSE stream)
- ✅ 14 Event Types (session, tool, agent, voice, learning)
- ✅ REST API (events, sessions, statistics)
- ✅ 14 Plugin Handlers (up from 13)

**Deferred:**
- ⏳ Auto-Migration
- ⏳ MCP Server Adapters

---

### v1.1 - Voice, Sentiment & Full Algorithm

**Released:** February 2026

**Included:**
- ✅ Voice Server (ElevenLabs, Google TTS, macOS say)
- ✅ Implicit Sentiment Detection (AI-powered)
- ✅ Full PAI 2.5 Algorithm (v0.2.25)
- ✅ 13 Plugin Handlers (up from 8)
- ✅ Tab State Management (Kitty terminal)
- ✅ ISC Tracking & Response Capture

---

### v1.x - Advanced Features

**Target:** TBD

- Auto-migration from upstream PAI
- MCP server adapters
- Cross-platform support (Windows, Linux)

---

## Contributing

Want to help implement deferred features?

1. **Check GitHub Issues** for feature discussions
2. **Read technical docs** for architecture details
3. **Start with tests** - verify OpenCode compatibility first
4. **Submit PRs** with tests and documentation

**Priority order:**
1. Observability (v1.2) - High value, moderate complexity
2. Auto-Migration (v1.x) - Complex, needs stable baseline
3. MCP Adapters (v1.x) - Experimental

---

## Next Steps

- **PLUGIN-SYSTEM.md** - How OpenCode plugins work
- **PAI-ADAPTATIONS.md** - What we changed from PAI 2.5
- **MIGRATION.md** - Migrating from Claude Code PAI

---

**PAI-OpenCode v1.1** - Full PAI 2.5 on OpenCode
