# PAI 2.0 & OpenCode Platform Synthesis for Jeremy 2.0 Migration

**Version:** 2.0
**Date:** 2026-01-01
**Purpose:** Consolidated analysis of PAI 2.0 architecture AND OpenCode platform for Jeremy 2.0 migration planning
**Research Status:** COMPLETE (4 parallel agents, 48+ pages of documentation)
**Sources:** DeepWiki PAI 2.0, PAI GitHub Repository, Daniel Miessler Blog/YouTube, OpenCode Wiki, Gap Analysis

---

## 0. PAI 2.0 Architecture (NEW - From Comprehensive Research)

### Two Loops Pattern (Core Methodology)

PAI 2.0 uses a **Two Loops** cognitive architecture:

**Outer Loop (Meta-Cognition):**
```
Current State Assessment → Gap Analysis → Desired State Definition
```

**Inner Loop (7 Phases):**
```
OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN
```

This pattern applies to every task, from simple queries to complex multi-session projects.

### 15 Founding Principles

1. **Scaffolding > Model** - Architecture matters more than underlying LLM
2. **Code before Prompts** - TypeScript handles logic, prompts orchestrate
3. **Spec/Test/Evals First** - Never build before specifications
4. **UNIX Philosophy** - Each tool does one thing well
5. **CLI-first** - Build deterministic CLIs, wrap with AI
6. **Identity = Behavior** - Who the AI is shapes what it does
7. **Progressive Disclosure** - Load context just-in-time
8. **Skills as Containers** - Self-contained expertise packages
9. **History is Memory** - Automatic documentation creates learning
10. **Voice is Presence** - TTS creates emotional connection
11. **Delegation by Design** - Use specialized agents
12. **Security by Default** - Validate all tool executions
13. **Platform Agnostic** - Work across Claude Code, OpenCode, Cursor
14. **Pack Portability** - Packs are installation units
15. **Human in the Loop** - AI augments, human decides

### Four Primitives (PAI 2.0 Building Blocks)

| Primitive | Purpose | Location |
|-----------|---------|----------|
| **Pack** | Self-contained upgrade packages | `Packs/` directory |
| **Bundle** | Multiple related packs | `Packs/Bundles/` |
| **Agent** | Specialized AI personalities | `Packs/Agents/` or `.opencode/agent/` |
| **Skill** | Domain expertise modules | Defined within packs |

### The 8 Core Packs (kai-*)

| Pack | Purpose | Dependencies |
|------|---------|--------------|
| `kai-core-install` | Foundation, AGENTS.md, directory structure | None (install first) |
| `kai-hook-system` | Event-driven hooks (8 types) | kai-core-install |
| `kai-history-system` | Sessions, learnings, decisions | kai-core-install, kai-hook-system |
| `kai-voice-system` | TTS feedback via ElevenLabs | kai-hook-system |
| `kai-art-skill` | Image generation via Replicate | kai-core-install |
| `kai-agents-skill` | Specialized AI personalities | kai-core-install |
| `kai-observability-server` | Real-time WebSocket dashboard | kai-hook-system |
| `kai-prompting-skill` | Prompt engineering expertise | kai-core-install |

### Progressive Disclosure (3 Tiers) - 92.5% Token Reduction

| Tier | Content | Token Cost | When Loaded |
|------|---------|------------|-------------|
| **Tier 1** | `description:` in YAML frontmatter | ~50 tokens | Always (system prompt) |
| **Tier 2** | SKILL.md body content | ~250 tokens | On skill activation |
| **Tier 3** | Reference files in `docs/`, `workflows/` | Variable | Just-in-time |

**Result:** 4000 tokens → 300 tokens average = **92.5% reduction**

### Hook System v2.0 (Claude Code - 8 Events)

| Hook | When Fired | Can Block | Use Case |
|------|------------|-----------|----------|
| `PreToolUse` | Before tool execution | YES (exit 2) | Security validation |
| `PostToolUse` | After tool execution | NO | Logging, side effects |
| `Stop` | When assistant stops | NO | Voice feedback |
| `SubagentStop` | When subagent completes | NO | Agent tracking |
| `SessionStart` | Session begins | NO | Context loading |
| `SessionEnd` | Session ends | NO | Summary generation |
| `UserPromptSubmit` | User sends message | NO | Input processing |
| `PreCompact` | Before context compaction | NO | Memory preservation |

