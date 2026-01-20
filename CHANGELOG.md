# Changelog

All notable changes to PAI-OpenCode will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.9.2] - 2026-01-20

### Critical Discovery - OpenCode Re-Audit

**IMPORTANT:** Previous audits were INVALID because they queried the wrong DeepWiki repository (`opencode-ai/opencode` instead of `anomalyco/opencode`).

### Key Findings

1. **Directory Structure:** OpenCode supports BOTH singular AND plural forms via glob patterns:
   ```typescript
   "{plugin,plugins}/*.{ts,js}"   // Both work!
   "{agent,agents}/**/*.md"       // Both work!
   "{skill,skills}/**/SKILL.md"   // Both work!
   ```

2. **Missing Hook Discovered:** `chat.message` hook EXISTS in OpenCode - this is the UserPromptSubmit equivalent we thought was missing!

3. **Repository Clarification:**
   - `github.com/sst/opencode` → REDIRECTS to → `github.com/anomalyco/opencode`
   - `opencode-ai/opencode` is a DIFFERENT PROJECT (ignore it!)

### Fixed

- **Repository References:** Corrected 5 files that referenced wrong repository
  - README.md (2 locations)
  - docs/HOOK-MAPPING.md (2 locations + added warning)
  - research/SYNTHESIS.md (2 locations)

### Changed

- **NPM Package:** Updated `@opencode-ai/plugin` from 1.1.20 → 1.1.27

### Planned for v0.9.3

Based on these findings, v0.9.3 will include:

1. **Directory Rename (Singular → Plural):**
   - `.opencode/agent/` → `.opencode/agents/`
   - `.opencode/plugin/` → `.opencode/plugins/`
   - `.opencode/skill/` → `.opencode/skills/`

2. **New Hook Implementation:**
   - `chat.message` - UserPromptSubmit equivalent for user input interception

This aligns PAI-OpenCode with PAI vanilla naming conventions.

### Documentation

- Full re-audit: `.claude/MEMORY/projects/pai-opencode/RE-AUDIT-2026-01-20.md`
- Learning: DeepWiki repository verification rules

---

## [1.0.0] - TBD

### Release - PAI-OpenCode v1.0.0 Public Release

**The community port of PAI 2.3 to OpenCode is now publicly available.**

This release marks the completion of all planned milestones (v0.1 - v0.9.1) and delivers a fully functional PAI 2.3 installation on OpenCode.

### Highlights

- **Complete PAI 2.3 Functionality** - All core features ported to OpenCode
- **20+ Skills** with native lazy loading (94% token reduction vs always-loaded)
- **7 Named Agents** (Intern, Engineer, Architect, Researcher, Designer, Pentester, Writer)
- **Plugin Adapter** with security blocking and context injection
- **Converter Tool** for migrating existing PAI installations (767 files in 5 seconds)
- **Comprehensive Documentation** for getting started and contributing

### What's Included

| Component | Description |
|-----------|-------------|
| Skills System | Native OpenCode lazy loading with progressive disclosure |
| Agent Delegation | Task API for AI-to-Agent, @syntax for User-to-Agent |
| Plugin Adapter | Security validation + context injection |
| Converter Tool | Automated PAI → OpenCode migration |
| Memory System | PAI 2.3 MEMORY/ structure with History, Learning, Signals |

### Getting Started

```bash
git clone https://github.com/Steffen025/pai-opencode.git
cd pai-opencode
bun install
opencode
```

See [README.md](README.md) for complete installation guide.

### Acknowledgments

