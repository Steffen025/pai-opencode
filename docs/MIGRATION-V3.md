# PAI v3.0 Migration Plan for PAI-OpenCode

**From:** PAI Algorithm v0.2.25 (PAI-OpenCode v1.3.2)
**To:** PAI Algorithm v1.4.0 (PAI-OpenCode v2.0.0)
**Upstream:** `danielmiessler/Personal_AI_Infrastructure/Releases/v3.0/`
**Date:** 2026-02-16
**Status:** PLANNED

---

## Executive Summary

PAI v3.0 is a major release that introduces 20+ new features to the Algorithm, a PRD persistence system, 25-capability audit framework, 8 effort levels, and quality gates. This document defines the migration plan for porting v3.0 to the OpenCode platform while respecting platform constraints documented in ADR-001 through ADR-007.

**Target version:** PAI-OpenCode v2.0.0 (semver major: breaking changes to Algorithm format)

---

## Table of Contents

1. [What Changed in v3.0](#1-what-changed-in-v30)
2. [Portability Assessment](#2-portability-assessment)
3. [Migration Phases](#3-migration-phases)
4. [Phase 1: SKILL.md Rewrite](#phase-1-skillmd-rewrite-algorithm-v0225--v140)
5. [Phase 2: PRD System](#phase-2-prd-system)
6. [Phase 3: New Skills](#phase-3-new-skills)
7. [Phase 4: New Plugin Handlers](#phase-4-new-plugin-handlers)
8. [Phase 5: Agents, Docs & Mapping](#phase-5-agents-docs--mapping)
9. [Phase 6: Release v2.0.0](#phase-6-release-v200)
10. [Platform Constraints](#4-platform-constraints)
11. [Risk Register](#5-risk-register)
12. [Validation Checklist](#6-validation-checklist)

---

## 1. What Changed in v3.0

### Algorithm Changes (v0.2.25 → v1.4.0)

| # | Change | Impact | Portable? |
|---|--------|--------|-----------|
| 1 | **Constraint Extraction System** — Mechanical [EX-N] extraction before ISC | Major — New OBSERVE substep | YES |
| 2 | **Self-Interrogation** — 5 structured questions before BUILD | Major — New BUILD gate | YES |
| 3 | **Build Drift Prevention** — Re-read [CRITICAL] ISC before each artifact | Major — BUILD discipline | YES |
| 4 | **Verification Rehearsal** — Simulate violations in THINK | Major — New THINK substep | YES |
| 5 | **Mechanical Verification** — No rubber-stamp PASS, require evidence | Major — VERIFY upgrade | YES |
| 6 | **Effort Levels (8 tiers)** — Replaces FULL/ITERATION/MINIMAL | Breaking — Format restructure | YES (adapt) |
| 7 | **Quality Gates (7 QG checks)** — Must pass before PLAN | Major — New gate | YES |
| 8 | **25-Capability Full Scan Audit** — Replaces Two-Pass selection | Breaking — New format section | YES (adapt) |
| 9 | **PRD System** — Persistent Requirements Documents | Major — New subsystem | YES |
| 10 | **ISC Naming Convention** — `ISC-{Domain}-{N}`, priority/confidence tags | Medium — Naming change | YES |
| 11 | **Loop Mode with Parallel Workers** — `bun algorithm.ts -m loop` | Major — New execution mode | PARTIAL (no Agent Teams) |
| 12 | **Algorithm Reflection JSONL** — Structured Q1/Q2/Q3 learning | Medium — New output | YES |
| 13 | **Agent Teams/Swarm** — `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | Major — New collaboration | NO (Claude Code only) |
| 14 | **Plan Mode Integration** — `EnterPlanMode`/`ExitPlanMode` | Medium — Built-in tool | NO (Claude Code only) |
| 15 | **Start Symbol** — `🤖` → `♻︎` | Minor — Visual change | YES |
| 16 | **OBSERVE Hard Gate** — Thinking-only, no tool calls except TaskCreate | Medium — Phase discipline | YES |
| 17 | **Voice Personality System** — 12 traits in settings.json | Medium — Config addition | YES |
| 18 | **Effort Level Decay** — Across Loop iterations | Medium — Loop behavior | PARTIAL |
| 19 | **AUTO-COMPRESS at 150%** — Time budget enforcement | Medium — Format discipline | YES |
| 20 | **Anti-Criteria** — `ISC-A-{Domain}-{N}` | Medium — ISC extension | YES |

### New Skills (28 → 37/38 upstream)

| Skill | Description | Port? | Notes |
|-------|-------------|-------|-------|
| **IterativeDepth** | Multi-iteration deep analysis | YES | New thinking tool |
| **Science** | Hypothesis → Test → Analyze cycles | YES | Already referenced in v0.2.25 |
| **Remotion** | Video generation with React | YES | Niche, low priority |
| **WorldThreatModelHarness** | Threat modeling framework | YES | Security-relevant |
| **USMetrics** | US economic metrics dashboard | YES | Data analysis |
| **ExtractWisdom** | Fabric pattern: extract insights | YES | Content analysis |
| **Cloudflare** | Cloudflare integration patterns | YES | Infrastructure |
| **Sales** | Sales methodology/frameworks | YES | Business |
| **WriteStory** | Creative writing framework | YES | Content creation |
| **Parser** | Document/data parsing utilities | YES | Utility |
| **CORE** | Core system management | REVIEW | May overlap with PAI SKILL.md |

### New Hooks → Plugin Handlers

| Hook (Claude Code) | Plugin Handler (OpenCode) | Priority |
|---------------------|---------------------------|----------|
| **AlgorithmTracker** | `algorithm-tracker.ts` | HIGH — Tracks Algorithm execution state |
| **AgentExecutionGuard** | `agent-execution-guard.ts` | HIGH — Prevents agent misuse |
| **SkillGuard** | `skill-guard.ts` | HIGH — Validates skill invocations |
| **CheckVersion** | `check-version.ts` | MEDIUM — Version update notifications |
| **IntegrityCheck** | `integrity-check.ts` | HIGH — System health validation |

### New/Updated Agents

| Agent | Change | Notes |
|-------|--------|-------|
| **PerplexityResearcher** | Already exists in OpenCode | Verify alignment |
| **ClaudeResearcher** | Renamed from DeepResearcher upstream | We keep our naming |
| All agents | Voice personality traits added | Update agent configs |

---

## 2. Portability Assessment

### Fully Portable (Direct Port)
- Constraint Extraction System
- Self-Interrogation
- Build Drift Prevention
- Verification Rehearsal
- Mechanical Verification
- Effort Levels (concept + format)
- Quality Gates
- 25-Capability Full Scan Audit (adapt capability list for OpenCode)
- PRD System (file-based, platform-independent)
- ISC Naming Convention
- Algorithm Reflection JSONL
- Start symbol change
- OBSERVE Hard Gate
- Anti-Criteria
- All new skills (content is platform-independent per ADR-003)

### Requires Adaptation
- **Effort Level → Plugin Integration** — FormatReminder hook becomes `format-reminder.ts` handler update
- **25-Capability Audit** — Must replace Claude Code capabilities with OpenCode equivalents
- **Loop Mode** — Worker-Stealing Pool uses Task tool; no Agent Teams available
- **Voice Personality** — Must be in `settings.json` (OpenCode format per ADR-005)
- **New Hooks** — Each becomes a plugin handler per ADR-001

### NOT Portable (Claude Code Only)
- **Agent Teams/Swarm** — Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` env var. No equivalent in OpenCode.
- **Plan Mode** — `EnterPlanMode`/`ExitPlanMode` are built-in Claude Code tools. No equivalent in OpenCode.
- **StatusLine** — Claude Code UI feature. Not available in OpenCode.

**Handling non-portable features:** Document them in SKILL.md as "Claude Code only" with conceptual descriptions. Users who run on Claude Code get them automatically from upstream; PAI-OpenCode users understand the limitation.

---

## 3. Migration Phases

```
Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4 ──→ Phase 5 ──→ Phase 6
SKILL.md     PRD         Skills      Plugins      Docs        Release
(CRITICAL)   System      (10 new)    (5 new)      + Agents    v2.0.0
                                                   + Mapping
```

**Estimated effort:** 6-8 hours total across all phases.

---

## Phase 1: SKILL.md Rewrite (Algorithm v0.2.25 → v1.4.0)

**Priority:** CRITICAL — Everything else depends on this.
**Estimated effort:** 2-3 hours

### Tasks

1. **Copy v3.0 SKILL.md as base**
   - Source: `v3.0/.claude/skills/PAI/SKILL.md` (1349 lines)
   - Target: `.opencode/skills/PAI/SKILL.md`
   - Keep the OpenCode-specific header (working directory warning)

2. **Apply OpenCode adaptations throughout:**
   - Replace all `~/.claude/` → `~/.opencode/` paths
   - Replace `CLAUDE.md` → `OPENCODE.md` references
   - Replace `settings.json` hook references → plugin handler references
   - Replace `Claude Code` platform references → `OpenCode` where appropriate
   - Replace `TaskCreate`/`TaskList`/`TaskUpdate` → OpenCode Todo equivalents (if different)
   - Remove or mark Agent Teams/Swarm sections as "Claude Code only"
   - Remove or mark Plan Mode sections as "Claude Code only"

3. **Port new Algorithm features:**
   - Constraint Extraction System format
   - Self-Interrogation 5 questions
   - Build Drift Prevention checklist
   - Verification Rehearsal format
   - Mechanical Verification requirements
   - 8 Effort Levels with time budgets
   - 7 Quality Gates
   - 25-Capability Full Scan Audit (adapted for OpenCode capabilities)
   - ISC naming convention (`ISC-{Domain}-{N}`, priority/confidence tags)
   - Anti-Criteria (`ISC-A-{Domain}-{N}`)
   - Start symbol `♻︎`
   - OBSERVE Hard Gate
   - AUTO-COMPRESS at 150%

4. **Adapt 25-Capability Audit for OpenCode:**
   - Map Claude Code capabilities → OpenCode equivalents
   - Remove capabilities that don't exist in OpenCode
   - Add OpenCode-specific capabilities if any

5. **Update Algorithm version references:**
   - `v0.2.25` → `v1.4.0`
   - GitHub reference → keep `danielmiessler/TheAlgorithm`
   - Changelog section → add v1.4.0 entry

### Validation
- [ ] All `~/.claude/` paths replaced with `~/.opencode/`
- [ ] No references to `CLAUDE.md` (should be `OPENCODE.md`)
- [ ] No references to `settings.json` hooks (should be plugin handlers)
- [ ] Agent Teams sections marked as "Claude Code only"
- [ ] Plan Mode sections marked as "Claude Code only"
- [ ] All 20 new features present (adapted where needed)
- [ ] Effort levels work without hook system (graceful degradation)
- [ ] Algorithm format renders correctly in OpenCode

---

## Phase 2: PRD System

**Priority:** HIGH — Core new feature of v3.0.
**Estimated effort:** 1 hour

### Tasks

1. **Create PRD directory structure:**
   ```
   ~/.opencode/MEMORY/WORK/PRD/
   ├── active/          # Current PRDs
   ├── completed/       # Finished PRDs
   └── templates/       # PRD templates
   ```

2. **Port PRD template from v3.0:**
   - Status lifecycle: DRAFT → CRITERIA_DEFINED → PLANNED → IN_PROGRESS → VERIFYING → COMPLETE
   - Dual-tracking: Working Memory (TaskCreate) + Disk (PRD file)
   - Session recovery: PRD files survive session boundaries

3. **Create PRD management in SKILL.md:**
   - PRD creation rules
   - PRD update rules
   - PRD status transitions
   - PRD naming convention

4. **Adapt for OpenCode:**
   - File paths use `~/.opencode/MEMORY/`
   - No Agent Teams for PRD collaboration (single-agent PRD management)

### Validation
- [ ] PRD template matches v3.0 format
- [ ] Directory structure created
- [ ] SKILL.md references PRD system correctly
- [ ] PRD files are plain Markdown (platform-independent)

---

## Phase 3: New Skills

**Priority:** MEDIUM — Additive, doesn't break existing functionality.
**Estimated effort:** 1-2 hours

### Tasks

Port each new skill from `v3.0/.claude/skills/` to `.opencode/skills/`:

| # | Skill | Source | Priority | Notes |
|---|-------|--------|----------|-------|
| 1 | IterativeDepth | v3.0 | HIGH | Core thinking tool |
| 2 | Science | v3.0 | HIGH | Already referenced in v0.2.25 |
| 3 | Cloudflare | v3.0 | MEDIUM | Infrastructure skill |
| 4 | ExtractWisdom | v3.0 | MEDIUM | Fabric pattern |
| 5 | Sales | v3.0 | MEDIUM | Business skill |
| 6 | WorldThreatModelHarness | v3.0 | MEDIUM | Security skill |
| 7 | Parser | v3.0 | MEDIUM | Utility skill |
| 8 | WriteStory | v3.0 | LOW | Creative writing |
| 9 | Remotion | v3.0 | LOW | Video generation |
| 10 | USMetrics | v3.0 | LOW | Niche |
| 11 | CORE | v3.0 | REVIEW | May overlap with PAI SKILL.md |

### Per-Skill Process (ADR-003)
1. Copy SKILL.md from v3.0 source
2. Replace any Claude Code-specific paths/references
3. Verify USE WHEN triggers are accurate
4. Verify no Claude Code-specific tool references
5. Add to skill registry (if one exists)

### Validation
- [ ] Each skill has valid SKILL.md with frontmatter
- [ ] No `~/.claude/` paths in any skill
- [ ] USE WHEN triggers are documented
- [ ] Skills load correctly in OpenCode

---

## Phase 4: New Plugin Handlers

**Priority:** HIGH — Required for Algorithm enforcement.
**Estimated effort:** 1-2 hours

### Architecture (ADR-001 Pattern)

```
.opencode/plugins/
├── pai-unified.ts              # Orchestrator (UPDATE)
├── handlers/
│   ├── algorithm-tracker.ts    # NEW — Track Algorithm state
│   ├── agent-execution-guard.ts # NEW — Prevent agent misuse
│   ├── skill-guard.ts          # NEW — Validate skill invocations
│   ├── check-version.ts        # NEW — Version update notifications
│   ├── integrity-check.ts      # NEW — System health validation
│   ├── format-reminder.ts      # UPDATE — Effort levels (8 tiers)
│   └── ... (existing handlers)
└── lib/
    └── ... (existing utilities)
```

### Per-Handler Process

For each new hook in v3.0:

1. **Read the hook source** from `v3.0/.claude/hooks/`
2. **Identify the trigger** (PreToolExecution, PostToolExecution, Notification, etc.)
3. **Map to OpenCode plugin event** per ADR-001 mapping table
4. **Create handler file** in `.opencode/plugins/handlers/`
5. **Register in pai-unified.ts** orchestrator
6. **Test** — Verify handler fires on correct events

### Handler Details

#### `algorithm-tracker.ts` (NEW)
- **Upstream hook:** `AlgorithmTracker`
- **Purpose:** Tracks which Algorithm phase is active, validates phase transitions
- **Trigger:** PostToolExecution (after TaskCreate, TaskUpdate)
- **OpenCode event:** `tool.result`

#### `agent-execution-guard.ts` (NEW)
- **Upstream hook:** `AgentExecutionGuard`
- **Purpose:** Prevents agents from being spawned without proper capability selection
- **Trigger:** PreToolExecution (before Task tool)
- **OpenCode event:** `tool.call`

#### `skill-guard.ts` (NEW)
- **Upstream hook:** `SkillGuard`
- **Purpose:** Validates skill invocations match USE WHEN triggers
- **Trigger:** PreToolExecution (before SkillLoad)
- **OpenCode event:** `tool.call`

#### `check-version.ts` (NEW)
- **Upstream hook:** `CheckVersion`
- **Purpose:** Checks for PAI-OpenCode updates on startup
- **Trigger:** Notification (session start)
- **OpenCode event:** `session.start` or `message.start`

#### `integrity-check.ts` (NEW)
- **Upstream hook:** `IntegrityCheck`
- **Purpose:** Validates system health (required files exist, configs valid)
- **Trigger:** Notification (session start)
- **OpenCode event:** `session.start`

#### `format-reminder.ts` (UPDATE)
- **Current:** Detects FULL/ITERATION/MINIMAL depth
- **Update:** Support 8 effort levels (Instant → Loop)
- **Must preserve:** AI inference-based classification (not keyword matching)

### Validation
- [ ] Each handler has correct event trigger mapping
- [ ] `pai-unified.ts` registers all new handlers
- [ ] No Claude Code-specific APIs used
- [ ] Handlers degrade gracefully if OpenCode event model differs
- [ ] Existing handlers still work after `pai-unified.ts` update

---

## Phase 5: Agents, Docs & Mapping

**Priority:** MEDIUM — Documentation and alignment.
**Estimated effort:** 1 hour

### Tasks

#### 5a. Agent Updates
1. Update existing agent configs with voice personality traits (if applicable)
2. Verify agent list matches v3.0 (add missing, note removals)
3. Ensure model tier routing in `opencode.json` aligns with v3.0

#### 5b. Documentation Updates
1. **PAI-TO-OPENCODE-MAPPING.md** — UPDATE for v3.0:
   - Add all new feature mappings
   - Add all new hook → handler mappings
   - Add capability audit mapping table
   - Update version references
2. **README.md** — Update version, feature list, upstream reference
3. **CHANGELOG.md** — Add v2.0.0 entry with all changes
4. **MIGRATION.md** — Update with v3.0 migration instructions
5. **PAI-ADAPTATIONS.md** — Add v3.0 adaptations

#### 5c. ADR Updates
1. **ADR-001** — Add new hook → handler mappings for v3.0 hooks
2. Consider new ADR for PRD System if architecture decision needed
3. Consider new ADR for Effort Level system if platform-specific decisions needed

### Validation
- [ ] PAI-TO-OPENCODE-MAPPING.md covers all v3.0 features
- [ ] README reflects v2.0.0 features
- [ ] CHANGELOG has complete v2.0.0 entry
- [ ] All ADRs current

---

## Phase 6: Release v2.0.0

**Priority:** Required — Finalize and tag.
**Estimated effort:** 30 minutes

### Tasks

1. **Version bump:** `package.json` → `2.0.0`
2. **Final validation:** Run through validation checklist (section 6)
3. **Git tag:** `v2.0.0`
4. **Commit message:** `feat!: PAI v3.0 migration — Algorithm v1.4.0, PRD system, 25-capability audit, effort levels`
5. **Push:** `main` branch

### Breaking Changes (justify semver major)
- Algorithm format changed (effort levels, start symbol, ISC naming)
- Plugin handler additions may affect existing plugin configurations
- SKILL.md completely rewritten
- PRD system adds new directory structure requirements

---

## 4. Platform Constraints

### Non-Portable Features (Claude Code Only)

| Feature | Why Not Portable | Handling |
|---------|-----------------|----------|
| Agent Teams/Swarm | Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | Document as "Claude Code only" in SKILL.md |
| Plan Mode | `EnterPlanMode`/`ExitPlanMode` built-in tools | Document conceptually, no implementation |
| StatusLine | Claude Code UI feature | N/A — never had it |

### OpenCode-Specific Adaptations Needed

| Area | Claude Code | OpenCode | Action |
|------|-------------|----------|--------|
| Config paths | `~/.claude/` | `~/.opencode/` | Search-replace in all ported content |
| Entry point | `CLAUDE.md` | `OPENCODE.md` | Reference updates |
| Hooks | `settings.json` hooks | `pai-unified.ts` + handlers | ADR-001 pattern |
| Settings | Single `settings.json` | `opencode.json` + `settings.json` | ADR-005 pattern |
| Task tool | `TaskCreate`/`TaskList`/`TaskUpdate` | OpenCode Todo system | Verify compatibility |
| Tool names | Claude Code built-ins | OpenCode built-ins | Verify all tool references |

### Capability Mapping (for 25-Capability Audit)

The v3.0 25-Capability Audit lists capabilities by Claude Code names. These must be mapped:

| v3.0 Capability | OpenCode Equivalent | Notes |
|-----------------|---------------------|-------|
| Task (subagent) | Task (subagent) | Same concept, verify API |
| Read/Write/Edit | Read/Write/Edit | Same |
| Bash | Bash | Same |
| Glob/Grep | Glob/Grep | Same |
| WebFetch | WebFetch | Same |
| TodoWrite | TodoWrite | Same |
| Agent Teams | NOT AVAILABLE | Mark as N/A |
| Plan Mode | NOT AVAILABLE | Mark as N/A |

*Full mapping to be completed during Phase 1.*

---

## 5. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SKILL.md too long for context window | Medium | High | Test with OpenCode, optimize if needed |
| Plugin handler event model mismatch | Medium | High | Test each handler, graceful degradation |
| Effort level detection without hook | Low | Medium | Format-reminder handler already exists |
| PRD system path conflicts | Low | Medium | Follow ADR-007 memory structure |
| Breaking existing workflows | Medium | Medium | Test all existing skills after migration |
| v3.0 upstream changes during migration | Low | Low | Pin to specific v3.0 commit |

---

## 6. Validation Checklist

### Pre-Release Checklist

#### SKILL.md
- [ ] Algorithm version reads v1.4.0
- [ ] Start symbol is `♻︎`
- [ ] All 8 effort levels documented
- [ ] 7 Quality Gates documented
- [ ] 25-Capability Audit adapted for OpenCode
- [ ] Constraint Extraction System documented
- [ ] Self-Interrogation documented
- [ ] Build Drift Prevention documented
- [ ] Verification Rehearsal documented
- [ ] Mechanical Verification documented
- [ ] PRD System documented
- [ ] ISC naming convention updated
- [ ] Anti-Criteria documented
- [ ] OBSERVE Hard Gate documented
- [ ] AUTO-COMPRESS documented
- [ ] No `~/.claude/` paths (all `~/.opencode/`)
- [ ] No `CLAUDE.md` references (all `OPENCODE.md`)
- [ ] Agent Teams marked as "Claude Code only"
- [ ] Plan Mode marked as "Claude Code only"
- [ ] Algorithm Reflection JSONL documented

#### PRD System
- [ ] Directory structure documented
- [ ] Template file exists
- [ ] Status lifecycle documented
- [ ] Session recovery documented

#### Skills
- [ ] All 10-11 new skills ported
- [ ] Each skill has valid SKILL.md
- [ ] No platform-specific references
- [ ] USE WHEN triggers documented

#### Plugin Handlers
- [ ] 5 new handlers created
- [ ] `pai-unified.ts` updated
- [ ] `format-reminder.ts` updated for effort levels
- [ ] All handlers test-compatible
- [ ] Existing handlers unbroken

#### Documentation
- [ ] PAI-TO-OPENCODE-MAPPING.md updated for v3.0
- [ ] README.md reflects v2.0.0
- [ ] CHANGELOG.md has v2.0.0 entry
- [ ] MIGRATION.md updated
- [ ] PAI-ADAPTATIONS.md updated

#### Release
- [ ] `package.json` version is `2.0.0`
- [ ] Git tag `v2.0.0` created
- [ ] All files committed
- [ ] No secrets in commit

---

## Appendix A: File Change Summary

### New Files
```
.opencode/skills/IterativeDepth/SKILL.md
.opencode/skills/Science/SKILL.md
.opencode/skills/Cloudflare/SKILL.md
.opencode/skills/ExtractWisdom/SKILL.md
.opencode/skills/Sales/SKILL.md
.opencode/skills/WorldThreatModelHarness/SKILL.md
.opencode/skills/Parser/SKILL.md
.opencode/skills/WriteStory/SKILL.md
.opencode/skills/Remotion/SKILL.md
.opencode/skills/USMetrics/SKILL.md
.opencode/plugins/handlers/algorithm-tracker.ts
.opencode/plugins/handlers/agent-execution-guard.ts
.opencode/plugins/handlers/skill-guard.ts
.opencode/plugins/handlers/check-version.ts
.opencode/plugins/handlers/integrity-check.ts
~/.opencode/MEMORY/WORK/PRD/  (directory structure)
```

### Modified Files
```
.opencode/skills/PAI/SKILL.md          — COMPLETE REWRITE
.opencode/plugins/pai-unified.ts       — Register new handlers
.opencode/plugins/handlers/format-reminder.ts — Effort levels
.opencode/PAISYSTEM/PAI-TO-OPENCODE-MAPPING.md — v3.0 mappings
README.md                              — Version + features
CHANGELOG.md                           — v2.0.0 entry
docs/MIGRATION.md                      — v3.0 instructions
docs/PAI-ADAPTATIONS.md                — v3.0 adaptations
package.json                           — Version bump
opencode.json                          — Voice personality traits (if applicable)
```

### Unchanged
```
.opencode/OPENCODE.md                  — Entry point (no changes needed)
docs/PLUGIN-SYSTEM.md                  — Architecture unchanged
docs/architecture/adr/ADR-002-*.md     — Still valid
docs/architecture/adr/ADR-003-*.md     — Still valid (skills 1:1)
docs/architecture/adr/ADR-005-*.md     — Still valid
docs/architecture/adr/ADR-006-*.md     — Still valid
docs/architecture/adr/ADR-007-*.md     — Still valid
All existing skills                    — Unchanged
All existing agents                    — Minor updates only
```

---

## Appendix B: Upstream Reference

- **v3.0 README:** `/Users/steffen/workspace/github.com/danielmiessler/Personal_AI_Infrastructure/Releases/v3.0/README.md`
- **v3.0 SKILL.md:** `/Users/steffen/workspace/github.com/danielmiessler/Personal_AI_Infrastructure/Releases/v3.0/.claude/skills/PAI/SKILL.md`
- **v3.0 settings.json:** `/Users/steffen/workspace/github.com/danielmiessler/Personal_AI_Infrastructure/Releases/v3.0/.claude/settings.json`
- **v3.0 hooks/:** `/Users/steffen/workspace/github.com/danielmiessler/Personal_AI_Infrastructure/Releases/v3.0/.claude/hooks/`
- **v3.0 skills/:** `/Users/steffen/workspace/github.com/danielmiessler/Personal_AI_Infrastructure/Releases/v3.0/.claude/skills/`
- **v3.0 agents/:** `/Users/steffen/workspace/github.com/danielmiessler/Personal_AI_Infrastructure/Releases/v3.0/.claude/agents/`

---

*Created: 2026-02-16*
*Author: Jeremy (PAI Algorithm v0.2.25)*
*Next action: Begin Phase 1 — SKILL.md rewrite*