**Exit Code Semantics:**
- 0 = Success/Allow
- 1 = Non-blocking error (log and continue)
- 2 = Block (PreToolUse only - prevents tool execution)

### PAIMM (PAI Maturity Model)

| Level | Name | Characteristics |
|-------|------|-----------------|
| 0 | Chatbots | Basic Q&A |
| 1 | Basic | Simple tool use |
| 2 | Advanced | Multi-tool workflows |
| 3 | Agentic | Autonomous task completion |
| 4 | PAI L1 | Personal context aware |
| 5 | PAI L2 | Cross-session memory |
| 6 | PAI L3 | Proactive assistance |
| 7 | Superhuman | Exceeds human capability in domain |
| 8 | AS2 | Advanced Superhuman Level 2 |
| 9 | AS3 | Advanced Superhuman Level 3 |

---

## 1. Executive Summary

OpenCode is a **local-first, CLI-based AI coding agent platform** with comprehensive infrastructure for agents, tools, plugins, and multi-provider LLM support. It offers native solutions to many challenges PAI currently solves with custom code, but requires significant architectural adaptation for compatibility with PAI's existing systems.

### Key Takeaways for Jeremy 2.0

1. **Configuration-driven architecture** - OpenCode uses JSON/JSONC configuration with hierarchical merging (global → project → custom), similar to PAI but different schema
2. **Native plugin system** - Event-based hooks with NPM distribution capability vs. PAI's TypeScript hooks
3. **Built-in systems** - Formatters, LSP, permissions, and tools reduce need for custom implementations
4. **Agent architecture** - Primary/subagent distinction requires mapping to PAI's Task-based delegation
5. **Skills as first-class citizens** - Native `skill` tool with lazy loading vs. PAI's auto-loading triggers

### Overall Migration Complexity: **HIGH**

**Rationale:** While OpenCode offers many compatible features, fundamental architectural differences (configuration format, agent system, hook infrastructure, skills loading) require substantial adaptation work. Estimated 18-26 days minimum for basic compatibility, with ongoing integration work for full feature parity.

---

## 2. Platform Comparison Matrix

| Feature | Claude Code (PAI Current) | OpenCode | Compatibility |
|---------|---------------------------|----------|---------------|
| **Config Format** | `.claude/settings.json` | `opencode.json` (JSONC) | ⚠️ Schema translation needed |
| **Config Location** | `~/.claude/` | `~/.config/opencode/` | ⚠️ Path mapping needed |
| **Rules File** | `CLAUDE.md` | `AGENTS.md` | ⚠️ Rename required |
| **Agent System** | Task tool delegation | Primary/subagent modes | ❌ Conceptual remapping needed |
| **Agent Storage** | `.claude/agents/*.md` | `.opencode/agent/*.md` | ⚠️ Minor path change |
| **Skills Loading** | Auto-load via `USE WHEN` | Lazy-load via `skill` tool | ❌ Architecture change needed |
| **Skills Location** | `.claude/skills/` | `.opencode/skill/` or `.claude/skills/` | ✅ Backward compatible |
| **Custom Commands** | `.claude/commands/*.md` | `.opencode/command/*.md` | ⚠️ Path change, format similar |
| **Hooks/Events** | 4 main hooks (SessionStart, Stop, PostToolUse, SessionEnd) | 30+ plugin events | ❌ Complete redesign needed |
| **Hook Storage** | `.claude/hooks/*.ts` | Plugin system (`.opencode/plugin/`) | ❌ Architecture incompatible |
| **MCP Config** | `.claude/.mcp.json` | Embedded in `opencode.json` | ⚠️ Format translation needed |
| **MCP Auth** | Manual env vars | OAuth flow + manual | ✅ Enhancement available |
| **Tool Permissions** | Custom implementation | Native granular permissions | ✅ Upgrade opportunity |
| **Bash Permissions** | Git safety protocols | Command-level globs | ✅ Significant improvement |
| **Built-in Tools** | Bash, Edit, Write, Read, Grep, Glob, WebFetch, WebSearch | bash, edit, write, read, grep, glob, list, lsp, patch, skill, todowrite, webfetch | ✅ Mostly compatible |
| **Custom Tools** | Custom patterns | TypeScript files in `tool/` | ⚠️ Format adaptation needed |
| **LSP Integration** | Custom/limited | 30+ built-in servers | ✅ Major upgrade |
| **Code Formatters** | External tools | 30+ built-in formatters | ✅ Major upgrade |
| **Session Storage** | JSONL files | SQLite database | ❌ Migration tool needed |
| **Session Sharing** | Not native | Built-in with links | ✅ New capability |
| **Themes** | Custom TUI styling | Built-in theme system | ✅ New capability |
| **Keybindings** | Terminal-dependent | Fully configurable | ✅ Enhancement |
| **Server Mode** | Not built-in | Native HTTP API | ✅ New capability |
| **IDE Integration** | Not available | ACP protocol | ✅ New capability |
| **Plugin Distribution** | Project-specific | NPM packages | ✅ Ecosystem potential |
| **Voice Feedback** | PAI custom implementation | Not native | ⚠️ Must preserve |
| **History System** | PAI comprehensive system | Export/import only | ⚠️ Must preserve |
| **SpecFirst** | PAI core methodology | Not native | ⚠️ Must preserve |

