# Changelog

All notable changes to PAI-OpenCode are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.0.0] - Unreleased

### Breaking Changes
- Plugin system migrated from hooks to event-driven architecture (WP-A)
- Skills structure changed: flat → hierarchical Category/Skill (WP-C)
- Config dual-file: `opencode.json` + `settings.json` (replaces single file)
- All paths migrated: `.claude/` → `.opencode/`, `CLAUDE.md` → `AGENTS.md`

### Added

#### Plugin Event Bus (WP-A)
- **6 Plugin Handlers** — prd-sync, session-cleanup, last-response-cache, relationship-memory, question-tracking, agent-execution-guard
- **7 Bus Events** — session.compacted, session.error, permission.asked, command.executed, installation.update.available, session.updated, session.created
- **Event-Driven Architecture** — cleaner code, better testability, unified handler registration

#### Security Layer (WP-B)
- **Prompt Injection Guard** — `plugins/handlers/prompt-injection-guard.ts` with `injection-patterns.ts` library
- **Input Sanitizer** — `plugins/lib/sanitizer.ts` for pre-processing protection
- **Sensitivity Levels** — low/medium/high security modes
- **Pattern Detection** — 200+ known injection patterns from v4.0.3 upstream

#### Core PAI System (WP-C)
- **Missing Skills** — AudioEditor, Delegation, Research/Templates, Agents/ClaudeResearcherContext
- **PAI Flat Docs** — 9 files: CLI.md, CLIFIRSTARCHITECTURE.md, DOCUMENTATIONINDEX.md, FLOWS.md, PAIAGENTSYSTEM.md, README.md, SYSTEM_USER_EXTENDABILITY.md, THEFABRICSYSTEM.md, THENOTIFICATIONSYSTEM.md
- **PAI Subdirectories** — ACTIONS/, FLOWS/, PIPELINES/
- **BuildOpenCode.ts** — OpenCode-native version of BuildCLAUDE.ts
- **Telos/USMetrics Flatten** — Fixed nested skill structure

#### Installer & Migration (WP-D)
- **PAI-Install** — Complete port from upstream v4.0.3 (shell, CLI, engine, Electron GUI)
- **Migration Script** — `Tools/migration-v2-to-v3.ts` with `--dry-run`, `--force`, `--backup-dir`
- **UPGRADE.md** — Step-by-step v2→v3 migration guide

#### DB Health Tooling (WP-F)
- **DB Utils Library** — `plugins/lib/db-utils.ts` with getDbSizeMB(), getSessionsOlderThan(), archiveSessions(), vacuumDb()
- **Session Cleanup Extension** — Automatic DB health warnings (>500MB, >90 days)
- **Standalone Archive Tool** — `Tools/db-archive.ts` with --dry-run, --vacuum, --restore
- **Custom Command** — `/db-archive` for in-session DB stats
- **Maintenance Guide** — `docs/DB-MAINTENANCE.md`

### Changed
- Skills organization: flat → hierarchical (Category/Skill)
- Config management: single-file → dual-file
- Installer: CLI-only → CLI + Electron GUI
- Security: none → full prompt injection protection

### Migration
- See [UPGRADE.md](/UPGRADE.md) for detailed migration instructions
- Run `bun Tools/migration-v2-to-v3.ts --dry-run` to preview
- Automatic backup created before any changes

---

## [2.0.0] - 2026-02-19

### Breaking Changes
- Algorithm format changed (8 effort levels replace FULL/ITERATION/MINIMAL depth)
- Start symbol changed from 🤖 to ♻︎
- ISC naming convention updated to ISC-{Domain}-{N} with priority/confidence tags
- SKILL.md completely rewritten — Algorithm v1.2.0 → **v1.8.0** (upstream sync)

### Added

