# Plugin System

**Event-Driven Automation Infrastructure for OpenCode**

**Location:** `~/.opencode/plugins/`
**Configuration:** `~/.opencode/opencode.json`
**Status:** Active — All plugins running in production
**Version:** v3.0 (27 handlers, 9 libraries)

---

## Overview

The PAI plugin system is an event-driven automation infrastructure built on OpenCode's native plugin API. A single unified plugin (`pai-unified.ts`) routes all events to specialized handler modules across two layers:

**Layer 1 — Hooks (active, can block/modify):**
- Context injection (bootstrap loading)
- Security validation (block dangerous commands)
- Permission override (deny/allow decisions)
- Work tracking (session management)
- Tool lifecycle (pre/post processing)
- Shell environment injection
- Compaction intelligence (context preservation)

**Layer 2 — Event Bus (passive, observe-only):**
- Session lifecycle (created, ended, error, compacted, updated)
- Message processing (ISC validation, voice, ratings, sentiment)
- Permission audit logging
- Command tracking

**Key Principle:** Plugins run asynchronously and fail gracefully. They enhance the user experience but never block OpenCode's core functionality. All logging uses `file-logger.ts` — NEVER `console.log` (corrupts TUI).

---

## Claude Code → OpenCode Hook Mapping

PAI-OpenCode translates Claude Code hook concepts to OpenCode plugin hooks:

| PAI Hook (Claude Code) | OpenCode Plugin Hook | Mechanism |
|------------------------|---------------------|-------------|
| SessionStart | `experimental.chat.system.transform` | `output.system.push()` |
| PreToolUse | `tool.execute.before` | `throw Error()` to block |
| PreToolUse (blocking) | `permission.ask` | `output.status = "deny"` |
| PostToolUse | `tool.execute.after` | Read-only observation |
| UserPromptSubmit | `chat.message` | Filter `role === "user"` |
| Stop | `event` | Filter `session.ended` |
| SubagentStop | `tool.execute.after` | Filter `tool === "Task"` |
| — (new in OpenCode) | `experimental.session.compacting` | Context injection during compaction |
| — (new in OpenCode) | `shell.env` | Environment variable injection |
| — (new in OpenCode) | `tool` (custom tools) | Register `session_registry`, `session_results`, `code_review` |

**Reference Implementation:** `plugins/pai-unified.ts`
**Type Definitions:** `plugins/adapters/types.ts` (includes `PAI_TO_OPENCODE_HOOKS` mapping)

---

## Available Plugin Hooks (9 Active)

### 1. `experimental.chat.system.transform` (SessionStart)

**When:** At the start of each chat/session
**Purpose:** Inject minimal bootstrap context (~15KB) into the conversation

Loads `MINIMAL_BOOTSTRAP.md` (core Algorithm + Steering Rules), System `AISTEERINGRULES.md`, and User identity files (ABOUTME, TELOS, DAIDENTITY). Skills load on-demand via OpenCode's native skill tool — no full 233KB context dump.

**Emits:** `session.start`, `context.loaded`

---

### 2. `permission.ask` (Security Blocking)

**When:** When OpenCode asks for permission on a tool
**Purpose:** Override permission decisions — deny dangerous, confirm risky

**Handler:** `security-validator.ts`
**Actions:** `block` → `output.status = "deny"` | `confirm` → `output.status = "ask"` | `allow` → no change

**Note:** Not reliably called for all tools, so security validation also runs in `tool.execute.before`.

**Emits:** `security.block`, `security.warn`

---

### 3. `tool.execute.before` (PreToolUse)

**When:** Before every tool execution
**Purpose:** Security validation + agent execution guard + skill guard

**Handlers:**
- `security-validator.ts` — Validates Bash commands against dangerous/warning patterns. **Throws error to block.**
- `agent-execution-guard.ts` — Warns when agents spawn without proper capability selection (non-blocking)
- `skill-guard.ts` — Validates skill invocations match USE WHEN triggers (non-blocking)

**Emits:** `security.block`, `security.warn`

---

### 4. `tool.execute.after` (PostToolUse)

**When:** After tool execution completes
**Purpose:** Capture outputs, track state, sync PRDs, track questions

**Handlers:**
- `agent-capture.ts` — Captures subagent (Task tool) outputs to `MEMORY/RESEARCH/`
- `algorithm-tracker.ts` — Tracks Algorithm phase, validates transitions, tracks ISC criteria and agent spawns
- `prd-sync.ts` — When a PRD.md is written/edited, syncs frontmatter to `work-registry.json` for dashboard
- `question-tracking.ts` — Records AskUserQuestion Q&A pairs to `MEMORY/STATE/questions.jsonl`
- `session-registry.ts` — Captures subagent session IDs to registry for compaction recovery