**Legend:**
- ✅ Compatible or enhancement
- ⚠️ Requires adaptation
- ❌ Incompatible, major work needed

---

## 3. Migration Impact Analysis

### What Works Out of Box

✅ **Fully Compatible (0% adaptation)**

1. **Multi-provider LLM support** - 75+ providers vs PAI's configured set
2. **Environment variable substitution** - Both support `{env:VAR}` syntax
3. **File-based configuration** - Both use hierarchical merging
4. **Markdown agent definitions** - Format is similar enough
5. **Git integration** - Standard git operations work
6. **LSP capabilities** - OpenCode's built-in surpasses PAI custom
7. **Code formatting** - OpenCode native system replaces custom needs
8. **Terminal UI** - Both CLI-first architectures

### What Needs Adaptation

⚠️ **Requires Code Changes (20-50% refactor)**

| Component | Effort | Details |
|-----------|--------|---------|
| **Configuration Files** | 3-5 days | Convert `.claude/settings.json` schema to `opencode.json` format. Create migration script. |
| **File Path References** | 2-3 days | Update all `.claude/` → `.opencode/` references (or support both). |
| **Agent Definitions** | 3-4 days | Map PAI agent types to OpenCode modes. Translate Task tool patterns to subagent invocations. |
| **Skills Discovery** | 4-6 days | Replace auto-loading triggers with skill tool integration. Maintain backward compatibility. |
| **MCP Configuration** | 2-3 days | Translate `.claude/.mcp.json` to embedded `opencode.json` format. |
| **Custom Commands** | 2-3 days | Move from `.claude/commands/` to `.opencode/command/`, adapt to dynamic prompt features. |
| **Permissions** | 3-4 days | Map custom permission checks to OpenCode's native system. |
| **Tool Registration** | 3-5 days | Convert PAI tool patterns to OpenCode TypeScript tool format. |
| **Session Handling** | 3-4 days | Adapt history system to work with OpenCode's SQLite vs JSONL. |

**Subtotal:** ~25-37 days

### What Needs Complete Rewrite

❌ **Fundamentally Incompatible (50-100% rewrite)**

| Component | Effort | Reason |
|-----------|--------|--------|
| **Hook System** | 10-14 days | PAI: 4 TypeScript hooks. OpenCode: 30+ plugin events with different architecture. Need complete redesign. |
| **SessionStart Logic** | 5-7 days | PAI loads CORE context via hook. OpenCode needs plugin-based initialization or config-based rules. |
| **PostToolUse Tracking** | 4-6 days | PAI captures tool outputs to history. OpenCode uses `tool.execute.after` plugin hook with different payload. |
| **Voice Feedback Integration** | 5-7 days | PAI uses Stop hook + COMPLETED line. OpenCode needs custom plugin listening to `session.idle` event. |
| **Agent Delegation Logic** | 7-10 days | PAI uses Task tool with model selection. OpenCode uses @ mentions and subagent system. Routing logic incompatible. |
| **Session Summary Generation** | 3-5 days | PAI uses SessionEnd hook. OpenCode needs `session.idle` plugin implementation. |

**Subtotal:** ~34-49 days

**Total Estimated Migration Effort:** **59-86 days** (excluding unknowns)

---

## 4. Critical Gaps Identified

### From Audit Document

