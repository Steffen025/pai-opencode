# PAI-OpenCode Roadmap

This roadmap outlines the development path from v1.0 to v2.0 and beyond.

![Roadmap Timeline](docs/images/roadmap-timeline.png)

## Current Release

### v1.1.0 - PAI 2.5 + Voice/Sentiment Handlers (February 2026)

**Status:** ✅ Released

**Major Upgrade:** Full PAI 2.5 Algorithm + 5 new handlers

**What's New in v1.1:**
- **PAI 2.5 Algorithm** (v0.2.25) - Full 7-phase format with ISC tracking
- **Voice Notification Handler** - ElevenLabs + Google TTS + macOS say fallback
- **Implicit Sentiment Handler** - Automatic satisfaction detection from user messages
- **Tab State Handler** - Kitty terminal tab title/color updates
- **Update Counts Handler** - Skill/workflow counting at session end
- **Response Capture Handler** - ISC extraction and learning capture

**Technical Details:**
- 13 handlers total (up from 8 in v1.0)
- Build: 21 modules, 85.77 KB
- Graceful fallbacks for all optional features

**Documentation:**
- [CHANGELOG.md](CHANGELOG.md) - Full release notes
- [README.md](README.md) - Updated for v1.1

---

### v1.0.0 - Core PAI on OpenCode (January 2026)

**Status:** ✅ Released

**What's Included:**
- Skills system with 29 skills (CORE, Algorithm, Fabric, Research, etc.)
- Plugin system (security validator, context loader)
- Memory system (projects, sessions, learning)
- Agent system (14 agents, PascalCase naming)
- Skill search and indexing tools
- Full TypeScript tooling with Bun runtime

**Documentation:**
- [README.md](README.md) - Project overview
- [INSTALL.md](INSTALL.md) - Installation guide
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines

---

## Upcoming Releases

---

### v1.2.0 - Observability Dashboard (Q2 2026)

**Goal:** Visual monitoring of PAI activity

**Features:**
- Real-time event stream visualization
- Skill usage analytics
- Plugin execution timeline
- Session history browser
- Export capabilities (JSON, CSV)

**Technical Stack:**
- Vue 3 frontend
- Bun HTTP server backend
- SQLite for event storage
- Server-Sent Events (SSE) for real-time updates

![Dashboard Mockup](docs/images/dashboard-mockup.png)

---

### v1.3.0 - Enhanced Setup & Health Monitoring (Q2 2026)

**Goal:** Advanced setup options and system health

**Features:**
- ✅ Basic Installation Wizard (shipped in v1.0)
- Skill selection UI (enable/disable individual skills)
- System health checks and diagnostics
- Configuration validation
- Migration assistant from Claude Code PAI (interactive)

---

## Future Vision

### v2.0.0 - Full PAI Parity & Auto-Migration (Q3 2026)

**Goal:** Complete feature parity with PAI 2.4 + seamless migration

**Major Features:**

1. **Auto-Migration System**
   - One-command migration from PAI 2.4
   - Skill mapping and compatibility layer
   - Memory import (sessions, projects, learning)

2. **Advanced Skill Orchestration**
   - Skill dependencies and auto-loading
   - Parallel skill execution
   - Community skill marketplace

3. **Enhanced Security**
   - Sandboxed skill execution
   - Granular permission system
   - Audit logging

4. **MCP Server Adapters**
   - deepwiki-enhanced (GitHub repo Q&A via Devin API)
   - Community MCP server integrations

![v2.0 Architecture](docs/images/v2-architecture.png)

---

## How to Influence the Roadmap

We value community input! Here's how to shape PAI-OpenCode's future:

1. **Vote on Features**: Comment on [roadmap issues](https://github.com/Steffen025/pai-opencode/labels/roadmap)
2. **Propose Ideas**: Open a [discussion](https://github.com/Steffen025/pai-opencode/discussions)
3. **Contribute Code**: Tackle items from the roadmap ([CONTRIBUTING.md](CONTRIBUTING.md))
4. **Share Use Cases**: Tell us how you use PAI-OpenCode

---

## Version History

| Version | Release Date | Highlights |
|---------|-------------|------------|
| v1.1.0  | February 2026 | PAI 2.5 upgrade + Voice/Sentiment handlers |
| v1.0.1  | February 2026 | Anthropic API fix, ISCValidator improvements |
| v1.0.0  | January 2026 | Initial release - core PAI on OpenCode |

---

**Stay Updated:**
- Watch this repo for releases
- Follow [Discussions](https://github.com/Steffen025/pai-opencode/discussions) for announcements