**Emits:** `tool.execute`, `agent.complete`

---

### 5. `chat.message` (UserPromptSubmit)

**When:** When user submits a message
**Purpose:** Work session creation, rating capture, effort level detection

**Handlers:**
- `work-tracker.ts` — Creates work sessions in `MEMORY/WORK/` on first non-trivial user message, appends to thread
- `rating-capture.ts` — Detects explicit ratings (1-10) and persists to `MEMORY/LEARNING/SIGNALS/ratings.jsonl`
- `format-reminder.ts` — Detects effort level from user prompts using 8-tier system (Instant→Loop)

**Features:**
- Message deduplication cache (5s TTL) prevents double-processing between `chat.message` and `message.updated`
- Trivial message detection (greetings, ratings, acknowledgments) skips work session creation
- Session-scoped message buffers for relationship memory analysis

**Emits:** `user.message`

---

### 6. `event` (Session Lifecycle + Message Processing)

**When:** All session lifecycle events and message updates
**Purpose:** Orchestrates 15+ handlers across session start, end, and message processing

#### Session Start (`session.created`)
- `skill-restore.ts` — Restores SKILL.md files modified by OpenCode's normalization
- `check-version.ts` — Checks for PAI-OpenCode updates via GitHub releases

#### Session End (`session.ended` / `session.idle`)
- `learning-capture.ts` — Extracts learnings from work session, bridges `MEMORY/WORK/` to `MEMORY/LEARNING/`
- `integrity-check.ts` — Validates system health (required files, configs, MEMORY dirs, plugins)
- `work-tracker.ts` — Completes work session
- `update-counts.ts` — Updates `settings.json` with fresh system counts for banner/statusline
- `session-cleanup.ts` — Marks work directory COMPLETED, clears `current-work.json`, cleans `session-names.json`
- `relationship-memory.ts` — Analyzes session messages to extract relationship notes (W/B/O types) to `MEMORY/RELATIONSHIP/`

#### Assistant Messages (`message.updated`, role=assistant)
- `isc-validator.ts` — Validates Algorithm format, counts ISC criteria, warns on missing elements
- `voice-notification.ts` — Extracts 🗣️ voice line, sends to TTS service (ElevenLabs or Google Cloud)
- `tab-state.ts` — Updates Kitty terminal tab title with 3-5 word completion summary
- `response-capture.ts` — Captures responses for work tracking, extracts ISC to `ISC.json`
- `last-response-cache.ts` — Caches last assistant response to `MEMORY/STATE/` for implicit sentiment context

#### User Messages (`message.updated`, role=user)
- `rating-capture.ts` — Explicit rating detection (backup path via event bus)
- `implicit-sentiment.ts` — AI-powered sentiment analysis (1-10 scale) when no explicit rating given
- `work-tracker.ts` — Auto-work creation (backup path via event bus)

#### Session Compacted (`session.compacted`)
- `learning-capture.ts` — Rescues learnings after compaction (POST-compaction, complementary to PRE-compaction hook)

#### Other Events
- `session.error` — Error diagnostics logging
- `session.updated` — Session title tracking
- `permission.asked` — Full permission audit log
- `command.executed` — `/command` usage tracking
- `installation.update.available` — Native OpenCode update notification

**Emits:** `session.start`, `session.end`, `assistant.message`, `explicit.rating`, `implicit.sentiment`, `isc.validated`, `voice.sent`, `learning.captured`

---

### 7. `experimental.session.compacting` (Compaction Intelligence)

**When:** During LLM summary generation for context compaction
**Purpose:** Inject PAI-critical context so the compaction summary preserves it

**Handler:** `compaction-intelligence.ts` — Reads active PRD status, subagent registry, and ISC criteria, then appends to `output.context` so the LLM includes them in the compaction summary.

**Complements:** `session.compacted` event (post-compaction learning rescue). Both are needed: one influences WHAT the LLM summarizes, the other rescues data AFTER compaction.

---

### 8. `tool` (Custom Tools)

**When:** Always available — registers custom tools for the AI to call
**Purpose:** Provide session recovery and code review tools

**Tools registered:**
- `session_registry` — Lists all subagent sessions with metadata for the current session (compaction recovery)
- `session_results` — Gets registry metadata for a specific subagent + resume instructions
- `code_review` — Runs roborev for AI-powered code review (dirty, last-commit, fix, refine modes)