1. **Plugin System Research Gaps** (CRITICAL)
   - OpenCode plugin docs have "TODO" sections with unanswered questions:
     - How to block tool execution in `onPreToolCall` hook?
     - How to inject context at session start programmatically?
     - Tab title update mechanisms in plugins?
     - Observability integration patterns?
   - **Risk:** Attempting hook migration without these answers will cause implementation failures
   - **Mitigation:** Must research actual plugin source code or test implementations before v1.2

2. **Error Handling Not Documented**
   - What happens when LLM call fails?
   - Tool execution failure recovery?
   - Session storage corruption handling?
   - Network error retry strategies?
   - **Risk:** Production issues during migration
   - **Mitigation:** Must implement comprehensive error handling based on testing

3. **Migration Guide Missing**
   - No official "Migrating from Claude Code to OpenCode" documentation
   - **Risk:** Team lacks clear migration path
   - **Mitigation:** Must create comprehensive migration guide as part of v1.1

4. **Security Model Not Fully Specified**
   - Permission system security model unclear
   - Prompt injection prevention patterns not documented
   - Secret management recommendations sparse
   - **Risk:** Security vulnerabilities during migration
   - **Mitigation:** Must define security architecture before production use

### From DeepWiki Research

5. **Event Payload Schemas Not Fully Documented**
   - Plugin hooks mentioned with 30+ event types, but exact signatures missing
   - Need to inspect OpenAPI spec or SDK source for complete details
   - **Risk:** Plugin development blocked without payload structures
   - **Mitigation:** Research SDK types or test implementations

6. **Performance Characteristics Unknown**
   - Context window management strategy not detailed
   - Token counting methodology unclear
   - Session compaction algorithm not specified
   - **Risk:** Unexpected bottlenecks or cost overruns
   - **Mitigation:** Performance testing during migration

### From PAI Packs Audit

7. **Bun Runtime Dependency Throughout PAI**
   - PAI packs use `Bun.stdin.text()`, `Bun.spawn()`, Bun-specific APIs
   - OpenCode documentation doesn't specify runtime (though it's also Bun-based)
   - **Risk:** Runtime compatibility issues
   - **Mitigation:** Create Bun/Node.js compatibility layer

8. **Environment Variable Assumptions**
   - PAI uses `CLAUDE_CODE_AGENT`, `$PAI_DIR`, etc.
   - OpenCode uses `OPENCODE_CONFIG`, different conventions
   - **Risk:** Scripts break due to missing env vars
   - **Mitigation:** Environment variable mapping layer

### Additional Gaps

9. **History System Preservation**
   - PAI's comprehensive history system (learnings, research, decisions, sessions) is unique
   - OpenCode has basic export/import but not equivalent organizational structure
   - **Risk:** Loss of knowledge capture system
   - **Mitigation:** Preserve PAI history system alongside OpenCode

10. **SpecFirst Workflow Compatibility**
    - PAI's SpecFirst workflow is central to development methodology
    - OpenCode has no equivalent
    - **Risk:** Core PAI feature lost
    - **Mitigation:** Preserve SpecFirst as PAI-specific layer

---

## 5. Recommended Migration Sequence

Based on the project roadmap and compatibility analysis:

### v1.0: Foundation (Current - PAI on Claude Code)
**Status:** Production
**No changes needed**

### v1.1: Skills Migration (High Priority)

**Goal:** Make PAI skills work on OpenCode with minimal changes

**What Specifically:**

1. **Configuration Translation** (Week 1)
   - Create `opencode.json` generator from `.claude/settings.json`
   - Support both config formats during transition
   - Map environment variables (`PAI_DIR`, etc.)

2. **Skill Discovery Adaptation** (Week 2)
   - Implement skill tool integration for lazy loading
   - Preserve `USE WHEN` triggers via wrapper
   - Maintain `.claude/skills/` as primary location (OpenCode supports this)
   - Add `.opencode/skill/` as secondary location

3. **Agent Definition Migration** (Week 2-3)
   - Convert PAI agent markdown files to OpenCode format
   - Map agent types to OpenCode modes:
     - `intern` → `mode: "subagent"` with haiku model
     - `engineer` → `mode: "primary"` with sonnet model
     - `architect`, `designer`, `pentester`, `researcher`, `writer` → `mode: "subagent"`
   - Preserve agent invocation patterns via compatibility layer

4. **CORE Skill Auto-Loading** (Week 3)
   - Implement SessionStart equivalent via plugin or config-based rules
   - Ensure CORE loads automatically at session start
   - Test context loading integrity

