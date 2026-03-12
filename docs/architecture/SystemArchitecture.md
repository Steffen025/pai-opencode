# PAI-OpenCode System Architecture

> **Authoritative source for Algorithm self-awareness (ADR-017 / WP-N6)**
> Last updated: 2026-03-12

---

## Directory Layout

```text
pai-opencode/
├── .opencode/
│   ├── plugins/                  ← Plugin system (loaded by opencode at startup)
│   │   ├── pai-unified.ts        ← Single plugin entry point — all hooks registered here
│   │   ├── handlers/             ← Modular handler implementations
│   │   │   ├── session-registry.ts      (WP-N1) Custom tools: session_registry, session_results
│   │   │   ├── compaction-intelligence.ts (WP-N2) Context injection during compaction
│   │   │   ├── agent-capture.ts         Agent output capture
│   │   │   ├── algorithm-tracker.ts     Algorithm phase tracking
│   │   │   ├── format-reminder.ts       Response format enforcement
│   │   │   ├── implicit-sentiment.ts    Implicit rating detection
│   │   │   ├── integrity-check.ts       Session integrity validation
│   │   │   ├── isc-validator.ts         Ideal State Criteria validation
│   │   │   ├── learning-capture.ts      Learning phase capture
│   │   │   ├── observability-emitter.ts Metrics emission
│   │   │   ├── prd-sync.ts              PRD file synchronization
│   │   │   ├── question-tracking.ts     User question tracking
│   │   │   ├── rating-capture.ts        Rating extraction
│   │   │   ├── relationship-memory.ts   Relational context
│   │   │   ├── response-capture.ts      Full response capture
│   │   │   ├── security-validator.ts    Security threat detection
│   │   │   ├── session-cleanup.ts       Session lifecycle cleanup
│   │   │   ├── skill-guard.ts           Skill execution gating
│   │   │   ├── skill-restore.ts         Skill restoration after compaction
│   │   │   ├── tab-state.ts             Multi-tab state management
│   │   │   ├── update-counts.ts         Token/update counters
│   │   │   ├── voice-notification.ts    Voice alert delivery
│   │   │   ├── work-tracker.ts          Active work tracking
│   │   │   ├── adapters/                Low-level OpenCode API adapters
│   │   │   └── lib/                     Shared handler utilities
│   │   ├── agent-execution-guard.ts     Agent execution safety wrapper
│   │   ├── check-version.ts             Version check utility
│   │   └── last-response-cache.ts       Response caching
│   └── skills/                   ← Skill library (on-demand loading)
│       ├── skill-index.json      ← Skill registry — USE WHEN triggers for capability audit
│       ├── PAI/SKILL.md          ← PAI Algorithm core skill
│       ├── OpenCodeSystem/       ← System self-awareness (WP-N6)
│       ├── Agents/               ← Agent composition skills
│       ├── Research/             ← Research skills
│       └── [40+ other skills]
├── docs/
│   ├── architecture/
│   │   ├── adr/                  ← Architecture Decision Records
│   │   ├── SystemArchitecture.md ← THIS FILE
│   │   ├── ToolReference.md      ← All tools catalog
│   │   ├── Configuration.md      ← opencode.json + settings.json
│   │   └── Troubleshooting.md    ← Self-diagnostic checklist
│   └── epic/                     ← Project planning documents
│       ├── TODO-v3.0.md
│       ├── OPTIMIZED-PR-PLAN.md
│       └── EPIC-v3.0-OpenCode-Native.md
├── PAI-Install/                  ← Installer system
├── opencode.json                 ← OpenCode configuration (model routing, permissions, agents)
└── AGENTS.md                     ← Algorithm operating instructions
```

---

## Plugin System

PAI-OpenCode uses a **single unified plugin** (`pai-unified.ts`) that registers all handlers. OpenCode loads this at startup and the plugin wires up all event hooks.

### Event Hooks Registered

| Hook | When | Primary Handlers |
|------|------|-----------------|
| `session.created` | New session starts | Algorithm tracker, tab-state, integrity check |
| `session.compacted` | Context compaction completes | Learning rescue, skill-restore |
| `experimental.session.compacting` | Compaction in progress (WP-N2) | `compaction-intelligence` — injects context summary |
| `permission.ask` | Tool permission requested | `security-validator` — blocks dangerous operations |
| `tool.execute.before` | Before any tool runs | Security check, work tracker update |
| `tool.execute.after` | After any tool runs | Response capture, agent output capture |
| `message.completed` | AI response finished | Format reminder, rating capture, PRD sync |

### Custom Tools (WP-N1)

Two custom tools registered via `tool:` config in `pai-unified.ts`:

| Tool | Purpose | When to Call |
|------|---------|--------------|
| `session_registry` | Lists recent sessions with summaries | Post-compaction CONTEXT RECOVERY |
| `session_results` | Gets detailed results for a specific session ID | When session_registry returns relevant session |

**Note:** These are native OpenCode custom tools (not MCP), registered directly in the plugin's `tool:` object.

---

## Algorithm Flow

```text
User Input
    │
    ▼
AGENTS.md (runtime instructions loaded at session start)
    │
    ▼
PAI Algorithm 7 phases: OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN
    │
    ├── OBSERVE: ISC creation, voice curl, capability audit (reads skill-index.json)
    ├── THINK:   Pressure test ISC
    ├── PLAN:    PRD creation, execution strategy
    ├── BUILD:   Artifact creation
    ├── EXECUTE: Run artifacts
    ├── VERIFY:  Check each ISC criterion
    └── LEARN:   Reflections, PRD update
```

### Session Persistence

- **Active session:** Work tracked in OpenCode's native session store
- **Post-compaction:** `session_registry` tool provides access to prior session summaries
- **PRD files:** `~/.opencode/MEMORY/WORK/{session-slug}/PRD-*.md` — persistent ISC storage

---

## Memory Layout

```text
~/.opencode/
├── MEMORY/
│   ├── WORK/           ← PRD files, session handoffs
│   ├── STATE/          ← Runtime state
│   └── LEARNING/       ← Algorithm reflections JSONL
└── skills/             ← User-level skills (if separate from project)
```

**Project skills** (in repo) take precedence over user-level skills when both exist.

---

## Key Architectural Decisions

| ADR | Decision |
|-----|----------|
| ADR-001 | Hooks → Plugin architecture (Claude Code hooks → OpenCode plugin) |
| ADR-005 | Dual-file config: `opencode.json` (model/agents) + `settings.json` (PAI behavior) |
| ADR-012 | `session_registry` + `session_results` as native custom tools |
| ADR-013 | SKILL.md CONTEXT RECOVERY uses custom tools for post-compaction awareness |
| ADR-015 | Compaction intelligence via `experimental.session.compacting` hook |
| ADR-017 | System self-awareness skill + reference docs (this WP) |

Full ADR index: `docs/architecture/adr/README.md`