**Handlers:** `session-registry.ts`, `roborev-trigger.ts`

---

### 9. `shell.env` (Shell Environment Injection)

**When:** Before every Bash tool call
**Purpose:** Inject PAI runtime context into stateless shell processes

OpenCode Bash is **stateless** — every call spawns a fresh process. This hook injects:
- `PAI_CONTEXT=1`, `PAI_SESSION_ID`, `PAI_WORK_DIR`, `PAI_VERSION`
- Explicit passthrough of keys: `PAI_OBSERVABILITY_PORT`, `GOOGLE_API_KEY`, `TTS_PROVIDER`, `DA`, `TIME_ZONE`

**Two-layer system:** Layer 1 (`.opencode/.env` loaded by Bun) handles API keys in TypeScript. Layer 2 (this hook) handles Bash child processes needing runtime context.

---

## Handler Reference (27 Handlers)

| Handler | Hook | Purpose |
|---------|------|---------|
| `agent-capture.ts` | tool.execute.after | Captures subagent outputs to MEMORY/RESEARCH/ |
| `agent-execution-guard.ts` | tool.execute.before | Validates agent spawning patterns (non-blocking) |
| `algorithm-tracker.ts` | tool.execute.after | Tracks Algorithm phase, ISC criteria, agent spawns |
| `check-version.ts` | event (session.created) | Checks for PAI-OpenCode updates via GitHub |
| `compaction-intelligence.ts` | experimental.session.compacting | Injects PRD/ISC/registry into compaction summary |
| `format-reminder.ts` | chat.message | Detects effort level (8-tier: Instant→Loop) |
| `implicit-sentiment.ts` | event (message.updated) | AI sentiment analysis on user messages (1-10) |
| `integrity-check.ts` | event (session.ended) | System health validation (files, configs, MEMORY) |
| `isc-validator.ts` | event (message.updated) | Validates Algorithm format, counts ISC criteria |
| `last-response-cache.ts` | event (message.updated) | Caches last response for sentiment context |
| `learning-capture.ts` | event (session.ended, compacted) | Extracts learnings, bridges WORK→LEARNING |
| `observability-emitter.ts` | (all hooks) | Fire-and-forget event emission to observability server |
| `prd-sync.ts` | tool.execute.after | Syncs PRD frontmatter to work-registry.json |
| `question-tracking.ts` | tool.execute.after | Records AskUserQuestion Q&A pairs |
| `rating-capture.ts` | chat.message, event | Detects explicit ratings (1-10) |
| `relationship-memory.ts` | event (session.ended) | Extracts relationship notes (W/B/O types) |
| `response-capture.ts` | event (message.updated) | Captures responses, extracts ISC to ISC.json |
| `roborev-trigger.ts` | tool (custom) | AI code review via roborev CLI |
| `security-validator.ts` | permission.ask, tool.execute.before | Pattern-based security validation (block/confirm/allow) |
| `session-cleanup.ts` | event (session.ended) | Marks COMPLETED, clears state, cleans session-names |
| `session-registry.ts` | tool (custom), tool.execute.after | Tracks subagent sessions for compaction recovery |
| `skill-guard.ts` | tool.execute.before | Validates skill invocations match triggers |
| `skill-restore.ts` | event (session.created) | Restores SKILL.md files modified by OpenCode |
| `tab-state.ts` | event (message.updated) | Updates Kitty terminal tab title/color |
| `update-counts.ts` | event (session.ended) | Refreshes settings.json system counts |
| `voice-notification.ts` | event (message.updated) | Sends 🗣️ voice line to TTS service |
| `work-tracker.ts` | chat.message, event | Creates/manages work sessions in MEMORY/WORK/ |

---

## Library Reference (8 Libraries)

| Library | Purpose |
|---------|---------|
| `file-logger.ts` | TUI-safe file logging — NEVER use `console.log` in plugins |
| `paths.ts` | Canonical path construction for MEMORY, WORK, LEARNING directories |
| `identity.ts` | Central identity loader (DA name, Principal name from settings.json) |
| `time.ts` | Consistent timestamp formatting (ISO, PST/PDT) |
| `sanitizer.ts` | Input normalization before security pattern matching (base64 decode, Unicode, spacing) |
| `injection-patterns.ts` | Comprehensive prompt injection pattern library (7 categories) |
| `learning-utils.ts` | Learning categorization (SYSTEM vs ALGORITHM) shared across handlers |
| `model-config.ts` | PAI model configuration schema and ZEN provider definitions |
| `db-utils.ts` | Database health checks, size monitoring, session archiving |