5. **Testing & Validation** (Week 4)
   - Test skill activation with natural language triggers
   - Verify agent delegation works
   - Validate backward compatibility with Claude Code

**Deliverables:**
- Configuration converter tool
- Skill discovery adapter
- Agent mapping layer
- Migration guide (v1.1)

**Success Criteria:**
- PAI skills load and activate on OpenCode
- Agent system functional with both platforms
- No loss of core functionality

### v1.2: Hooks as Plugins (Medium Priority)

**Goal:** Replace PAI TypeScript hooks with OpenCode plugins

**What Specifically:**

1. **Plugin Research Completion** (Week 1)
   - Answer the 4 unanswered questions from plugin docs:
     - Test tool blocking in `onPreToolCall`
     - Implement session start context injection
     - Document tab title update mechanism
     - Create observability integration pattern
   - Inspect SDK source for complete event signatures

2. **Hook Translation** (Week 2-3)
   - **SessionStart** → Plugin with `session.created` hook + config-based `instructions`
   - **Stop** → Plugin with `session.idle` hook
   - **PostToolUse** → Plugin with `tool.execute.after` hook
   - **SessionEnd** → Plugin with `session.idle` hook
   - Preserve voice feedback system integration

3. **History System Integration** (Week 3-4)
   - Adapt PostToolUse plugin to write to PAI history
   - Ensure session summaries still generate
   - Maintain raw event logging compatibility

4. **Voice Notification Plugin** (Week 4)
   - Convert Stop hook voice feedback to plugin
   - Parse COMPLETED line from agent responses
   - Call voice server API

5. **Testing & Validation** (Week 5)
   - Test all hook equivalents
   - Verify history system integrity
   - Validate voice feedback works

**Deliverables:**
- OpenCode plugin packages for each PAI hook
- History system adapter
- Voice feedback plugin
- Updated migration guide (v1.2)

**Success Criteria:**
- All PAI hooks functional via plugins
- History system preserves all data
- Voice feedback operational

### v1.3: Identity Integration (Low Priority)

**Goal:** Integrate OpenCode into PAI identity/branding

**What Specifically:**

1. **Branding Customization**
   - Custom OpenCode theme matching PAI aesthetic
   - Customized AGENTS.md with PAI identity
   - Voice feedback integration fully polished

2. **Workflow Integration**
   - SpecFirst commands adapted to OpenCode patterns
   - Project/idea lifecycle commands working
   - Session search integration

3. **Documentation**
   - Comprehensive PAI on OpenCode user guide
   - Developer documentation for extending
   - Troubleshooting guide

**Deliverables:**
- Custom PAI theme for OpenCode
- Fully integrated workflow commands
- Complete documentation suite

**Success Criteria:**
- Seamless PAI experience on OpenCode
- Feature parity with Claude Code version
- Clear documentation for users

---

## 6. Technical Decision Points

### Design Decisions to Make

1. **Configuration Strategy**
   - **Option A:** Convert all PAI config to `opencode.json` format (clean break)
   - **Option B:** Support both formats with converter (gradual migration)
   - **Option C:** Dual-format system (maintain both)
   - **Recommendation:** Option B - converter with gradual migration path

2. **Agent Delegation Pattern**
   - **Option A:** Full rewrite using OpenCode subagent system
   - **Option B:** Compatibility shim maintaining Task tool API
   - **Option C:** Hybrid - use OpenCode underneath, preserve Task API
   - **Recommendation:** Option C - leverage OpenCode, maintain API

3. **Skills Loading Mechanism**
   - **Option A:** Pure lazy loading via skill tool (OpenCode native)
   - **Option B:** Auto-loading wrapper maintaining USE WHEN triggers
   - **Option C:** Hybrid - auto-register skills, lazy-load content
   - **Recommendation:** Option C - best of both worlds

4. **Hook System Replacement**
   - **Option A:** Full plugin migration (OpenCode native)
   - **Option B:** Hook abstraction layer supporting both
   - **Option C:** Maintain hooks as-is, use plugins only for new features
   - **Recommendation:** Option A with backward compatibility shim

5. **History System Integration**
   - **Option A:** Migrate to OpenCode's export/import system
   - **Option B:** Preserve PAI history system entirely
   - **Option C:** Dual system - OpenCode for sessions, PAI for learnings/research
   - **Recommendation:** Option C - preserve PAI value-add

