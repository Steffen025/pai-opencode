# PAI 2.3 → OpenCode Migration Roadmap

**Version:** 4.0.0
**Based on:** Constitution v3.2.0, SYNTHESIS.md, PAI 2.3 Vanilla
**Created:** 2025-12-31
**Last Updated:** 2026-01-18 (v0.7.0 Plugin Adapter Complete)
**Author:** Steffen (with PAI assistance)

---

## Project Scope

**This is a PUBLIC community contribution.**

| Aspect | Definition |
|--------|------------|
| **Goal** | Port Daniel Miessler's PAI 2.0 from Claude Code to OpenCode |
| **Output** | Working PAI 2.0 installation on OpenCode platform |
| **Visibility** | PUBLIC - Shareable with the community |
| **Identity** | NONE - Pure vanilla PAI 2.0, no personal customizations |

**What This Is NOT:**
- ❌ NOT Jeremy 2.0 (that's a separate private project)
- ❌ NOT identity-specific (no TELOS, no Ideology)
- ❌ NOT personal customizations

**Why This Matters:**
- Contributes to the PAI community
- Documents the migration process for others
- Creates a reusable foundation for personal extensions
- Validates PAI 2.0 portability claims

---

## Project Structure

```
PUBLIC PROJECT: PAI-OpenCode
├── Repository: github.com/Steffen025/pai-opencode (PUBLIC)
├── Goal: PAI 2.0 working on OpenCode
├── Version: v0.1 → v1.0
└── Output: Documented, shareable migration

PRIVATE PROJECT: Jeremy 2.0 (SEPARATE)
├── Repository: github.com/Steffen025/jeremy-2.0 (PRIVATE)
├── Goal: Jeremy identity on PAI-OpenCode
├── Dependency: Requires PAI-OpenCode v1.0
└── Scope: TELOS, Ideology, personal customizations
```

---

## Version Definition

**v1.0 = Functional PAI 2.0 on OpenCode**

A complete, working port where:
- Skills load and activate correctly
- Agent delegation works
- History system captures sessions
- Hooks function as plugins
- PAI architecture check passes
- No regressions from Claude Code version

---

## Milestone Overview

| Version | Milestone | Scope | Status |
|---------|-----------|-------|--------|
| **v0.1** | Foundation | Workspace + Git + Research | ✅ DONE |
| **v0.2** | Vanilla Install | PAI 2.0 packs installed | ✅ DONE |
| **v0.3** | Skills Translation | LazyLoad for OpenCode | ✅ DONE |
| **v0.4** | Agent Delegation | Hybrid Task API | ✅ DONE |
| **v0.5** | Plugin Infrastructure | Hook→Plugin skeleton | ✅ DONE |
| **v0.6** | PAI 2.3 Alignment | Structure reset, MEMORY/, CORE split | ✅ DONE |
| **v0.7** | **Plugin Adapter** | Security blocking, context injection, unified plugin | ✅ DONE |
| **v0.8** | **Converter Tool** | PAI→OpenCode translator | ✅ DONE |
| **v0.9** | Integration Testing + Docs | End-to-end validation, public prep | NOT STARTED |
| **v1.0** | **PUBLIC RELEASE** | Community-ready vanilla PAI 2.3 | NOT STARTED |

---

## Post-v1.0: Future Phases

### Phase 2: Local Model Integration (Ollama)

**Goal:** Enable PAI-OpenCode to work with local models via Ollama.

**Why Ollama?**
- Complete data sovereignty
- No API costs
- Offline capability
- Custom model fine-tuning

**Implementation Plan:**
| Task | Effort | Priority |
|------|--------|----------|
| Provider abstraction layer | THOROUGH | HIGH |
| Ollama API integration | STANDARD | HIGH |
| Model selection logic | STANDARD | MEDIUM |
| Performance optimization | THOROUGH | LOW |
| Local embeddings | THOROUGH | LOW |

### Phase 3: Advanced Skills

**Skills from PAI 2.3 to port:**
- pai-algorithm-skill (THE ALGORITHM execution engine)
- pai-agents-skill (AgentFactory + Traits.yaml)
- pai-research-skill (Multi-source research)
- pai-browser-skill (Browser automation)
- pai-art-skill (Visual generation)

---

## v0.1: Foundation ✅ DONE

**Completed:** 2026-01-01

**Deliverables:**
- [x] OpenCode workspace created
- [x] Git architecture configured (origin, upstream, fork)
- [x] Basic directory structure established
- [x] Research phase complete (SYNTHESIS.md)
- [x] Constitution v3.2.0 ratified
- [x] 6 Technical Decisions documented

**Current State:**
```
~/Workspace/GitHub/Steffen025/Jeremy2.0/
├── .opencode/              ← Empty, ready for PAI 2.0
├── .git/                   ← Configured with 3 remotes
└── [research artifacts]
```

---

## v0.2: Vanilla Install ✅ DONE

**Completed:** 2026-01-01

**Technical Decision:** Clean Break (Constitution §IX.1)

**What Was Installed:**
1. PAI 2.0 added as git submodule (pinned to commit 3665390)
2. kai-core-install pack contents deployed
3. skills/CORE and skills/CreateSkill installed
4. tools/PaiArchitecture.ts, SkillSearch.ts, GenerateSkillIndex.ts installed
5. history/ directory structure created

**Deliverables:**
- [x] PAI 2.0 directory structure in `.opencode/`
- [x] Core packs installed (skills, agents, commands)
- [x] No hooks activated yet (deferred to v0.7)
- [x] Git submodule configured and tracked

**Commit:** 07ceecb

---

## v0.3: Skills Translation ✅ DONE

**Completed:** 2026-01-01

**Goal:** Translate PAI skills to use OpenCode's native lazy loading

**Technical Decision:** LazyLoad Translation (Constitution §IX.3)

**Why This Matters:**
- Claude Code doesn't support lazy loading natively
- Daniel built a workaround for Claude Code
- OpenCode DOES support lazy loading
- We use the superior native mechanism

**Actions:**
1. ✅ Analyzed PAI skill structure (SKILL.md, workflows/, etc.)
2. ✅ Mapped to OpenCode skill format - 100% compatible!
3. ✅ Implemented 3-tier progressive disclosure:
   - Tier 1: Description in frontmatter (51 tokens - always loaded)
   - Tier 2: SKILL.md body (439 tokens - loaded on activation)
   - Tier 3: Reference files (522 tokens - loaded just-in-time)
4. ✅ Translated CORE skill as proof of concept
5. ✅ Created skill migration script (skill-migrate.ts)

**Deliverables:**
- [x] Skill format mapping documented (SKILLS-MIGRATION.md)
- [x] CORE skill translated and validated
- [x] Progressive disclosure working (94.96% token reduction - exceeds target!)
- [x] Skill migration script created and tested
- [x] CreateSkill migrated as second validation
- [x] All 8 acceptance tests passed
- [x] Quality Gate 0.3 validation complete

**Acceptance Criteria:**
- ✅ Skills load on-demand, not all at startup
- ✅ Token usage dramatically reduced (94.96% vs 90% target)
- ✅ USE WHEN triggers format validated

**Key Findings:**
- PAI 2.0 and OpenCode skill formats are 100% identical
- Migration is simple file copy operation
- Token reduction exceeds expectations
- Automation tool makes batch migration trivial

**Documentation:**
- `docs/SKILLS-MIGRATION.md` - Complete migration guide
- `docs/ACCEPTANCE_TESTS.md` - All 8 tests validated
- `docs/GATE-0.3-VALIDATION.md` - Quality gate report

---

## v0.4: Agent Delegation

**Goal:** Implement hybrid agent delegation (Task API + OpenCode subagents)

**Technical Decision:** Hybrid Approach (Constitution §IX.2)

**Architecture:**
```
Complex Tasks → Task Tool API (PAI-style)
Simple Tasks  → OpenCode native subagents
Pack Install  → Task Tool (maintains compatibility)
```

**Actions:**
1. Analyze PAI agent definitions (intern, engineer, architect, etc.)
2. Map Task tool API to OpenCode equivalent
3. Implement Task tool wrapper for complex delegation
4. Enable OpenCode subagent fallback for simple tasks
5. Test agent routing with sample tasks

**Deliverables:**
- [ ] Agent definitions translated
- [ ] Task tool wrapper functional
- [ ] Complex delegation working
- [ ] Simple task routing to OpenCode subagents

**Acceptance Criteria:**
- `Task({ subagent_type: "intern", ... })` works
- Parallel agent execution supported
- PAI packs can be installed (they use Task tool)

---

## v0.5: Plugin Infrastructure

**Goal:** Translate Claude Code hooks to OpenCode plugins (8 core plugins)

**Technical Decision:** Plugin-First Architecture (Constitution §IX.4)

**SPLIT/INSERT NOTE (2026-01-02):** Originally planned as "History System" but dependencies were inverted. History System REQUIRES plugin infrastructure to work. This milestone was INSERTED after discovery that event capture must come before storage.

**Why This Matters:**
- History System relies on event capture (PostToolUse, SessionEnd, etc.)
- Claude Code uses hooks for event capture
- OpenCode uses plugins for event capture
- **Dependency:** Plugins (capture) → History (storage)
- Original ROADMAP had inverted dependency - corrected via Split/Insert

**Research Completed (2026-01-02):**
- ✅ Plugin events verified: `tool.execute.after`, `session.created`, `session.idle`
- ✅ Non-existent events identified: `task.complete`, `session.end` DO NOT exist
- ✅ Event name corrections applied throughout documentation

**Hook → Plugin Mapping (8 Core Plugin Equivalents for v0.5):**

| Claude Code Hook | OpenCode Plugin Event | Status | v0.5 Priority |
|------------------|----------------------|--------|---------------|
| PostToolUse | `tool.execute.after` | VERIFIED ✅ | **HIGH** |
| SessionStart | `session.created` | VERIFIED ✅ | **HIGH** |
| Stop | `session.idle` | VERIFIED ✅ | **HIGH** |
| PreToolUse | `tool.execute.before` | RESEARCH | **MEDIUM** |
| SubagentStop | Filter `tool.execute.after` | WORKAROUND | **REQUIRED** |
| SessionEnd | Filter `session.idle` | WORKAROUND | **REQUIRED** |
| UserPromptSubmit | `message.updated` (filter: user) | WORKAROUND | **REQUIRED** |
| PreCompact | `experimental.session.compacting` | VERIFIED ✅ | **REQUIRED** |

**v0.5 Scope:** 8 core plugin equivalents (PostToolUse, SessionStart, Stop, PreToolUse, SubagentStop workaround, SessionEnd workaround, UserPromptSubmit workaround, PreCompact).

**Actions:**
1. Complete plugin capability research (IN PROGRESS)
2. Document event mapping
3. Adapt each hook as plugin
4. Test blocking behavior
5. Validate all 8 events covered (workarounds for missing events)

**Deliverables:**
- [ ] Plugin research complete
- [ ] Event mapping documented
- [ ] All hooks adapted as plugins (or workarounds documented)
- [ ] Blocking behavior working
- [ ] No regression in functionality

**Acceptance Criteria:**
- All hook functionality preserved (or documented limitations)
- Plugins load without errors
- Security validation intact
- Context loading correct

---

## v0.6: History System

**Goal:** Implement OpenCode-native session storage with INDEX.json and CLI tools

**Technical Decision:** OpenCode Sessions for v1.0 (Constitution §IX.5)

**SPLIT/INSERT NOTE (2026-01-02):** Originally v0.5, deferred to v0.6 because History System REQUIRES plugin infrastructure from v0.5.

**Why Deferred:**
- History System needs event capture (PostToolUse, Stop, SessionStart)
- Event capture happens via plugins (v0.5)
- Plugins must exist first → History System second
- Original ROADMAP had inverted dependency - corrected via Split/Insert

**Scope Clarification:**
- v1.0 includes COMPLETE History System (OpenCode sessions + PAI knowledge layer)
- PAI knowledge layer (learnings/, research/, decisions/, ideas/, projects/) is CORE v1.0 functionality
- Focus: Complete session storage, INDEX.json, `session-search` CLI, learning extraction, research tracking

**Research Completed (2026-01-01):**
- ✅ OpenCode session storage location documented
- ✅ Session transcripts captured correctly
- ✅ Session persistence verified
- ✅ CLI/TUI retrieval methods documented
- ✅ Documentation: `docs/HISTORY-SYSTEM.md`

**Two-Layer Architecture:**

**Layer 1: OpenCode Sessions (Native)**
- Location: `~/.local/share/opencode/storage/`
- Format: Hierarchical JSON (session → message → part)
- Capture: Automatic by OpenCode
- Retrieval: `opencode -c`, `/sessions` TUI

**Layer 2: PAI Knowledge Management (Plugin-Driven)**
- Location: `~/.opencode/history/`
- Components:
  - `learnings/` - Problem-solving narratives
  - `research/` - Investigation results
  - `decisions/` - Architecture Decision Records
  - `ideas/` - Quick thought captures
  - `projects/` - Multi-session project tracking
- Capture: Via plugins (PostToolUse, SessionEnd, Stop)
- Retrieval: `session-search` CLI tool

**Actions:**
1. Verify plugin infrastructure complete (dependency: v0.5)
2. Implement PAI knowledge layer directories
3. Create session summarization plugin (uses SessionEnd equivalent)
4. Create learning extraction plugin (uses PostToolUse)
5. Port `session-search` CLI tool
6. Test complete workflow (capture → store → retrieve)

**Deliverables:**
- [ ] Plugin-based event capture working
- [ ] PAI knowledge directories created
- [ ] Session summarization functional
- [ ] Learning extraction working
- [ ] `session-search` tool ported
- [ ] No data loss, no regressions

**Acceptance Criteria:**
- OpenCode sessions captured automatically
- PAI knowledge layer populated via plugins
- Session search finds historical work
- All PAI history features preserved

---

## v0.7: Plugin Adapter ✅ DONE

**Completed:** 2026-01-18

**Goal:** Complete the plugin adapter with working security blocking, context injection, and unified plugin architecture.

**Deliverables:**
- [x] `pai-unified.ts` - Single unified plugin combining all PAI hook functionality
- [x] `handlers/security-validator.ts` - Block dangerous commands via `tool.execute.before`
- [x] `handlers/context-loader.ts` - Inject CORE skill at session start
- [x] `lib/file-logger.ts` - TUI-safe file-only logging
- [x] `adapters/types.ts` - Shared TypeScript interfaces
- [x] All 4 tests passing (Plugin Load, Context Injection, Security Blocking, Logging)

**Key Technical Discoveries:**
- Args are in `output.args`, NOT `input.args` in `tool.execute.before`
- Throw Error to block commands (not `permission.ask`)
- Tool names are lowercase (`bash`, not `Bash`)

**Test Results:**
| Test | Status |
|------|--------|
| Plugin Load | ✅ PASS |
| Context Injection | ✅ PASS |
| Security Blocking | ✅ PASS |
| Logging | ✅ PASS |

---

## v0.8: Converter Tool ✅ DONE

**Completed:** 2026-01-18

**Goal:** Create PAI 2.0 → OpenCode translation tool

**Technical Decision:** Clean Break + Converter (Constitution §IX.1)

**Deliverables:**
- [x] `tools/pai-to-opencode-converter.ts` - CLI converter tool
- [x] Settings translation (`.claude/settings.json` → `opencode.json`)
- [x] Skills translation (`.claude/skills/` → `.opencode/skill/`)
- [x] Agents translation (`.claude/agents/` → `.opencode/agent/`)
- [x] MEMORY copy with path updates
- [x] Migration report generation
- [x] Built-in --help and --dry-run support

**Test Results:**
- Tested with PAI v2.3 vanilla: **767 files converted** ✅
- Path replacements: `.claude/` → `.opencode/`, `skills/` → `skill/` ✅
- Settings schema mapping to OpenCode format ✅
- YAML frontmatter quoting for special chars ✅
- Agent color conversion (named → hex) ✅
- **OpenCode integration test PASSED** ✅
  - OpenCode startup successful
  - All 20 skills recognized and loadable
  - Config validation passed

**Fixes Applied During Integration Testing:**
| Issue | Fix |
|-------|-----|
| `opencode.json` schema wrong | Rewrote to match OpenCode schema (`model: provider/id`) |
| `opencode.json` in wrong location | Fixed to output at project root |
| Agent colors (named vs hex) | Added color conversion (`cyan` → `#00FFFF`) |
| YAML parsing errors | Auto-quote descriptions with special chars |
| PAI-specific fields | Remove `voiceId`, `permissions` from agents |

**What Gets Converted:**
| Source | Target | Method |
|--------|--------|--------|
| `settings.json` | `opencode.json` | Schema mapping |
| `skills/` | `skill/` | Copy + path update + YAML sanitize |
| `agents/` | `agent/` | Copy + color conversion + field removal |
| `MEMORY/` | `MEMORY/` | Direct copy |

**What Requires Manual Work:**
- `hooks/` → `plugin/` (architecture differs - documented in MIGRATION-REPORT.md)

**Usage:**
```bash
bun run tools/pai-to-opencode-converter.ts --source ~/.claude --target .opencode
bun run tools/pai-to-opencode-converter.ts --dry-run --verbose  # Preview
bun run tools/pai-to-opencode-converter.ts --help               # Help
```

---

## v0.9: Integration Testing + Documentation

**Goal:** Validate complete PAI 2.0 functionality on OpenCode and prepare public release

**Actions:**
1. End-to-end workflow testing
2. Skill activation testing
3. Agent delegation testing
4. History capture testing
5. Plugin behavior testing
6. Architecture check validation
7. Performance comparison (token usage, latency)

**Test Matrix:**

| Component | Test | Pass/Fail |
|-----------|------|-----------|
| Skills | CORE loads on session start | |
| Skills | USE WHEN triggers activate skill | |
| Skills | Progressive disclosure reduces tokens | |
| Agents | Task tool delegates correctly | |
| Agents | Parallel agents execute | |
| Agents | Agent responses captured | |
| History | Sessions persist | |
| History | Transcripts retrievable | |
| Plugins | SessionStart equivalent works | |
| Plugins | PreToolUse blocking works | |
| Plugins | PostToolUse capture works | |
| Architecture | `PaiArchitecture.ts check` passes | |

**Deliverables:**
- [ ] All tests passing
- [ ] No regressions identified
- [ ] Performance acceptable
- [ ] Edge cases documented

**Acceptance Criteria:**
- 100% of core functionality working
- No blocking issues
- Ready for documentation

---

## v1.0: PUBLIC RELEASE

**Goal:** Release PAI 2.0 on OpenCode to the community

**Prerequisites:**
- [ ] All v0.x milestones complete
- [ ] Integration tests passing
- [ ] Documentation reviewed
- [ ] No sensitive content
- [ ] License appropriate (check PAI license)

**Release Checklist:**
- [ ] Final architecture check passes
- [ ] All documentation complete
- [ ] Repository cleaned (no personal artifacts)
- [ ] README prominent and clear
- [ ] Installation tested on fresh system
- [ ] Announce to PAI community

**Deliverables:**
- Public GitHub repository: `pai-opencode`
- Complete documentation
- Working PAI 2.0 on OpenCode
- Migration guide for others

**Success Criteria:**
- Others can follow the guide and migrate
- No personal/private data exposed
- Contributes value to PAI community
- Foundation ready for Jeremy 2.0

---

## Post-v1.0: Jeremy 2.0 (PRIVATE)

**SEPARATE PROJECT - NOT PART OF THIS ROADMAP**

After v1.0 is released publicly, Jeremy 2.0 development begins:

| Milestone | Scope |
|-----------|-------|
| Jeremy 0.1 | TELOS pack integration |
| Jeremy 0.2 | Ideology pack integration |
| Jeremy 0.3 | German Business Context |
| Jeremy 0.4 | SpecFirst workflow |
| Jeremy 0.5 | Voice system |
| Jeremy 1.0 | Complete Jeremy identity on PAI-OpenCode |

**Repository:** `github.com/Steffen025/jeremy-2.0` (PRIVATE)
**Dependency:** PAI-OpenCode v1.0

---

## Technical Decisions Reference

All decisions documented in Constitution v3.2.0 Section IX:

| # | Decision | Choice | Milestone |
|---|----------|--------|-----------|
| 1 | Configuration | Clean Break + Converter | v0.6 |
| 2 | Agent Delegation | Hybrid (Task API + subagents) | v0.4 |
| 3 | Skills Loading | LazyLoad Translation | v0.3 |
| 4 | Hook System | DEFERRED (needs research) | v0.7 |
| 5 | History System | OpenCode-native for v1.0 | v0.5 |
| 6 | Directory Structure | Clean Break to `.opencode/` | v0.1 ✅ |

**Guiding Principle:** Import capability, not backwards compatibility.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Plugin system can't replicate hooks | Medium | High | Research in v0.7, fallback options |
| OpenCode API changes | Low | Medium | Pin to stable version |
| PAI 2.0 upstream changes | Medium | Low | Converter tool handles translation |
| Documentation incomplete | Low | Medium | Review before release |
| Personal data leak | Low | Critical | Thorough review before public |

---

## Progress Tracking

### Current Status

| Milestone | Status | Blocker |
|-----------|--------|---------|
| v0.1 Foundation | ✅ DONE | - |
| v0.2 Vanilla Install | ✅ DONE | - |
| v0.3 Skills Translation | ✅ DONE | - |
| v0.4 Agent Delegation | ✅ DONE | - |
| v0.5 Plugin Infrastructure | ✅ DONE | - |
| v0.6 PAI 2.3 Alignment | ✅ DONE | - |
| v0.7 Plugin Adapter | ✅ DONE | - |
| v0.8 Converter Tool | ✅ DONE | - |
| v0.9 Integration + Docs | NOT STARTED | v0.8 |
| v1.0 Release | NOT STARTED | v0.9 |

### Dependency Graph

```
v0.1 ────┬──→ v0.2 ──┬──→ v0.3 ──→ v0.4 ──┐
         │           │                     │
         │           │                     │
         │           │                     │
         │           │     ┌───────────────┘
         │           │     │
         │           │     v
         │           │   v0.5 (Plugin Infrastructure) ✅ COMPLETE
         │           │     │
         │           │     v
         │           │   v0.6 (History System - needs v0.5)
         │           │     │
         │           │     │
         │           v     v
         └──→ v0.7 (Converter - needs v0.3, v0.4)
                     │
                     v
                   v0.8 ──→ v0.9 ──→ v1.0
```

---

## Community Updates

**Discussion Thread:** [PAI-OpenCode on danielmiessler/PAI](https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions/286)

We committed to posting updates at key milestones. Track progress here:

| Milestone | Update Required | Status | Posted |
|-----------|-----------------|--------|--------|
| v0.1 | Foundation complete, project announced | ✅ DONE | 2026-01-01 |
| v0.5 | Plugin Infrastructure complete | ✅ DONE | 2026-01-03 |
| v0.6 | History system complete | ⏳ Pending | - |
| v0.9 | Documentation ready | ⏳ Pending | - |
| v1.0 | **PUBLIC RELEASE** 🎉 | ⏳ Pending | - |

**Update Template:**
```markdown
## 🚀 Milestone Update: v0.X - [Milestone Name]

**Status:** Complete ✅

**What's New:**
- [Key achievement 1]
- [Key achievement 2]

**Next Up:** v0.Y - [Next Milestone]

**Repository:** [github.com/Steffen025/pai-opencode](https://github.com/Steffen025/pai-opencode)
```

---

## Version History

| Version | Date | Change |
|---------|------|--------|
| 1.0.0 | 2025-12-31 | Initial roadmap |
| 2.0.0 | 2025-12-31 | Aligned with Constitution v3.0.0 |
| 2.1.0 | 2026-01-01 | Hook/Plugin incompatibility discovery |
| 2.2.0 | 2026-01-01 | Research complete, estimates added |
| **3.0.0** | 2026-01-01 | **COMPLETE REWRITE** - Public/Private split. v1.0 = Pure PAI 2.0 → OpenCode port (PUBLIC). Jeremy identity moved to separate private project. New versioning: v0.1-v0.9 milestones to v1.0 release. |
| **3.1.0** | 2026-01-01 | Added Community Updates section with milestone tracking for Discussion thread updates. |
| **3.2.0** | 2026-01-02 | **SPLIT/INSERT REORGANIZATION** - v0.5/v0.6 milestones reorganized. v0.5 now Plugin Infrastructure, v0.6 now History System (dependency fix). Deferred features documented (Voice, Observability → v1.x). Event name corrections (session.idle, tool.execute.after). |
| **3.3.0** | 2026-01-02 | **FINAL ROADMAP APPROVAL** - All milestones finalized. Sub-milestones = tracking tool (not separate releases). Split/Insert terminology standardized. Voice/Observability deferred to v1.x. v0.5 scope = 4 core plugins. v0.6 scope = OpenCode sessions only (PAI knowledge layer → v1.x). |
| **3.4.0** | 2026-01-02 | **HOOK MAPPING COMPLETION** - UserPromptSubmit and PreCompact researched via DeepWiki. UserPromptSubmit portable via `message.updated` filter workaround. PreCompact portable via `experimental.session.compacting`. Both moved from Deferred → REQUIRED (v0.5). v0.5 scope expanded to 8 core plugins. |
| **4.0.0** | 2026-01-03 | v0.5.0 COMPLETE - Plugin Infrastructure released |

---

## Deferred Features (Post-v1.0)

**NOT in vanilla PAI 2.0 scope - deferred to v1.x:**

| Feature | Reason for Deferral | Timeline |
|---------|---------------------|----------|
| **Voice System** | Optional feature (if not part of vanilla PAI 2.0) | v1.1+ |
| **Observability Dashboard** | Community plugin phase | v1.2+ |
| **Advanced Plugins** | Token analytics, context pruning beyond 8 core equivalents | v1.x |
| **Daniel Miessler Packs** | Importable post-v1.0 via Converter | Post-release |

**v1.0 Definition:** Pure vanilla PAI 2.0 on OpenCode with COMPLETE History System (8 core plugin equivalents + full PAI knowledge layer: learnings/, research/, decisions/, ideas/, projects/). Extensions and advanced features come in v1.x releases.

**Sub-Milestone Note:** Sub-milestones (e.g., v0.5.1, v0.5.2) are tracking tools within the roadmap, NOT separate SpecFirst sessions. Each minor release (v0.5, v0.6, v0.7) = ONE SpecFirst workflow execution.

---

**ROADMAP v3.3.0 - END OF DOCUMENT**