#### v1.2.0 Base (2026-02-17)
- **Constraint Extraction System** — Mechanical [EX-N] extraction before ISC
- **Self-Interrogation** — 5 structured questions before BUILD
- **Build Drift Prevention** — Re-read [CRITICAL] ISC before each artifact
- **Verification Rehearsal** — Simulate violations in THINK phase
- **Mechanical Verification** — No rubber-stamp PASS, require evidence
- **8 Effort Levels** — Instant, Fast, Standard, Extended, Advanced, Deep, Comprehensive, Loop
- **7 Quality Gates** — QG1-QG7 must pass before proceeding
- **25-Capability Full Scan Audit** — Replaces Two-Pass capability selection
- **PRD System** — Persistent Requirements Documents for cross-session tracking
- **Anti-Criteria** — ISC-A-{Domain}-{N} for what must NOT happen
- **Algorithm Reflection JSONL** — Structured Q1/Q2/Q3 learning capture
- **OBSERVE Hard Gate** — Thinking-only phase, no tool calls except TaskCreate
- **AUTO-COMPRESS** — Drop effort tier when >150% of phase budget
- **10 new skills** — Cloudflare, ExtractWisdom, IterativeDepth, Science, Parser, Remotion, Sales, USMetrics, WorldThreatModelHarness, WriteStory
- **5 new plugin handlers** — algorithm-tracker, agent-execution-guard, skill-guard, check-version, integrity-check
- **format-reminder handler** updated for 8-tier effort level system
- **PRD directory structure** with templates and lifecycle management

#### Upstream Sync v1.3.0–v1.8.0 (2026-02-19)
Porting 14 upstream commits spanning Algorithm v1.3.0 through v1.8.0:

- **Verify Completion Gate (v1.6.0)** — CRITICAL: Prevents "PASS" claims without actual TaskUpdate calls. NON-NEGOTIABLE at ALL effort levels.
- **Phase Separation Enforcement (v1.6.0)** — "STOP" markers on THINK, PLAN, BUILD, EXECUTE, VERIFY phases
- **Zero-Delay Output Section (v1.6.0)** — Instant output before any processing
- **Self-Interrogation Effort Scaling (v1.3.0)** — Instant/Fast skip, Standard answers 1+4, Extended+ answers all 5
- **Constraint Extraction Effort Scaling (v1.3.0)** — Gate added for effort levels below Standard
- **Steps 6-8 Gated to Extended+ (v1.3.0)** — Constraint Fidelity System steps scale by effort
- **QG6/QG7 Gated to Extended+ (v1.3.0)** — Quality gates scale by effort in OBSERVE and PLAN
- **ISC Scale Tiers Updated (v1.3.0)** — Simple: 4-16, Medium: 17-32, Large: 33-99, Massive: 100-500+
- **BUILD Capability Execution Substep (v1.8.0)** — Explicit capability execution within BUILD
- **Wisdom Injection OUTPUT 1.75 (v1.8.0)** — Injects domain wisdom between Constraint Extraction and ISC
- **Wisdom Frame Update in LEARN (v1.8.0)** — Captures new wisdom into domain frames
- **Algorithm Reflection Moved First in LEARN (v1.8.0)** — Reflection before PRD LOG
- **Wisdom Frames System** — `MEMORY/WISDOM/` directory with 5 seed domain frames (development, deployment, security, architecture, communication)
- **WisdomFrameUpdater.ts** — CLI tool for managing wisdom frames (`--domain`, `--observation`, `--type`, `--list`, `--show`)
- **Security Validator env var prefix fix** — Upstream #620: strips `export/set/declare/readonly` prefixes to prevent false positives
- **Rating Capture 5/10 noise filter** — Ambiguous 5/10 ratings skip learning file generation (still tracked in JSONL)
- **Symlink support in GenerateSkillIndex.ts** — `findSkillFiles()` follows symlinks to directories, handles broken symlinks gracefully
- **SessionHarvester PAI_DIR rename** — `CLAUDE_DIR` → `PAI_DIR` with `process.env.PAI_DIR` fallback

### Changed
- SKILL.md rewritten from Algorithm v0.2.25 to **v1.8.0** (was v1.2.0)
- Capability selection now uses 25-capability full scan (was Two-Pass)
- ISC criteria now use domain-grouped naming convention
- format-reminder handler enhanced with effort level detection
- Constraint Fidelity System updated to v1.3.0
- LEARN phase restructured: Algorithm Reflection → PRD LOG → Wisdom Frame Update → Learning → Voice
- Voice curl commands now use `{DAIDENTITY.ALGORITHMVOICEID}` template variable

### Not Portable (Claude Code Only)
- Agent Teams/Swarm (requires CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1)
- Plan Mode (EnterPlanMode/ExitPlanMode built-in tools)
- StatusLine (Claude Code UI feature)

---

## v2.0.1 — Wizard Build Process Fix (2026-02-20)