6. **Directory Structure**
   - **Option A:** Full migration to `.opencode/` (clean break)
   - **Option B:** Symlink `.opencode/` → `.claude/` (compatibility)
   - **Option C:** Support both paths (detect and adapt)
   - **Recommendation:** Option C during transition, Option A long-term

### Trade-offs to Consider

| Decision | Pros | Cons |
|----------|------|------|
| **Full OpenCode adoption** | ✅ Leverage built-in features<br>✅ Reduce custom code<br>✅ Access ecosystem | ❌ Breaking changes for users<br>❌ Loss of PAI unique features<br>❌ Large migration effort |
| **Compatibility layer** | ✅ Gradual migration<br>✅ Preserve PAI features<br>✅ User continuity | ❌ Increased code complexity<br>❌ Maintenance burden<br>❌ May delay full benefits |
| **Dual support** | ✅ User choice<br>✅ No forced migration<br>✅ Reduced risk | ❌ Double maintenance<br>❌ Testing complexity<br>❌ Feature parity challenges |

### Research Still Needed

1. **Plugin Hook Testing**
   - Actual event payload structures
   - Tool blocking mechanisms
   - Context injection patterns
   - Performance characteristics

2. **Session Storage Migration**
   - SQLite schema inspection
   - JSONL → SQLite conversion strategy
   - Data integrity verification
   - Performance comparison

3. **Agent Delegation Patterns**
   - OpenCode @ mention syntax and behavior
   - Subagent context isolation
   - Model selection for subagents
   - Error propagation

4. **Custom Tool Integration**
   - TypeScript tool development workflow
   - Zod schema patterns
   - Cross-language tool invocation
   - Testing strategies

5. **Server Mode Capabilities**
   - API endpoint coverage
   - WebSocket event streaming
   - Authentication/authorization
   - Multi-client scenarios

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Plugin system incompatibility** | High | Critical | Complete plugin research before v1.2. Test all hook equivalents. Have fallback plan. |
| **Hook translation breaks voice feedback** | Medium | High | Preserve existing hook system in parallel during transition. Thorough testing. |
| **Skills don't auto-load** | Medium | High | Implement auto-registration wrapper. Maintain USE WHEN trigger compatibility. |
| **Agent delegation patterns incompatible** | High | Critical | Design compatibility layer. Map Task tool API to OpenCode subagents. Test thoroughly. |
| **Session history data loss** | Low | Critical | Preserve PAI history system. Don't migrate to OpenCode's export/import. Backup everything. |
| **Configuration migration breaks existing setups** | Medium | Medium | Support both formats. Provide converter tool. Clear migration guide. Rollback plan. |
| **Performance degradation** | Low | Medium | Benchmark during migration. Monitor token usage. Optimize as needed. |
| **User confusion during transition** | High | Medium | Clear communication. Gradual rollout. Comprehensive documentation. Support channel. |
| **Lost PAI unique features** | Medium | High | Explicitly preserve SpecFirst, History, Voice. Don't force OpenCode patterns. |
| **Incomplete OpenCode documentation** | High | Medium | Plan for research time. Test actual behavior. Contribute findings back. |
| **Breaking changes in OpenCode** | Medium | Medium | Pin OpenCode version. Monitor releases. Test upgrades before rolling out. |
| **Bun runtime compatibility** | Low | Medium | Create runtime abstraction. Test on Node.js if needed. Document requirements. |
| **MCP configuration translation errors** | Medium | Low | Automated converter with validation. Test all MCP integrations. Manual review. |
| **Permission system gaps** | Low | Medium | Map PAI security patterns to OpenCode. Validate all permission checks. Security audit. |

### Critical Path Items

**Blockers for v1.1:**
1. Configuration converter must work reliably
2. Skill discovery must preserve functionality
3. Agent delegation must not regress
4. CORE skill must auto-load

**Blockers for v1.2:**
1. Plugin research must answer open questions
2. Hook translation must preserve voice feedback
3. History system must remain intact
4. Session summaries must still generate

**Risk Mitigation Strategy:**
- Phase migrations with rollback points
- Maintain Claude Code compatibility during transition
- Comprehensive testing at each phase
- User communication and documentation
- Fallback to Claude Code if critical issues arise

---

## 8. References

### Source Documents

