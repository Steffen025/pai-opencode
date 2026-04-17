# ADR-002: Directory Structure (.claude/ → .opencode/)

**Status:** Accepted  
**Date:** 2026-01-25  
**Deciders:** Steffen (pai-opencode maintainer)  
**Tags:** platform-convention, paths

---

## Context

PAI v2.4 (built for Claude Code) uses `~/.claude/` as the root directory for all configuration, skills, hooks, and memory.

OpenCode expects configuration and plugins in `~/.opencode/` directory by platform convention.

**The Problem:**
- All PAI documentation references `.claude/` paths
- All scripts use `~/.claude/` hardcoded paths
- Tools expect specific directory structure

---

## Decision

**Rename `.claude/` to `.opencode/` and update all path references throughout the codebase.**

This includes:
- Root directory: `~/.claude/` → `~/.opencode/`
- Environment variable: `CLAUDE_HOME` → `PAI_DIR` (points to `.opencode/`)
- All script paths updated
- All documentation updated

---

## Rationale

1. **Platform Convention**
   - OpenCode looks for `.opencode/` directory by default
   - Parallel with Claude Code's `.claude/` pattern
   - Users expect platform-standard locations

2. **Clear Namespace Separation**
   - Users can run both Claude Code PAI and OpenCode PAI side-by-side
   - No conflicts between installations
   - Clear visual distinction in file system

3. **Ecosystem Alignment**
   - Other OpenCode projects will likely follow this convention
   - Makes pai-opencode feel "native" to OpenCode platform

---

## Alternatives Considered

### 1. Keep `.claude/` and configure OpenCode to use it
**Rejected** because:
- Fights platform conventions
- Confusing for OpenCode users
- Prevents side-by-side installations

### 2. Use custom directory name (e.g., `.pai/`)
**Rejected** because:
- Unfamiliar to users from either platform
- Breaks expected patterns
- Harder to document ("it's not .claude OR .opencode, it's...")

### 3. Make directory configurable via environment variable
**Rejected as sole solution** because:
- Adds configuration burden
- Most users won't change it anyway
- Better as default with override capability

---

## Consequences

### ✅ **Positive**

- **Platform Native:** Follows OpenCode conventions → better UX
- **Side-by-Side:** Can run both PAI versions simultaneously → testing easier
- **Clear Identity:** `.opencode/` signals "this is the OpenCode version" → less confusion

### ❌ **Negative**

- **Path Updates:** All references must be updated
  - *Scope:* ~50 files across skills, hooks, docs
  - *Mitigation:* Search/replace + validation script

- **Documentation Variants:** Need platform-specific docs
  - *Example:* Installation instructions differ for Claude Code vs OpenCode
  - *Mitigation:* Clear separation in INSTALL.md (Claude Code vs OpenCode sections)

- **Upstream Sync:** When pulling PAI updates, paths must be converted
  - *Mitigation:* Documented in PAI-TO-OPENCODE-MAPPING.md

---

## Implementation

**Environment Variable:**
```bash
# In .opencode/settings.json
"env": {
  "PAI_DIR": "/Users/[username]/.opencode"
}
```

**Script Example:**
```typescript
// OLD (Claude Code):
const paiDir = process.env.HOME + "/.claude";

// NEW (OpenCode):
const paiDir = process.env.PAI_DIR || process.env.HOME + "/.opencode";
```

**Path Patterns Updated:**
- `~/.claude/` → `~/.opencode/`
- `$HOME/.claude/` → `$PAI_DIR/` or `$HOME/.opencode/`
- Hardcoded `/Users/daniel/.claude/` → removed entirely

---

## Verification

To verify all paths updated:
```bash
# Search for remaining .claude references (should be none)
rg "\.claude" --type md --type ts --type json

# Validate PAI_DIR usage
rg "PAI_DIR" --type ts --type json
```

---

## References

- **Mapping Doc:** `.opencode/PAISYSTEM/PAI-TO-OPENCODE-MAPPING.md`
- **Installation:** `INSTALL.md` (platform-specific instructions)
- **Settings:** `.opencode/settings.json` (PAI_DIR definition)

---

## Related ADRs

- ADR-005: Configuration Schema (settings.json preservation)

---

*This ADR documents the foundational path structure decision for pai-opencode.*