### Fixed

#### Critical: Wizard Build-from-Source Completely Broken
- **Symptom:** `git clone` succeeds but wizard reports "Failed to clone repository" and aborts
- **Root cause:** `execCommand()` with `stdio: 'inherit'` returns `null` from `execSync()`. Calling `.trim()` on `null` throws TypeError, caught as failure. **Every non-silent command falsely reports failure.**
- **Fix:** Null-safe guard: `output.trim()` → `(output ?? '').trim()`

#### Go Prerequisite Removed (No Longer Needed)
- **Context:** OpenCode was historically a Go project (BubbleTea TUI). It has been completely rewritten to Bun/TypeScript. The build now uses `Bun.build({ compile: true })` to produce native binaries — no Go toolchain needed.
- **Fix:** Removed Go prerequisite check from wizard and all documentation
- **Fix:** Strengthened Bun version check from 1.3+ to 1.3.9+ (matches OpenCode monorepo `packageManager` field)

#### Binary Detection After Build
- **Symptom:** After successful build, wizard couldn't find the binary
- **Root cause:** Generic filename search didn't match `Bun.build()` output structure (`dist/opencode-{os}-{arch}/bin/opencode`)
- **Fix:** Deterministic platform-based binary lookup using `process.platform` + `process.arch` with baseline fallback

### Changed
- **Wizard messaging** updated to reflect Bun-based build (not Go)
- **INSTALL.md** — Prerequisites: removed Go, added Bun 1.3.9+ note. Manual install: complete rewrite with `bun run ./packages/opencode/script/build.ts --single`. WSL section: removed `golang-go` package.
- **README.md** — Quick Start: added prerequisites line, updated wizard step description
- **docs/MIGRATION.md** — Replaced `go install` with wizard command, replaced `$(go env GOPATH)/bin` with `~/.local/bin` in PATH troubleshooting
- **EXPLORATION-SUMMARY.md** — Updated wizard flow description

---

## v1.3.2 — Wizard Fixes + Fork Alignment (2026-02-11)

### Fixed
- **Wizard:** 4 provider presets (Anthropic, Zen Paid, Zen Free, Ollama Local) with clearer auth guidance
- **Wizard:** Build-from-source now clones from `Steffen025/opencode` fork (`feature/model-tiers` branch)
- **Wizard:** Non-blocking Go prerequisite check (warning only, no abort)
- **Wizard:** Auto-creates `.opencode/opencode.json` symlink → `../opencode.json` (single source of truth)
- **Voice Server:** macOS `say` TTS fallback when no API keys configured
- **Observability Dashboard:** Fixed `type` → `event_type` field naming across all Vue components
- **Observability Server:** Added `completeSession()` on `session.end` events

### Deprecated
- **Observability Dashboard** — Will be removed in a future version. The Vue-based dashboard adds significant dependency overhead with limited practical value. Server-side JSONL event logging remains unaffected.

---

## v1.3.1 — Plugin Crash Fix + Interface Alignment (2026-02-11)

### Fixed

#### Critical: Tool Execution Crash (All Tools Affected)
- **Symptom:** ALL tools (Bash, Read, Glob, Grep, etc.) crashed with `TypeError: undefined is not an object (evaluating 'Object.keys(args)')`
- **Root cause:** Interface mismatch between `pai-unified.ts` (caller) and `observability-emitter.ts` (receiver). Emit functions expected positional parameters but were called with object parameters after a feature sync.
- **Fix:** All 14 emit functions in `observability-emitter.ts` converted to accept object parameters with defensive null-checks. All 17 call-sites in `pai-unified.ts` updated to match.

#### Critical: OpenCode Startup Failure
- **Symptom:** OpenCode refused to start with config validation error
- **Root cause:** Invalid `"pai"` top-level key in `opencode.json` — OpenCode doesn't recognize this config key
- **Fix:** Removed `"pai"` block from `opencode.json`