1. **Research Audit** - `/Users/steffen/.claude/History/research/opencode-wiki/_audit-2026-01-01.md`
   - Gap analysis of OpenCode documentation
   - Identified unanswered plugin research questions
   - Coverage assessment: 6/10 completeness

2. **DeepWiki Comprehensive Scan** - `/Users/steffen/.claude/History/research/opencode-wiki/_deepwiki-scan-2026-01-01.md`
   - 60+ documentation sections reviewed
   - Plugin system deep dive (30+ event types)
   - Platform architecture analysis

3. **PAI Packs Compatibility Audit** - `/Users/steffen/.claude/History/research/opencode-wiki/_packs-compatibility-audit-2026-01-01.md`
   - kai-hook-system pack analysis
   - kai-core-install pack analysis
   - 18-26 day porting estimate

4. **Official Documentation Scan** - `/Users/steffen/.claude/History/research/opencode-wiki/_official-docs-scan-2026-01-01.md`
   - Complete configuration reference
   - Tool, agent, permission system details
   - Plugin development patterns

### External Resources

- **OpenCode Official Docs:** https://opencode.ai/docs/
- **DeepWiki Documentation:** https://deepwiki.com/anomalyco/opencode
- **GitHub Repository:** https://github.com/anomalyco/opencode
- **OpenCode SDK:** `@opencode-ai/sdk` (npm)
- **OpenAPI Spec Endpoint:** `http://localhost:4096/doc` (when server running)

### Related PAI Documentation

- **SpecFirst Workflow:** `~/.claude/skills/SpecFirst/SKILL.md`
- **CORE System:** `~/.claude/skills/CORE/SKILL.md`
- **History System:** `~/.claude/skills/CORE/HistorySystem.md`
- **Agent System:** `~/.claude/agents/` directory
- **Hook System:** `~/.claude/hooks/` directory
- **Jeremy 2.0 Project:** `~/.claude/History/projects/jeremy-2.0-opencode/`

---

## 9. Next Steps

### Immediate Actions (This Week)

1. **Validate Synthesis** - Review this document with stakeholders
2. **Prioritize Decisions** - Make calls on Section 6 decision points
3. **Scope v1.1** - Define exact deliverables and timeline
4. **Setup Test Environment** - Install OpenCode, test basic features
5. **Plugin Research** - Answer the 4 critical plugin questions

### Short Term (This Month)

1. **Create Config Converter** - Tool to translate `.claude/settings.json` → `opencode.json`
2. **Prototype Skill Adapter** - Test lazy loading with USE WHEN wrapper
3. **Agent Mapping POC** - Prove Task tool → subagent compatibility
4. **Hook Translation Design** - Detailed architecture for plugin system
5. **Migration Guide Draft** - User-facing documentation outline

### Medium Term (This Quarter)

1. **v1.1 Implementation** - Skills migration to OpenCode
2. **v1.2 Implementation** - Hooks as plugins
3. **Testing & Validation** - Comprehensive test suite
4. **Documentation** - Complete migration guides
5. **User Communication** - Release notes, upgrade paths

### Long Term (This Year)

1. **v1.3 Implementation** - Identity integration
2. **Feature Parity** - Ensure no regression from Claude Code
3. **Ecosystem Development** - PAI plugin packages for OpenCode
4. **Community Engagement** - Contribute to OpenCode ecosystem
5. **Continuous Improvement** - Iterate based on user feedback

---

## Appendix A: Configuration Translation Examples

### Example 1: Basic Settings

**Claude Code (`.claude/settings.json`):**
```json
{
  "model": "claude-sonnet-4-5",
  "providers": {
    "anthropic": {
      "apiKey": "${ANTHROPIC_API_KEY}"
    }
  }
}
```

**OpenCode (`opencode.json`):**
```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-5",
  "provider": {
    "anthropic": {
      "options": {
        "apiKey": "{env:ANTHROPIC_API_KEY}"
      }
    }
  }
}
```

### Example 2: Agent Definition

**Claude Code (`.claude/agents/researcher.md`):**
```markdown
---
description: Deep research specialist using perplexity CLI
---
You are an elite research specialist...
```

**OpenCode (`.opencode/agent/researcher.md`):**
```markdown
---
description: Deep research specialist using perplexity CLI
mode: subagent
model: anthropic/claude-sonnet-4-5
temperature: 0.3
tools:
  write: false
  bash: true
  webfetch: true
---
You are an elite research specialist...
```

### Example 3: MCP Configuration

