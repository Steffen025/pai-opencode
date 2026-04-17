# ADR-003: Skills System - 100% Unchanged

**Status:** Accepted  
**Date:** 2026-01-25  
**Deciders:** Steffen (pai-opencode maintainer)  
**Tags:** compatibility, skills, upstream-sync

---

## Context

PAI v2.4 organizes all domain expertise into 29 "skills" - self-contained packages with:
- `SKILL.md` (description, triggers, routing)
- `Workflows/` (execution procedures)
- `Tools/` (CLI utilities)
- Reference documentation

Each skill is platform-agnostic - pure documentation and tools, no runtime dependencies.

**The Question:**
Should we adapt skills for OpenCode-specific features, or keep them identical to PAI?

---

## Decision

**Keep skills system 100% unchanged from PAI v2.4.**

This means:
- Identical `SKILL.md` frontmatter format
- Same workflow file structure
- Same tool implementation patterns
- No OpenCode-specific modifications

The ONLY difference: Path references (`.claude/` → `.opencode/`) handled via `$PAI_DIR` environment variable.

---

## Rationale

### 1. Skills Are Platform-Agnostic

Skills contain:
- **Documentation** (markdown) - platform-independent
- **CLI Tools** (TypeScript with Bun) - platform-independent
- **Workflows** (instruction files) - platform-independent

There are NO technical dependencies on Claude Code specifics.

### 2. Maximum Upstream Compatibility

Keeping skills unchanged enables:
- **Easy updates:** When Miessler releases PAI v2.5, we can pull skill changes directly
- **Contribution back:** Skills developed for pai-opencode can go back to PAI
- **Zero learning curve:** PAI users switching to OpenCode see familiar structure

### 3. Proven Architecture

PAI's skill system has been battle-tested:
- 29 skills covering diverse domains
- Thousands of workflows
- Clear organizational model

No need to reinvent what works.

---

## Alternatives Considered

### 1. Adapt skills to leverage OpenCode-specific features
**Rejected** because:
- Creates immediate divergence from upstream
- Loses ability to sync updates from Miessler
- Fragments the skill ecosystem
- No clear OpenCode features that warrant adaptation

### 2. Merge/consolidate skills to reduce complexity
**Rejected** because:
- Loses modularity benefits
- Makes individual skill updates harder
- Doesn't actually reduce cognitive load (same content, different structure)

### 3. Create OpenCode-specific skill variants
**Rejected** because:
- Maintenance burden (two copies of everything)
- Confusion about which to use
- Defeats purpose of portability

---

## Consequences

### ✅ **Positive**

- **Upstream Sync:** Pull PAI v2.5 skill updates with minimal changes
  - Only path references need updating
  - Workflow logic transfers directly

- **Contribution Path:** Skills developed for pai-opencode can be contributed back to PAI
  - Benefits entire PAI ecosystem
  - Increases skill quality through broader testing

- **Zero Migration Friction:** PAI users switching to OpenCode
  - Same skill names, same structure
  - Existing mental models transfer
  - Documentation references work

- **Community Familiarity:** Anyone familiar with PAI skills
  - Can contribute to pai-opencode immediately
  - No platform-specific skill knowledge required

### ❌ **Negative**

- **Can't Use OpenCode-Specific Features:** If OpenCode adds unique capabilities
  - Skills won't leverage them automatically
  - *Mitigation:* Can add OpenCode-specific skills separately (not modify existing)

- **Workflow Patterns May Be Suboptimal:** Some workflows might be more elegant with OpenCode APIs
  - *Mitigation:* Optimizations can happen in tools, not workflow files
  - *Example:* Tool could use OpenCode-specific APIs internally, workflow calls tool the same way

---

## Examples

### Research Skill (Identical)

**PAI v2.4:**
```markdown
---
name: Research
description: Multi-model research. USE WHEN research, investigate.
---

## Workflow Routing
| Workflow | File |
|----------|------|
| Quick | Workflows/Quick.md |
```

**pai-opencode:**
```markdown
---
name: Research
description: Multi-model research. USE WHEN research, investigate.
---

## Workflow Routing
| Workflow | File |
|----------|------|
| Quick | Workflows/Quick.md |
```

*Exactly the same!*

### Tool Example (Only $PAI_DIR changes)

**PAI v2.4:**
```typescript
const skillDir = `${process.env.HOME}/.claude/skills/Research`;
```

**pai-opencode:**
```typescript
const skillDir = `${process.env.PAI_DIR}/skills/Research`;
```

*Same logic, environment variable handles platform difference.*

---

## Verification

All 29 skills ported:
```bash
# Verify skill count
ls -1 .opencode/skills/ | wc -l
# Should output: 29

# Verify SKILL.md format unchanged
rg "^name:" .opencode/skills/*/SKILL.md | wc -l
# Should match skill count
```

---

## Future Considerations

### When OpenCode-Specific Skills Make Sense

Create NEW skills for OpenCode-only features:
- ✅ `OpenCodeIntegration` - platform-specific APIs
- ✅ `OpenCodePluginDev` - plugin development helpers

Do NOT modify existing PAI skills for OpenCode.

### When to Sync from Upstream

Pull skill updates from PAI when:
- Miessler releases new version (v2.5, v3.0, etc.)
- Security fixes in skill tools
- New workflows added to existing skills

Process:
1. Pull from `danielmiessler/PAI`
2. Copy skill files to `pai-opencode/skills/`
3. Update path references (`.claude/` → `$PAI_DIR`)
4. Test
5. Commit

---

## References

- **Skill Index:** `.opencode/skills/` (all 29 skills)
- **Skill System Docs:** PAI documentation (unchanged)
- **Upstream:** `github.com/danielmiessler/PAI/Releases/v2.4/.claude/skills/`

---

## Related ADRs

- ADR-002: Directory Structure (path handling)
- ADR-008: Memory System Structure Preserved (same reasoning)

---

*This ADR establishes pai-opencode as a PORT (not a fork) of PAI skills.*