#### Installation Wizard: Build-from-Source Completely Broken ([#21](https://github.com/Steffen025/pai-opencode/issues/21))
- **Symptom:** `git clone` in wizard fails with 404; even if clone succeeded, build would fail
- **Root cause 1:** Clone URL referenced `nicepkg/opencode.git` which no longer exists
- **Root cause 2:** Build commands used `go build` — but OpenCode is a TypeScript/Bun project, not Go
- **Root cause 3:** Install paths referenced `~/go/bin` which is irrelevant
- **Fix:** Complete rewrite of build-from-source function:
  - Clone URL updated to `anomalyco/opencode.git`
  - Build process now uses `bun install` + `bun run ./packages/opencode/script/build.ts --single`
  - Added Bun 1.3+ prerequisite check with version validation
  - Binary search in `packages/opencode/dist/` with platform-specific names
  - Install to `~/.local/bin` or `/usr/local/bin` (removed Go paths)

### Changed

#### Simplified Versioning
- **Removed `@version` tags** from individual plugin handler files (`pai-unified.ts`, `observability-emitter.ts`, `implicit-sentiment.ts`)
- **Single version source:** Only the repository version (in README + CHANGELOG) matters. Individual subsystems don't have their own version lifecycle since they're always released together.

---

## v1.3.0 — Dynamic Per-Task Model Tier Routing (2026-02-10)

### 🚀 Major: Dynamic Tier Routing Across Provider Boundaries

**The orchestrator now automatically routes each task to the right model at the right cost — and the same agent scales up or down dynamically based on task complexity.**

This is a turning point for PAI-OpenCode. Up until v1.2, we were running a 1:1 port of vanilla PAI. With v1.3.0, we leverage what makes OpenCode unique: multi-provider support with dynamic model routing.

As far as we can tell, no other AI coding assistant or agent framework currently offers this pattern of dynamic per-task model tier routing across provider boundaries.

#### How It Works

- **Three-tier model routing** — `quick`, `standard`, `advanced` tiers per agent in `opencode.json`
- **Orchestrator decides per task** — Same Engineer uses GLM 4.7 for batch edits, Kimi K2.5 for features, Claude Sonnet 4.5 for complex debugging
- **You always pay exactly what the task requires** — no more, no less
- Backward-compatible: `model` field still works as fallback

#### Dynamic Tier Routing Table

| Agent | Default | Scales Down To | Scales Up To |
|-------|---------|----------------|--------------|
| **Architect** | Kimi K2.5 | GLM 4.7 (quick review) | Claude Opus 4.6 (complex architecture) |
| **Engineer** | Kimi K2.5 | GLM 4.7 (batch edits) | Claude Sonnet 4.5 (complex debugging) |
| **DeepResearcher** | GLM 4.7 | MiniMax (quick lookup) | Kimi K2.5 (deep analysis) |
| **GeminiResearcher** | Gemini 3 Flash | — | Gemini 3 Pro (deep research) |
| **PerplexityResearcher** | Sonar | — | Sonar Deep Research |
| **GrokResearcher** | Grok 4.1 Fast | — | Grok 4.1 (full analysis) |
| **CodexResearcher** | GPT-5.1 Codex Mini | — | GPT-5.2 Codex |
| **Writer** | Gemini 3 Flash | MiniMax (quick drafts) | Claude Sonnet 4.5 (premium copy) |
| **Pentester** | Kimi K2.5 | GLM 4.7 (quick scan) | Claude Sonnet 4.5 (deep audit) |
| **Intern** | MiniMax M2.1 | — | — |
| **explore** | MiniMax M2.1 | — | — |
| **QATester** | GLM 4.7 | — | — |

#### Agent System Changes
- **Model routing centralized** — Agent `.md` files no longer contain `model:` in frontmatter. ALL model routing now lives exclusively in `opencode.json`
- **15 specialized agents** with dynamic tier routing
- **DeepResearcher** replaces ClaudeResearcher (provider-agnostic naming)
- **Removed** PerplexityProResearcher (redundant), researcher (lowercase duplicate)

**Migration Notes:**
- ⚠️ **If you have custom workflows referencing `ClaudeResearcher`**, update them to `DeepResearcher`
- ⚠️ **If you have custom skills referencing `PerplexityProResearcher`**, migrate to `PerplexityResearcher` with `model_tier: standard` (Sonar Pro). Use `model_tier: advanced` only for Sonar Deep Research.

#### 3 Configuration Presets
- **`zen-paid`** (Recommended) — 75+ providers via Zen AI Gateway. Combine providers freely.
- **`openrouter`** — OpenRouter routing with familiar model names.
- **`local-ollama`** — Fully local with Ollama. Zero cloud, complete privacy.

