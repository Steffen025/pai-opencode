# Changelog

All notable changes to PAI-OpenCode will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.0] - 2026-01-18

### Added
- **Plugin Adapter Foundation:** Unified plugin architecture for PAI-to-OpenCode translation
- `pai-unified.ts` - Single unified plugin combining all PAI hook functionality
- `lib/file-logger.ts` - TUI-safe file-only logging (NEVER uses console.log)
- `handlers/context-loader.ts` - Loads CORE skill context for chat injection
- `handlers/security-validator.ts` - Security validation with block/confirm/allow actions
- `adapters/types.ts` - Shared TypeScript interfaces for plugin handlers
- `tsconfig.json` - TypeScript configuration for plugin development

### Plugin Hook Mappings
| PAI Hook | OpenCode Plugin Hook | Function |
|----------|---------------------|----------|
| SessionStart | `experimental.chat.system.transform` | Context injection |
| PreToolUse exit(2) | `permission.ask` | Security blocking |
| PreToolUse | `tool.execute.before` | Args modification |
| PostToolUse | `tool.execute.after` | Learning capture |
| Stop | `event` | Session lifecycle |

### Fixed
- **TUI Corruption:** All logging now uses file-only logging to `/tmp/pai-opencode-debug.log`
- **Type Safety:** Full TypeScript support with OpenCode plugin type definitions

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
