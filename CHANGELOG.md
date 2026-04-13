# Changelog

All notable changes to PAI-OpenCode are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.0.1](https://github.com/Steffen025/pai-opencode/compare/pai-opencode-v3.0.0...pai-opencode-v3.0.1) (2026-04-13)


### Bug Fixes

* **migration:** add missing closing brace in migrateSkills function ([#147](https://github.com/Steffen025/pai-opencode/issues/147)) ([1625b41](https://github.com/Steffen025/pai-opencode/commit/1625b416ff9304b063312105986ad994549567bc))
* update hero banner path in README ([e7e1c92](https://github.com/Steffen025/pai-opencode/commit/e7e1c9220bb245d1ce009b62623d2e190ab0f3ae))

## [3.0.0](https://github.com/Steffen025/pai-opencode/compare/opencode-v2.0.0...pai-opencode-v3.0.0) (2026-04-13)

PAI-OpenCode v3.0 is the **OpenCode-native release** — a complete re-architecture that moves from a Claude Code fork to vanilla OpenCode, removes the bootstrap loading mechanism in favour of the native skill system, and ships a zero-config Zen-free default so users are productive immediately.

---

### ⚠️ Breaking Changes

* **`model_tiers` removed (WP-M1).** Each agent in `opencode.json` has exactly one `model` field. The `model_tiers` block (`quick`/`standard`/`advanced`) and the `model_tier` Task parameter are gone. Run `migrate-legacy-config.ts` to auto-convert. See [ADR-019](docs/architecture/adr/ADR-019-vanilla-opencode-migration.md) and [UPGRADE.md](UPGRADE.md).
* **Vanilla OpenCode only.** The custom `Steffen025/opencode` fork is archived. Install via the official [opencode.ai](https://opencode.ai) installer — no custom build required.
* **Bootstrap loading removed (ADR-020).** `MINIMAL_BOOTSTRAP.md` is deleted. The PAI Core Skill (Algorithm, ISC, Capabilities) now loads via OpenCode's native skill system (`tier: always` via `GenerateSkillIndex.ts` + `skills/PAI` symlink). Plugin loads user identity context only.
* **`skills/CORE` renamed to `skills/PAI`.** All internal paths updated.
* **Provider setup is post-install.** The install wizard no longer asks about providers. Connect via `/connect` in OpenCode, then update agent models with `switch-provider.ts`. See [INSTALL.md](INSTALL.md).

---

### Migration

For v2.x users with `model_tiers` configs:

```bash
bun run PAI-Install/engine/migrate-legacy-config.ts ~/.opencode/opencode.json
```

Full guide: [UPGRADE.md](UPGRADE.md).

---

### Features

#### Core Architecture

* **Algorithm v3.7.0 ported** from upstream PAI v4.0.3 — Constraint Fidelity System, Verification Rehearsal, ISC Adherence Check, Build Drift Prevention (WP1, PRs #32-35)
* **Hierarchical skill structure** — 11 categories (Agents, ContentAnalysis, Investigation, Media, Research, Scraping, Security, Telos, Thinking, USMetrics, Utilities) migrated from flat layout (WP4, PRs #38-40)
* **Native skill loading** — `PAI/SKILL.md` is `tier: always` via `GenerateSkillIndex.ts`; skills load on-demand via OpenCode's native skill tool; 233KB static context eliminated (WP2, PR #34 + PR #138)
* **Zen free out-of-box** — all agents default to `opencode/big-pickle` (permanent Zen flagship, no API key required); volatile free Zen models removed as defaults due to rotation risk (PR #138)

#### Event-Driven Plugin System (WP3 + WP-A, PRs #37, #42)

* **Unified plugin** `pai-unified.ts` — replaces 5 separate plugins and hook emulation layer
* **5 new plugin handlers**: `prd-sync.ts`, `session-cleanup.ts`, `last-response-cache.ts`, `relationship-memory.ts`, `question-tracking.ts`
* **Bus events**: `session.compacted`, `session.error`, `permission.asked`, `command.executed`, `installation.update.available`, `session.updated`, `session.created`
* **`shell.env` hook** — PAI context injected per bash call
* **`loadUserSystemContext()`** — plugin now loads only user-specific context (PAI/AISTEERINGRULES.md + USER/* identity files); Algorithm content loads via skill system

#### Security Hardening (WP-B, PR #43)

* **Prompt injection detection** — `injection-patterns.ts` with configurable sensitivity (low/medium/high)
* **Input sanitization layer** — `sanitizer.ts` pre-processes input before LLM
* **Security event logging** — audit trail for injection attempts
* Integration runs on `tool.execute.before` and `message.received` events

#### Core PAI System (WP-C, PR #45)

* **Skill structure fixes** — flattened incorrectly nested `USMetrics/USMetrics/` and `Telos/Telos/` directories
* **New skills ported from PAI v4.0.3**: `Utilities/AudioEditor/`, `Utilities/Delegation/`
* **PAI docs ported from v4.0.3**: `CLI.md`, `CLIFIRSTARCHITECTURE.md`, `DOCUMENTATIONINDEX.md`, `FLOWS.md`, `PAIAGENTSYSTEM.md`, `THENOTIFICATIONSYSTEM.md` + 3 subdirectories (`ACTIONS/`, `FLOWS/`, `PIPELINES/`)
* **`BuildOpenCode.ts`** — OpenCode-native replacement for `BuildCLAUDE.ts`

#### Installer & Migration (WP-D, PR #47)

* **Migration script** `migrate-legacy-config.ts` — auto-converts `model_tiers` blocks, preserves `standard` tier model, creates `.pre-v3.0.bak` backup
* **DB Health tooling** — `db-utils.ts` monitors DB size and session age; warns when DB > 500 MB or sessions > 90 days old
* **`db-archive.ts`** — standalone Bun tool (`--dry-run`, `--vacuum`, `--restore`)
* **`/db-archive` custom command** — session archiving in OpenCode TUI
* **`DB-MAINTENANCE.md`** — operational guide
* **Interactive terminal install wizard** — CLI-only, Electron GUI removed (PR #96)
* **PAI wrapper script** — `pai` command separate from `opencode`, explicit `PAI_ENABLED=1` (PR #104)

#### Session Intelligence (WP-N1–N3, PRs #50-53)

* **Session Registry** — `session_registry` and `session_results` custom tools for post-compaction context recovery (ADR-012)
* **Compaction Intelligence** — `compaction-intelligence.ts` hooks `experimental.session.compacting`; injects registry + ISC + PRD context into compaction summary to prevent silent context loss (ADR-015)
* **Algorithm Awareness** — SKILL.md updated with post-compaction recovery pattern; `parent_session_id` links child PRDs to originating session (ADR-013)

#### Documentation & Tooling (WP-N4–N10, PRs #53-59)

* **LSP integration documented** — `OPENCODE_EXPERIMENTAL_LSP_TOOL=true` opt-in, LSP vs Grep decision table (ADR-014)
* **System Self-Awareness skill** — `OpenCodeSystem/SKILL.md` with `SystemArchitecture.md`, `ToolReference.md`, `Configuration.md`, `Troubleshooting.md` (ADR-017)
* **roborev + Biome CI** — `roborev-trigger.ts` handler, `CodeReview` skill, `code-quality.yml` GitHub Actions workflow (ADR-018)
* **Obsidian Formatting Guidelines** — `FormattingGuidelines.md` and `AgentCapabilityMatrix.md` (16 agents, models, tool access, decision rules)
* **ADR-019** — Vanilla OpenCode migration decision record
* **ADR-020** — Native OpenCode context loading (bootstrap removal) decision record

#### Provider Infrastructure

* **`switch-provider.ts`** — switches all agent models with one command; profiles: zen, zen-free, zen-paid, anthropic, openai, local; `--multi-research` for native research agents
* **Two-step provider setup** documented — `/connect` (credentials) → `switch-provider.ts` (opencode.json agent models)
* **Anthropic Claude Max ToS warning** — community plugin not shipped; ToS-safe alternatives documented in INSTALL.md

#### CI/CD

* **GitHub Actions** — `ci.yml`, `code-quality.yml`, `codeql.yml`, `scorecards.yml`, upstream sync workflows
* **CodeRabbit** integration (`.coderabbit.yaml`)
* **StepSecurity hardening** — CI workflows hardened (PR #108)
* **release-please** — automated release management

---

### Bug Fixes

* Fix `files_loaded` counter — now counts all injected files including `PAI/AISTEERINGRULES.md` (was hardcoded `1`)
* Fix `USER/` → `PAI/USER/` paths in plugin, docs, and diagrams
* Remove provider API key write from `.env` generation — model provider auth via `/connect`, not `.env`
* Remove misleading `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` examples from `.env` template
* Rename `loadMinimalBootstrap()` → `loadUserSystemContext()` — name now matches behaviour
* Fix stale log messages in plugin (`"minimal bootstrap"` → `"user system context"`)
* Fix `ALWAYS_LOADED_SKILLS` docs — correctly shows all 6 entries matching `GenerateSkillIndex.ts`

---

### Removed

* `PAI-Install/electron/` — GUI installer
* `PAI-Install/engine/build-opencode.ts` — fork build system (245 LOC)
* `MINIMAL_BOOTSTRAP.md` — replaced by native skill system
* `model_tiers` blocks from `opencode.json` and all provider profiles
* `model_tier` parameter from `agent-execution-guard.ts`, `session-registry.ts`
* `tiers:` sections from all provider YAML profiles
* `PAI-Install/web/` and `PAI-Install/main.ts`
* All references to `Steffen025/opencode` fork and `feature/model-tiers` branch

---

### Dependencies

* bump @opencode-ai/plugin 1.1.39 → 1.4.3 ([#118](https://github.com/Steffen025/pai-opencode/pull/118))
* bump actions/checkout v4 → v6 ([#124](https://github.com/Steffen025/pai-opencode/pull/124))
* bump actions/github-script v7 → v9 ([#129](https://github.com/Steffen025/pai-opencode/pull/129))
* bump actions/upload-artifact v4 → v7 ([#127](https://github.com/Steffen025/pai-opencode/pull/127))
* bump github/codeql-action v3 → v4 ([#114](https://github.com/Steffen025/pai-opencode/pull/114))
* bump ossf/scorecard-action 2.4.0 → 2.4.3 ([#111](https://github.com/Steffen025/pai-opencode/pull/111))
* bump sharp 0.33.5 → 0.34.5 in Pptx/Scripts ([#119](https://github.com/Steffen025/pai-opencode/pull/119))
* bump @types/node v20 → v25 in BugBountyTool ([#113](https://github.com/Steffen025/pai-opencode/pull/113))

---

### Contributors

Special thanks to community members whose contributions are included in this release:

| Contributor | Contribution | PR |
|-------------|-------------|-----|
| **[@eddovandenboom](https://github.com/eddovandenboom)** | PAI wrapper script, `--fix-symlink` flag | [#104](https://github.com/Steffen025/pai-opencode/pull/104) |
| **[@ktneely](https://github.com/ktneely)** | Model profile updates for provider-agnostic routing | [#103](https://github.com/Steffen025/pai-opencode/pull/103) |
| **[@step-security-bot](https://github.com/step-security-bot)** | CI security hardening, pinned Actions SHA hashes | [#106](https://github.com/Steffen025/pai-opencode/pull/106) |

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

## v2.0.1 — Legacy Installer Build Process Fix (2026-02-20)

### Fixed

#### Critical: Legacy Installer Build-from-Source Completely Broken
- **Symptom:** `git clone` succeeds but legacy installer reports "Failed to clone repository" and aborts
- **Root cause:** `execCommand()` with `stdio: 'inherit'` returns `null` from `execSync()`. Calling `.trim()` on `null` throws TypeError, caught as failure. **Every non-silent command falsely reports failure.**
- **Fix:** Null-safe guard: `output.trim()` → `(output ?? '').trim()`

#### Go Prerequisite Removed (No Longer Needed)
- **Context:** OpenCode was historically a Go project (BubbleTea TUI). It has been completely rewritten to Bun/TypeScript. The build now uses `Bun.build({ compile: true })` to produce native binaries — no Go toolchain needed.
- **Fix:** Removed Go prerequisite check from the legacy installer and all documentation
- **Fix:** Strengthened Bun version check from 1.3+ to 1.3.9+ (matches OpenCode monorepo `packageManager` field)

#### Binary Detection After Build
- **Symptom:** After successful build, legacy installer couldn't find the binary
- **Root cause:** Generic filename search didn't match `Bun.build()` output structure (`dist/opencode-{os}-{arch}/bin/opencode`)
- **Fix:** Deterministic platform-based binary lookup using `process.platform` + `process.arch` with baseline fallback

### Changed
- **Legacy installer messaging** updated to reflect Bun-based build (not Go)
- **INSTALL.md** — Prerequisites: removed Go, added Bun 1.3.9+ note. Manual install: complete rewrite with `bun run ./packages/opencode/script/build.ts --single`. WSL section: removed `golang-go` package.
- **README.md** — Quick Start: added prerequisites line, updated installer step description
- **docs/MIGRATION.md** — Replaced `go install` with installer command, replaced `$(go env GOPATH)/bin` with `~/.local/bin` in PATH troubleshooting
- **EXPLORATION-SUMMARY.md (since removed)** — Updated wizard flow description

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
1. Re-run the installer update flow: `bash PAI-Install/install.sh --update`
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
- Legacy interactive installer (removed; CLI installer is canonical)
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

| Feature | v1.0.0 | v1.1.0 | v1.2.0 | v1.2.1 | v1.3.0 | v2.0.0 | **v3.0.0** |
|---------|--------|--------|--------|--------|--------|--------|------------|
| PAI Version | 2.4 | **2.5** | 2.5 | 2.5 | 2.5 | **3.0** | **3.0** |
| Algorithm | Basic | **Full 7-phase** | Full 7-phase | Full 7-phase | Full 7-phase | **v1.8.0** | **v1.8.0** |
| Handlers | 8 | **13** | 13 | 13 | 13 | 13 | **16** |
| Agents | 14 | 14 | 14 | 18 | **15 (cleaned)** | 15 | **16** |
| Dynamic Tier Routing | No | No | No | No | **Yes** | Yes | Yes |
| Provider Profiles | No | No | No | **Yes (5)** | **Yes (6)** | Yes (6) | Yes (6) |
| Multi-Provider Research | No | No | No | **Yes** | **Yes** | Yes | Yes |
| Observability Dashboard | No | No | **Yes** | Yes | Yes | Yes | Yes |
| Voice Notifications | No | **Yes** | Yes | Yes | Yes | Yes | Yes |
| Sentiment Detection | No | **Yes** | Yes | Yes | Yes | Yes | Yes |
| Image Optimization | No | No | No | No | **79% reduction** | 79% reduction | 79% reduction |
| Wisdom Frames | No | No | No | No | No | **Yes (5 domains)** | Yes (5 domains) |
| Verify Completion Gate | No | No | No | No | No | **Yes** | Yes |
| Effort-Scaled Gates | No | No | No | No | No | **Yes** | Yes |
| **DB Health Tooling** | No | No | No | No | No | No | **Yes** |
| **Installer (CLI-only)** | No | No | No | No | No | No | **Yes** |
| **v2→v3 Migration** | No | No | No | No | No | No | **Yes** |
| **Security Hardening** | No | No | No | No | No | No | **Full** |

---

## Upgrade Path

### From v2.x to v3.0.0 (Breaking Changes)

**Before you start:** The v3.0.0 release has significant breaking changes:
- Skills structure: flat → hierarchical (Category/Skill)
- Config: single-file → dual-file (opencode.json + settings.json)
- Paths: `.claude/` → `.opencode/`
- New CLI-only installer

**Recommended upgrade process:**

1. **Backup your existing installation:**
   ```bash
   cp -r ~/.opencode ~/.opencode-backup-$(date +%Y%m%d)
   ```

2. **Run the migration tool (dry-run first):**
   ```bash
   bun Tools/migration-v2-to-v3.ts --dry-run
   ```

3. **Review the migration report**, then execute:
   ```bash
   bun Tools/migration-v2-to-v3.ts
   ```

4. **Alternative: Fresh install (recommended for a clean setup):**
   ```bash
    bash PAI-Install/install.sh
   ```

**See [UPGRADE.md](/UPGRADE.md) for detailed step-by-step instructions.**

### From v1.2.x to v1.3.0

```bash
git fetch origin
git checkout main
git pull origin main
 bash PAI-Install/install.sh --update
```

Re-running the installer is recommended — it generates the new profile format with dynamic tier routing.

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
- [Upstream Sync Spec](docs/specs/UPSTREAM-SYNC-v1.8.0-SPEC.md)