#### Provider Profiles (v3.0)
- **New YAML format** with `default_model` + `agents` structure including `tiers`
- **New profile:** `zen-paid.yaml` for privacy-preserving pay-as-you-go models
- **Renamed:** `zen.yaml` is now ZEN FREE (community/free models)
- **Removed:** `google.yaml` (use manual config via [ADVANCED-SETUP.md](docs/ADVANCED-SETUP.md))
- **switch-provider.ts v3.0** — Updated for new profile format with model_tiers generation

#### Documentation
- **NEW:** `ADVANCED-SETUP.md` — Guide for multi-provider research, custom models, and manual configuration
- **Updated:** PAIAGENTSYSTEM.md fully rewritten with model tier guide and dynamic routing
- **Updated:** README.md with dynamic tier routing table and new presets
- **47 documentation gaps** fixed across 11 files

#### Image Optimization
- All 17 images in `docs/images/` resized and compressed
- **Total reduction: 12.4 MB → 2.6 MB (79%)**

### Breaking Changes
- Profile YAML format changed (`models:` → `default_model:` + `agents:` with `tiers`)
- `ClaudeResearcher` renamed to `DeepResearcher` (update any custom workflows)
- `PerplexityProResearcher` removed (use `PerplexityResearcher` with `standard` tier for Sonar Pro)
- Agent `.md` files no longer accept `model:` field — use `opencode.json` exclusively
- Google profile removed — configure manually if needed

#### Profile Format Change (Before → After)

**Old format (v1.2.x):**
```yaml
models:
  - model: anthropic/claude-opus-4-6
    agents: [Algorithm]
  - model: anthropic/claude-sonnet-4-5
    agents: [Architect, Engineer, Writer]
```

**New format (v1.3.0):**
```yaml
default_model: anthropic/claude-sonnet-4-5
agents:
  Algorithm:
    model: anthropic/claude-opus-4-6
    tiers:
      quick: anthropic/claude-haiku-4-5
      standard: anthropic/claude-sonnet-4-5
      advanced: anthropic/claude-opus-4-6
```

### Stats
- **113 files changed**, 2,824 insertions, 1,792 deletions
- **15 agents** with dynamic tier routing
- **3 presets** ready to use

### Migration Guide
1. Re-run the wizard: `bun run .opencode/PAIOpenCodeWizard.ts`
2. Or switch profile manually: `bun run .opencode/tools/switch-provider.ts zen-paid`
3. Custom agent models → Edit `opencode.json` agent section directly

---

## [1.2.1] - 2026-02-06

### Major Feature: Provider Profile System + Multi-Provider Research

One-command provider switching for all 18 agent models, with optional multi-provider research routing for diverse AI perspectives.

### Added

#### Provider Profile System
- **5 Provider Profiles** (`profiles/*.yaml`): Anthropic, OpenAI, Google, ZEN (free), Local (Ollama)
- **3-Tier Model Strategy**: Each profile maps agents to Most Capable → Standard → Budget tiers
- **`switch-provider.ts` v2.0**: CLI tool to switch all agent models with one command
  - `bun run switch-provider.ts anthropic` — switch to Anthropic
  - `bun run switch-provider.ts --list` — show available profiles
  - `bun run switch-provider.ts --current` — show active configuration
  - `bun run switch-provider.ts --researchers` — show researcher routing status

#### Multi-Provider Research
- **`--multi-research` flag**: Routes research agents to their native providers for diverse perspectives
  - GeminiResearcher → `google/gemini-2.5-flash`
  - GrokResearcher → `xai/grok-4-1-fast`
  - PerplexityResearcher → `perplexity/sonar`
  - PerplexityProResearcher → `perplexity/sonar-pro`
  - CodexResearcher → `openrouter/openai/gpt-4.1`
- **`researchers.yaml`**: Native researcher-to-provider mapping configuration
- **Graceful fallback**: Missing API keys → researcher uses primary provider instead
- **User-driven opt-in**: No automatic detection — user decides via `--multi-research` flag

#### Installation Wizard Updates
- **New Step 1b**: "Research Agent Configuration" — asks user to choose single or multi-provider research
- **Profile-based generation**: Wizard now uses `applyProfile()` from switch-provider.ts (single source of truth)
- **Research mode display**: Success screen shows research configuration status

### Changed