**Claude Code (`.claude/.mcp.json`):**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@executeautomation/playwright-mcp-server"]
    }
  }
}
```

**OpenCode (`opencode.json`):**
```json
{
  "mcp": {
    "playwright": {
      "type": "local",
      "command": ["npx", "-y", "@executeautomation/playwright-mcp-server"],
      "enabled": true
    }
  }
}
```

---

## Appendix B: Migration Checklist

### Pre-Migration

- [ ] Backup all `.claude/` directory contents
- [ ] Document current PAI configuration
- [ ] Test OpenCode installation on non-production machine
- [ ] Review this synthesis document with team
- [ ] Make decisions on Section 6 design choices
- [ ] Create migration timeline and resource plan

### Phase 1: Configuration (v1.1)

- [ ] Install OpenCode CLI
- [ ] Run configuration converter tool
- [ ] Validate generated `opencode.json`
- [ ] Test environment variable substitution
- [ ] Verify provider authentication works
- [ ] Test model selection and switching
- [ ] Validate MCP server connections

### Phase 2: Skills & Agents (v1.1)

- [ ] Copy skills to `.opencode/skill/` (or keep in `.claude/skills/`)
- [ ] Convert agent definitions to OpenCode format
- [ ] Implement skill discovery adapter
- [ ] Test CORE skill auto-loading
- [ ] Validate USE WHEN trigger compatibility
- [ ] Test agent delegation patterns
- [ ] Verify agent tool access

### Phase 3: Tools & Commands (v1.1)

- [ ] Migrate custom commands to `.opencode/command/`
- [ ] Convert custom tools to OpenCode format
- [ ] Test tool permissions
- [ ] Validate bash command permissions
- [ ] Test file operations (read, write, edit)
- [ ] Verify grep, glob, webfetch work

### Phase 4: Hooks to Plugins (v1.2)

- [ ] Complete plugin research (answer open questions)
- [ ] Implement SessionStart equivalent plugin
- [ ] Convert PostToolUse to tool.execute.after plugin
- [ ] Convert Stop hook to session.idle plugin
- [ ] Implement voice feedback plugin
- [ ] Test history system integration
- [ ] Validate session summary generation

### Phase 5: Testing & Validation

- [ ] Run comprehensive test suite
- [ ] Validate all PAI workflows (SpecFirst, project management, etc.)
- [ ] Test voice feedback system
- [ ] Verify history system integrity
- [ ] Check backward compatibility with Claude Code
- [ ] Performance benchmarking
- [ ] Security audit

### Phase 6: Documentation & Rollout

- [ ] Complete migration guide
- [ ] Update user documentation
- [ ] Create troubleshooting guide
- [ ] Prepare release notes
- [ ] Communicate changes to users
- [ ] Plan gradual rollout strategy
- [ ] Establish support channel

### Post-Migration

- [ ] Monitor for issues
- [ ] Collect user feedback
- [ ] Address bugs and edge cases
- [ ] Optimize performance
- [ ] Plan v1.3 identity integration
- [ ] Consider contributing plugins to OpenCode ecosystem

---

## Appendix C: PAI 2.0 Research Sources

**All research files are in this project's `research/` folder.**

| Source | File | Content |
|--------|------|---------|
| DeepWiki Comprehensive | `2026-01-01_pai-2.0-deepwiki-comprehensive-research.md` | 72KB, 17 sections, Two Loops, PAIMM |
| GitHub Analysis | `pai-2.0-github-repository-analysis.md` | 650+ lines, all 8 packs |
| Gap Analysis | `2026-01-01_PAI-2.0-Gap-Analysis.md` | 12 gaps, 43 questions |
| OpenCode Wiki | `opencode-wiki/` | Complete platform documentation |
| Video Analysis | `video-analysis.md` | Primary source analysis |

---

## Document Metadata

**Version:** 2.0
**Status:** COMPLETE
**Author:** PAI Research Team (4 parallel agents + synthesis)
**Date:** 2026-01-01
**Review Status:** Ready for stakeholder review
**Total Research Volume:** ~100KB of documentation

**Change Log:**
- 2026-01-01 v1.0: Initial synthesis from OpenCode research
- 2026-01-01 v2.0: Added PAI 2.0 architecture section (Two Loops, 15 Principles, 8 Packs, PAIMM, Progressive Disclosure, Hook System v2.0) from comprehensive research