Thanks to [Daniel Miessler](https://github.com/danielmiessler) for creating PAI and making this port possible.

---

## [0.9.1] - 2026-01-19

### Fixed
- **PAIAGENTSYSTEM.md Correction:** Previous documentation was WRONG about agent invocation
  - **WRONG claim:** `Task({subagent_type: "Architect"})` does not work
  - **TRUTH:** `Task({subagent_type: "Architect"})` WORKS and creates clickable sessions
  - Verified through manual testing in OpenCode

### Changed
- **PAIAGENTSYSTEM.md:** Complete rewrite based on verified test results
  - Documented TWO invocation contexts: AI-to-Agent vs User-to-Agent
  - AI uses `Task({subagent_type: "Name"})` for agent delegation
  - User uses `@agentname` syntax in input field
  - `@agentname` in AI response is just text, NOT an invocation

### Added
- **Learning Document:** `.opencode/MEMORY/Learning/2026-01-19_opencode-agent-invocation.md`
  - Captures the verified invocation patterns
  - Prevents future confusion

### Test Results (Verified 2026-01-19)
| Method | Result | UI Behavior |
|--------|--------|-------------|
| `Task({subagent_type: "Intern"})` | ✅ Works | Clickable session |
| `Task({subagent_type: "Architect"})` | ✅ Works | Clickable session |
| `@architect` in AI response | ❌ Nothing | No agent called |
| User types `@architect` in input | ✅ Works | Agent invoked |

## [0.9.0] - 2026-01-19

### Fixed
- **Agent Model Format:** OpenCode `ProviderModelNotFoundError` when using `@agent` delegation
  - Root cause: Agent files had `model: opus` instead of `model: anthropic/claude-opus-4-5`
  - Converter now maps model names to provider/model format automatically
- **CORE Skill Configuration:** Updated to reference `opencode.json` instead of `settings.json`

### Added
- **Cost-Aware Model Assignment:** Different agent types get appropriate model tiers
  - `intern`, `explore` agents → Haiku (fast, cheap for parallel grunt work)
  - All other named agents → Sonnet (balanced cost/capability for implementation)
  - PAI main orchestrator uses Opus (not in agent files)
- **Model Mapping in Converter:** Automatic conversion from simple names to provider/model format:
  - `opus` → `anthropic/claude-opus-4-5`
  - `sonnet` → `anthropic/claude-sonnet-4-5`
  - `haiku` → `anthropic/claude-haiku-4-5`

### Changed
- All 13 agent files updated with correct model format:
  - `intern.md` → `anthropic/claude-haiku-4-5`
  - All others → `anthropic/claude-sonnet-4-5`
- Converter version bumped to v0.9.0
- CORE SKILL.md updated for OpenCode configuration patterns

### Test Results (Verified 2026-01-19)
| Test | Status |
|------|--------|
| Single agent (`@intern`) | ✅ PASS - No ProviderModelNotFoundError |
| Parallel agents (`@intern` + `@engineer`) | ✅ PASS - Both work independently |
| Model format validation | ✅ 13/13 agents correct (intern=haiku, others=sonnet) |
| AgentFactory prompt generation | ✅ PASS - Creates distinct personalities |
| CORE skill config | ✅ References opencode.json |

### Documentation Updates
- **PAIAGENTSYSTEM.md:** Initial OpenCode architecture documentation
  - *Note: Contained incorrect assumptions, corrected in v0.9.1*
- **AgentFactory:** Installed missing handlebars dependency

## [0.8.0] - 2026-01-18

### Added
- **PAI-to-OpenCode Converter Tool:** Full automated migration from PAI 2.3 to OpenCode
- `tools/pai-to-opencode-converter.ts` - CLI converter with --help and --dry-run support
- Settings translation (`.claude/settings.json` → `opencode.json`)
- Skills translation (`.claude/skills/` → `.opencode/skill/`)
- Agents translation (`.claude/agents/` → `.opencode/agent/`)
- MEMORY copy with automatic path replacements
- Migration report generation with file counts and validation status
- OpenCode integration test validation (startup check + skill recognition)

### Translation Features
| Source | Target | Function |
|--------|--------|----------|
| `.claude/settings.json` | `opencode.json` | Settings schema mapping |
| `.claude/skills/` | `.opencode/skill/` | Path + frontmatter fixes |
| `.claude/agents/` | `.opencode/agent/` | Color + model conversion |
| `.claude/MEMORY/` | `.opencode/MEMORY/` | Path replacement |

### Fixed
- **Settings Schema:** Rewrote to match OpenCode format (`model: provider/id`)
- **Settings Location:** Fixed to output at project root (not `.opencode/`)
- **Agent Colors:** Convert named colors to hex (`cyan` → `#00FFFF`)
- **YAML Frontmatter:** Auto-quote descriptions with special characters
- **PAI-Specific Fields:** Remove `voiceId`, `permissions` from agents
- **Path Replacements:** `.claude/` → `.opencode/`, `skills/` → `skill/`

### Test Results
| Test | Status |
|------|--------|
| PAI v2.3 vanilla conversion | ✅ 767 files |
| OpenCode startup | ✅ PASS |
| Skill recognition | ✅ 20/20 skills |
| Settings schema | ✅ PASS |
| Agent conversion | ✅ PASS |
| MEMORY migration | ✅ PASS |

### Key Learnings (OpenCode Schema)
1. **Settings Model Format:** Use `anthropic/claude-sonnet-4-5` not `sonnet`
2. **Settings Location:** `opencode.json` goes at project root, not `.opencode/`
3. **Agent Colors:** Must use hex format, not color names
4. **YAML Quoting:** Special chars in frontmatter need auto-quoting
5. **Field Removal:** PAI-specific fields must be removed (voiceId, permissions)

### Migration Output
```
Converted 767 files:
- Skills: .claude/skills/ → .opencode/skill/
- Agents: .claude/agents/ → .opencode/agent/
- Settings: .claude/settings.json → opencode.json
- MEMORY: .claude/MEMORY/ → .opencode/MEMORY/
```

### Constitution
- Updated to reflect v0.8.0 converter completion
- Phase 2 milestone achieved: Full PAI 2.3 → OpenCode migration tooling

## [0.7.0] - 2026-01-18

### Added
- **Plugin Adapter Foundation:** Unified plugin architecture for PAI-to-OpenCode translation
- `pai-unified.ts` - Single unified plugin combining all PAI hook functionality
- `lib/file-logger.ts` - TUI-safe file-only logging (NEVER uses console.log)
- `handlers/context-loader.ts` - Loads CORE skill context for chat injection
- `handlers/security-validator.ts` - Security validation with block/confirm/allow actions
- `adapters/types.ts` - Shared TypeScript interfaces for plugin handlers
- `tsconfig.json` - TypeScript configuration for plugin development
- `TEST-RESULTS-v0.7.md` - Comprehensive test documentation

### Plugin Hook Mappings
| PAI Hook | OpenCode Plugin Hook | Function |
|----------|---------------------|----------|
| SessionStart | `experimental.chat.system.transform` | Context injection |
| PreToolUse exit(2) | `tool.execute.before` + throw Error | Security blocking |
| PreToolUse | `tool.execute.before` | Args modification |
| PostToolUse | `tool.execute.after` | Learning capture |
| Stop | `event` | Session lifecycle |

### Fixed
- **TUI Corruption:** All logging now uses file-only logging to `/tmp/pai-opencode-debug.log`
- **Type Safety:** Full TypeScript support with OpenCode plugin type definitions
- **Security Blocking:** Now works correctly via `tool.execute.before` hook
- **OpenCode API Discovery:** Args are in `output.args`, not `input.args` (documented)
- **Tool Name Case Sensitivity:** Normalized to lowercase for reliable matching
- **Regex Patterns:** Fixed parent traversal pattern (`rm -rf ../`)

### Test Results (All Passing)
| Test | Status |
|------|--------|
| Plugin Load | ✅ PASS |
| Context Injection | ✅ PASS |
| Security Blocking | ✅ PASS |
| Logging | ✅ PASS |

### Key Learnings (OpenCode API)
1. **Args Location:** In `tool.execute.before`, args are in `output.args`, NOT `input.args`
2. **Blocking Method:** Throw an Error to block commands (not `permission.ask`)
3. **Tool Names:** OpenCode passes lowercase (`bash`), not PascalCase (`Bash`)

### Deprecated
- Moved old plugins to `plugin/_deprecated/`:
  - `pai-post-tool-use.ts` (replaced by unified plugin)
  - `pai-session-lifecycle.ts` (replaced by unified plugin)

### Constitution
- Updated to v1.2.0 with Plugin Adapter Architecture documentation
- Hook System section expanded with OpenCode mappings
- TUI-safe Logging documented as Technical Constraint
- Phase Planning updated (Phase 2 = DONE, Phase 3 = Plugin Adapter)

### Technical Details
- Plugin structure follows unified pattern for easier maintenance
- Security validator supports dangerous (block) and warning (confirm) patterns
- Context loader supports SKILL.md, SYSTEM/, and USER/TELOS/ loading
- All handlers are async and error-resilient (fail-open for security)

## [0.6.0] - 2026-01-18

### Breaking Changes
- Renamed `history/` to `MEMORY/` (PAI 2.3 alignment)
- Restructured MEMORY subdirectories to match PAI 2.3 standard

### Added
- **PAI 2.3 Alignment:** Repository structure now follows upstream PAI 2.3 patterns
- `MEMORY/` directory with PAI 2.3 subdirectories:
  - `History/` - Session transcripts (was: sessions/)
  - `LEARNING/` - Captured learnings (was: learnings/)
  - `WORK/` - Active work sessions (was: execution/)
  - `Signals/` - Rating signals (NEW)
  - `PAISYSTEMUPDATES/` - System updates (NEW)
- CORE skill SYSTEM/USER split:
  - `SYSTEM/` - System docs (updated on upgrades)
  - `USER/` - User config (never overwritten)
  - `USER/TELOS/` - Personal context
  - `WORK/` - Active work sessions
  - `Tools/` - TypeScript tools

### OpenCode Constraints Preserved
- `skill/` remains singular (OpenCode requirement)
- `plugin/` remains singular (OpenCode requirement)
- `agent/` remains singular (OpenCode requirement)

### Known Issues
- **TUI Corruption:** Console output from plugins corrupts OpenCode TUI
- **Plugin System:** Event handling needs further development
- These issues existed before v0.6.0 and will be addressed in future releases

### Migration Guide
Users of previous versions need to:
1. Rename `.opencode/history/` to `.opencode/MEMORY/`
2. Rename subdirectories: sessions→History, learnings→LEARNING, execution→WORK
3. Move decisions/, research/, raw-outputs/ into WORK/
4. Create SYSTEM/ and USER/ directories in skill/CORE/

## [0.5.0] - 2026-01-03

### Added
- Plugin infrastructure with two skeleton plugins
- `pai-post-tool-use.ts` - Captures tool execution events via `tool.execute.after` hook
- `pai-session-lifecycle.ts` - Captures session events via generic `event` hook
- Debug logging to `/tmp/pai-plugin-debug.log`
- Documentation: `docs/PLUGIN-ARCHITECTURE.md` and `docs/EVENT-MAPPING.md`

### Technical Details
- Uses `@opencode-ai/plugin` v1.0.218
- Hooks return Hooks object directly (no wrapper)
- File-only logging (no console.log to avoid TUI corruption)
- Event payload structures documented with TypeScript interfaces

### Scope
- **IN SCOPE:** 2 core plugins validating the pattern
- **DEFERRED to v0.6:** Additional plugins (pre-tool-use, user-prompt, context-lifecycle)
- **DEFERRED to v0.6:** JSONL storage, session summaries, history directory structure

### Research
- Plugin events verified: `tool.execute.after`, `session.created`, `session.idle`
- Non-existent events identified: `task.complete`, `session.end` DO NOT exist
- Research documented in `~/.claude/history/projects/jeremy-2.0-opencode/research/2026-01-02_opencode-plugin-events-verification.md`

## [0.5.0] - 2026-01-01

### Added
- `docs/HISTORY-SYSTEM.md` - Complete session storage documentation
- OpenCode session storage location and structure documentation
- Session data format specification with JSON examples
- Session ID format explanation
- Persistence behavior documentation
- Session retrieval methods (CLI commands and TUI)

### Documented
- OpenCode session storage at `~/.local/share/opencode/storage/`
- Hierarchical session structure (session → message → part)
- Custom session ID encoding (`ses_`, `msg_`, `prt_` prefixes)
- Dual-level organization (project-hash and global)
- Comparison to Claude Code history system
- Out of scope items for v1.0 (PAI knowledge layer deferred to Phase 2)

### Acceptance Tests
- AC-1: Session storage location documented ✅
- AC-2: Session transcripts captured correctly ✅
- AC-3: Sessions persist across restarts ✅
- AC-4: Session content retrievable ✅
- AC-5: No data loss during sessions ✅
- AC-6: Session capture meets functional requirements ✅

## [0.4.2] - 2026-01-01

### Added
- Agent Profile System: Switch AI providers with a single command
- 3 ready-to-use profiles: `anthropic`, `openai`, `local` (Ollama)
- `tools/apply-profile.ts` CLI tool for profile switching
- Profile storage in `.opencode/profiles/` directory

### Usage
```bash
# List available profiles
bun tools/apply-profile.ts

# Apply a profile (updates all 7 agent files)
bun tools/apply-profile.ts local      # Switch to Ollama
bun tools/apply-profile.ts openai     # Switch to GPT-4o
bun tools/apply-profile.ts anthropic  # Switch to Claude (default)
```

### Profiles
- `anthropic.yaml` - Claude Haiku 4.5 (intern) + Sonnet 4.5 (others)
- `openai.yaml` - GPT-4o-mini (intern) + GPT-4o (others)
- `local.yaml` - Llama 3.2 + DeepSeek-Coder (engineer)

## [0.4.1] - 2026-01-01

### Added
- Agent UI-Picker Support: Created 7 agent files in `.opencode/agent/` directory
- Agent files now visible in OpenCode's `/agents` UI picker with color coding
- All PAI agents now discoverable through both `@agent-name` syntax and UI

### Fixed
- Agent visibility issue in OpenCode UI picker (agents were functional but invisible)
- Color format: Use hex colors (`#3B82F6`) instead of color names
- Model format: Use `anthropic/claude-haiku-4-5` instead of `haiku`
- Descriptions shortened for UI picker display

### Agents Created
- `intern.md` - Fast parallel research, analysis, verification (Haiku 4.5)
- `engineer.md` - Code implementation, debugging, testing (Sonnet 4.5)
- `architect.md` - System design, PRDs, technical specs (Sonnet 4.5)
- `researcher.md` - Web research, source verification, analysis (Sonnet 4.5)
- `designer.md` - UX/UI design, visual systems, accessibility (Sonnet 4.5)
- `pentester.md` - Security testing, vulnerability assessment (Sonnet 4.5)
- `writer.md` - Content creation, docs, technical writing (Sonnet 4.5)

### Documentation
- Updated CHANGELOG.md with v0.4.0 and v0.4.1 entries
- Updated docs/AGENT-DELEGATION.md with UI picker information
- Removed "Known Limitation" from README.md

## [0.4.0] - 2026-01-01

### Added
- Agent Delegation: Implemented hybrid Task wrapper for PAI agent compatibility
- 7 core PAI agents migrated to OpenCode format
- Task API wrapper with <10ms overhead
- Agent routing and delegation system
- Comprehensive unit tests (19 passing tests)

### Changed
- Agent invocation uses OpenCode's native `@agent-name` syntax
- Task wrapper provides backward compatibility with PAI's Task tool pattern

### Technical
- Task wrapper delegates to OpenCode's native agent system
- Model selection preserved (haiku for interns, sonnet for specialists)
- Agent-specific voice IDs maintained for voice feedback integration

### Testing
- 19 unit tests covering Task wrapper functionality
- All tests passing with <10ms overhead validated

## [0.3.0] - 2026-01-01

### Added
- Skills Translation: Migrated PAI 2.0 skills to OpenCode native format
- OpenCode lazy loading support for 3-tier progressive disclosure
- CORE skill migrated to `.opencode/skill/CORE/`
- CreateSkill migrated to `.opencode/skill/CreateSkill/`
- skill-migrate.ts tool for automated skill migration
- Token reduction validation (≥90% achieved via progressive disclosure)

### Changed
- Skills path from `.claude/skills/` to `.opencode/skill/` (OpenCode native)
- Adopted OpenCode native lazy loading mechanism

### Fixed
- Corrected OpenCode directory naming: `.opencode/skill/` (singular, not plural)
- Removed `.opencode/tool/` directory (OpenCode auto-loads files from this path)
- Moved `skill-migrate.ts` to `tools/` outside `.opencode/` to prevent auto-execution

### Learned
- OpenCode enforces singular naming: `.opencode/skill/` not `.opencode/skills/`
- Files in `.opencode/tool/` are auto-loaded by OpenCode - use for native tools only
- PAI 2.0 and OpenCode SKILL.md formats are 100% identical (no translation needed)

### Documentation
- Added SKILLS-MIGRATION.md guide
- Documented format compatibility (SKILL.md format unchanged)
- Added token reduction report (90%+ reduction validated)

## [0.2.0] - 2026-01-01

### Added
- Vanilla OpenCode installation and configuration
- kai-core-install pack installation
- Git repository initialization
- Basic workspace structure (.opencode/, docs/, vendor/)
- Constitution v3.6.0
- ROADMAP v3.1.0

### Infrastructure
- Established OpenCode workspace at ~/Workspace/github.com/Steffen025/pai-opencode
- Git repository with main branch
- Public repository preparation for Phase 1 (community contributions)

## [0.1.0] - 2026-01-01

### Added
- Initial project conception
- Project plan and research phase
- PAI-OpenCode project structure
- Constitution v3.0.0 draft
- ROADMAP v3.0.0 draft