---

## Plugin Architecture

```text
plugins/
├── pai-unified.ts              # Main plugin — routes all 9 hooks to handlers
├── handlers/                   # 27 specialized handler modules
│   ├── agent-capture.ts        # Subagent output capture
│   ├── agent-execution-guard.ts # Agent spawning validation
│   ├── algorithm-tracker.ts    # Algorithm phase tracking
│   ├── check-version.ts        # Update checking
│   ├── compaction-intelligence.ts # Compaction context injection
│   ├── format-reminder.ts      # Effort level detection
│   ├── implicit-sentiment.ts   # AI sentiment analysis
│   ├── integrity-check.ts      # System health checks
│   ├── isc-validator.ts        # ISC format validation
│   ├── last-response-cache.ts  # Response caching for sentiment
│   ├── learning-capture.ts     # Learning extraction
│   ├── observability-emitter.ts # Event emission (fire-and-forget)
│   ├── prd-sync.ts             # PRD frontmatter sync
│   ├── question-tracking.ts    # Q&A pair tracking
│   ├── rating-capture.ts       # Explicit rating detection
│   ├── relationship-memory.ts  # Session relationship notes
│   ├── response-capture.ts     # Response capture + ISC extraction
│   ├── roborev-trigger.ts      # AI code review tool
│   ├── security-validator.ts   # Security pattern matching
│   ├── session-cleanup.ts      # Session finalization
│   ├── session-registry.ts     # Subagent session tracking
│   ├── skill-guard.ts          # Skill invocation validation
│   ├── skill-restore.ts        # SKILL.md git restore
│   ├── tab-state.ts            # Terminal tab management
│   ├── update-counts.ts        # Settings.json count refresh
│   ├── voice-notification.ts   # TTS voice output
│   └── work-tracker.ts         # Work session management
├── adapters/
│   └── types.ts                # Shared types + PAI_TO_OPENCODE_HOOKS mapping
└── lib/                        # 9 shared libraries
    ├── db-utils.ts             # Database health
    ├── file-logger.ts          # TUI-safe logging
    ├── identity.ts             # DA/Principal identity
    ├── injection-patterns.ts   # Security patterns (7 categories)
    ├── learning-utils.ts       # Learning categorization
    ├── model-config.ts         # Model/provider config
    ├── paths.ts                # Path utilities
    ├── sanitizer.ts            # Input normalization
    └── time.ts                 # Timestamp formatting
```

**Key Design Decisions:**

1. **Single Plugin File** — `pai-unified.ts` exports all hooks from one plugin (OpenCode auto-discovers it)
2. **Handler Separation** — Complex logic in `handlers/` for maintainability and testability
3. **File Logging** — Never use `console.log` (corrupts OpenCode TUI), use `file-logger.ts`
4. **Fail-Open Security** — On handler error, don't block (avoid hanging OpenCode)
5. **Message Deduplication** — 5s cache prevents double-processing between `chat.message` and `message.updated`
6. **Session-Scoped Buffers** — Message buffers keyed by sessionId prevent cross-session contamination
7. **Two-Layer Compaction** — `experimental.session.compacting` (PRE) + `session.compacted` event (POST)

---

## Configuration

### Plugin Registration (Auto-Discovery)

OpenCode **automatically discovers** plugins from the `plugins/` directory — **no config entry needed!**

```text
.opencode/
  plugins/
    pai-unified.ts    # Auto-discovered and loaded
```

OpenCode scans `{plugin,plugins}/*.{ts,js}` and loads all matching files automatically.

**Important:** Do NOT add relative paths to `opencode.json` — this causes `BunInstallFailedError`.

If you must explicitly register a plugin (e.g., from npm or absolute path), use:

```json
{
  "plugin": [
    "some-npm-package",
    "file:///absolute/path/to/plugin.ts"
  ]
}
```

**Note:** The config key is `plugin` (singular), not `plugins` (plural).

### Identity Configuration

PAI-specific identity configuration is handled via:
- `USER/DAIDENTITY.md` → AI personality and voice settings
- `USER/TELOS/` → User context, goals, and preferences
- `opencode.json` → `username` field

---

## Security Patterns

Security validation uses multi-layer pattern matching against dangerous commands:

**Blocked Patterns (DANGEROUS_PATTERNS):**
- `rm -rf /` — Root-level deletion
- `rm -rf ~/` — Home directory deletion
- `mkfs.` — Filesystem formatting
- `bash -i >&` — Reverse shells
- `curl | bash` — Remote code execution
- `cat .ssh/id_` — Credential theft
- `eval $(echo ... | base64 -d)` — Obfuscated RCE
- `printenv | curl` — Environment exfiltration
- `python -c "import os; os.system()"` — Python RCE one-liners
- `node -e "require('child_process')"` — Node RCE one-liners

**Warning Patterns (WARNING_PATTERNS):**
- `git push --force` — Force push
- `git reset --hard` — Hard reset
- `npm install -g` — Global installs
- `docker rm` — Container removal

**Enhanced in v3.0 (WP-B):**
- 7-category injection pattern detection (`injection-patterns.ts`)
- Input sanitization before matching (`sanitizer.ts` — base64 decode, Unicode normalization)
- Security audit logging to `security-audit.jsonl`
- Multi-field scanning (not just `args.content`)

See `plugins/adapters/types.ts` for full pattern definitions.

---

## Logging

**CRITICAL:** Never use `console.log` in plugins — it corrupts the OpenCode TUI.

Use the file logger instead:

```typescript
import { fileLog, fileLogError, clearLog } from "./lib/file-logger";

fileLog("Plugin loaded");
fileLog("Warning message", "warn");
fileLogError("Something failed", error);
```

Log file location: `~/.opencode/plugins/debug.log`

---

## Observability

The `observability-emitter.ts` handler sends events to the PAI Observability Server for real-time monitoring:

**Design:** Fire-and-forget with 1-second timeout. Server unavailability is not an error.

**Events emitted:**
- `session.start`, `session.end`
- `context.loaded`
- `user.message`, `assistant.message`
- `tool.execute`, `agent.complete`
- `security.block`, `security.warn`
- `explicit.rating`, `implicit.sentiment`
- `isc.validated`
- `voice.sent`
- `learning.captured`

Configure via `PAI_OBSERVABILITY_PORT` and `PAI_OBSERVABILITY_ENABLED` environment variables.

---

## Troubleshooting

### Plugin Not Loading

1. Is the plugin file in `.opencode/plugins/`? (Auto-discovery location)
2. Can Bun parse the TypeScript? `bun run .opencode/plugins/pai-unified.ts`
3. Are there TypeScript errors? Check `~/.opencode/plugins/debug.log`
4. If using `opencode.json`: Use `plugin` (singular), not `plugins` (plural)
5. If using explicit paths: Use `file://` URL format, not relative paths

### Context Not Injecting

1. Does `MINIMAL_BOOTSTRAP.md` exist in `.opencode/PAI/`?
2. Check `~/.opencode/plugins/debug.log` for loading errors
3. Verify bootstrap loader can find PAI skill directory

### Security Blocking Everything

1. Review `debug.log` for which pattern matched
2. Verify command is actually safe
3. Check for false positives in pattern matching
4. Review `security-audit.jsonl` for audit trail

### TUI Corruption

**Cause:** Using `console.log` in plugin code
**Fix:** Replace all `console.log` with `fileLog` from `lib/file-logger.ts`

---

## Migration from Claude Code Hooks

If migrating from PAI's Claude Code implementation:

| Claude Code | OpenCode | Notes |
|-------------|----------|-------|
| `hooks/` directory | `plugins/` directory | Different location |
| `settings.json` hooks | `opencode.json` plugins | Different config |
| Exit code 2 to block | `throw Error()` | Different mechanism |
| Reads stdin for input | Function parameters | Different API |
| Multiple hook files | Single unified plugin | Recommended pattern |
| No custom tools | `tool` hook | New: register custom tools |
| No compaction hook | `experimental.session.compacting` | New: influence compaction |
| No shell env hook | `shell.env` | New: inject env vars |

**Key Differences:**
1. OpenCode plugins use async functions, not external scripts
2. Blocking uses `throw Error()` instead of `exit(2)`
3. Input comes from function parameters, not stdin
4. All hooks can be combined in one plugin file
5. Three new hooks available (custom tools, compaction, shell.env)

---

## Related Documentation

- **Memory System:** `SYSTEM/MEMORYSYSTEM.md`
- **Agent System:** `SYSTEM/PAIAGENTSYSTEM.md`
- **Architecture:** `SYSTEM/PAISYSTEMARCHITECTURE.md`
- **Security Patterns:** `plugins/adapters/types.ts`
- **Observability:** `plugins/handlers/observability-emitter.ts`

---

**Last Updated:** 2026-03-17
**Status:** Production — 27 handlers, 9 libraries, 9 hooks active
**Maintainer:** PAI System