#### Provider Profile Models (Verified from anomalyco/opencode source)
| Profile | Most Capable | Standard | Budget |
|---------|-------------|----------|--------|
| **Anthropic** | `anthropic/claude-opus-4-6` | `anthropic/claude-sonnet-4-5` | `anthropic/claude-haiku-4-5` |
| **OpenAI** | `openai/gpt-5.1` | `openai/gpt-4.1` | `openai/gpt-4.1-mini` |
| **Google** | `google/gemini-2.5-pro` | `google/gemini-2.5-flash` | `google/gemini-2.0-flash-lite` |
| **ZEN** | `opencode/big-pickle` | `opencode/kimi-k2.5-free` | `opencode/gpt-5-nano` |
| **Local** | `ollama/qwen2.5-coder:32b` | `ollama/qwen2.5-coder:7b` | `ollama/qwen2.5-coder:1.5b` |

#### Documentation Overhaul
- **README.md**: Updated Quick Start, research agent models, provider switching docs
- **INSTALL.md**: Added "Existing OpenCode Users" section addressing symlink workflow (fixes #14)
- **INSTALL.md**: Replaced outdated "Option A/B/C" API Configuration with profile-based switching
- **INSTALL.md**: Updated API Keys table with current model names

### Fixed
- **ZEN profile**: Replaced non-free models (`opencode/claude-sonnet-4-5`) with actual free models
- **OpenAI profile**: Updated from deprecated `gpt-4o`/`gpt-4o-mini` to `gpt-5.1`/`gpt-4.1`/`gpt-4.1-mini`
- **Google profile**: Added proper 3-tier (was all `gemini-2.5-flash`), uses `gemini-2.0-flash-lite` for budget
- **Local profile**: Added guidance comments for Ollama users on which models to pull
- **switch-provider.ts**: Module export guard prevents CLI execution when imported by wizard

### Technical Details
- **Profile Format**: YAML files in `.opencode/profiles/` with `provider/model` format
- **Researcher Overlay**: `researchers.yaml` defines native model + required API key per researcher
- **API Key Detection**: Reads `~/.opencode/.env` to check for available provider keys
- **Settings Tracking**: `settings.json` records `multiResearch` state and active profile

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

| Feature | v1.0.0 | v1.1.0 | v1.2.0 | v1.2.1 | v1.3.0 | v2.0.0 |
|---------|--------|--------|--------|--------|--------|--------|
| PAI Version | 2.4 | **2.5** | 2.5 | 2.5 | 2.5 | **3.0** |
| Algorithm | Basic | **Full 7-phase** | Full 7-phase | Full 7-phase | Full 7-phase | **v1.8.0** |
| Handlers | 8 | **13** | 13 | 13 | 13 | 13 |
| Agents | 14 | 14 | 14 | 18 | **15 (cleaned)** | 15 |
| Dynamic Tier Routing | No | No | No | No | **Yes** | Yes |
| Provider Profiles | No | No | No | **Yes (5)** | **Yes (6)** | Yes (6) |
| Multi-Provider Research | No | No | No | **Yes** | **Yes** | Yes |
| Observability Dashboard | No | No | **Yes** | Yes | Yes | Yes |
| Voice Notifications | No | **Yes** | Yes | Yes | Yes | Yes |
| Sentiment Detection | No | **Yes** | Yes | Yes | Yes | Yes |
| Image Optimization | No | No | No | No | **79% reduction** | 79% reduction |
| Wisdom Frames | No | No | No | No | No | **Yes (5 domains)** |
| Verify Completion Gate | No | No | No | No | No | **Yes** |
| Effort-Scaled Gates | No | No | No | No | No | **Yes** |

---

## Upgrade Path

### From v1.2.x to v1.3.0

```bash
git fetch origin
git checkout main
git pull origin main
bun run .opencode/PAIOpenCodeWizard.ts
```

Re-running the wizard is recommended — it generates the new profile format with dynamic tier routing.

**Manual alternative:** `bun run .opencode/tools/switch-provider.ts zen-paid`

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
- [PAI v3.0 Upstream](https://github.com/danielmiessler/Personal_AI_Infrastructure)
- [OpenCode](https://github.com/anomalyco/opencode)
- [ROADMAP.md](ROADMAP.md)
- [Upstream Sync Spec](docs/specs/UPSTREAM-SYNC-v1.8.0-SPEC.md)
