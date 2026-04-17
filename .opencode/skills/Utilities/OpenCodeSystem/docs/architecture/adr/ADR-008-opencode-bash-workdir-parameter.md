# ADR-008: OpenCode Bash workdir Parameter

**Status:** Accepted  
**Date:** 2026-03-05  
**Decision Owner:** Steffen  
**Context:** PAI-OpenCode v3.0 Migration

---

## Context

When porting PAI from Claude Code to OpenCode, we discovered a fundamental architectural difference in how the Bash tool handles working directories.

### The Problem

In **Claude Code**, the `cd` command persists across bash calls within a session. The shell process maintains state.

In **OpenCode**, each `bash()` call spawns a **NEW shell process** with `Instance.directory` as the default working directory. The `cd` command has **NO persistent effect** across tool invocations.

### Example of the Failure Mode

```typescript
// WRONG — cd has no effect on next command
bash({ command: "cd /path/to/repo" })
bash({ command: "git status" })  // Runs in Instance.directory, NOT /path/to/repo!
```

### The Root Cause

OpenCode's Bash tool implementation:

```typescript
const cwd = params.workdir || Instance.directory
```

This means `Instance.directory` is the default for **EVERY command**. The `cd` command changes the shell's working directory, but that state is lost when the tool returns.

---

## Decision

**Use the `workdir` parameter for all commands that must run in a different directory.**

### Correct Pattern

```typescript
// CORRECT — explicit workdir
bash({ 
  command: "git status", 
  workdir: "/path/to/repo" 
})
```

### When This Matters

| Situation | Wrong Approach | Correct Approach |
|-----------|----------------|------------------|
| Git ops in another repo | `cd /repo && git status` | `bash({ command: "git status", workdir: "/repo" })` |
| File ops in subdirectory | `cd subdir && ls` | `bash({ command: "ls", workdir: "/path/subdir" })` |
| Build in different project | `cd project && bun build` | `bash({ command: "bun build", workdir: "/project" })` |
| npm install in package | `cd package && npm i` | `bash({ command: "npm i", workdir: "/package" })` |

---

## Algorithm Integration

When the PAI Algorithm navigates to work in a different repository:

1. **OBSERVE:** Note the target directory
2. **BUILD/EXECUTE:** Use `workdir` parameter for all operations in that directory
3. **VERIFY:** Confirm operations executed in correct location

### Example Algorithm Flow

```
User: "Fix the bug in pai-opencode repo"

OBSERVE:
- Target: /Users/steffen/workspace/github.com/Steffen025/pai-opencode
- Instance.directory: /Users/steffen/workspace/github.com/Steffen025/jeremy-opencode

BUILD:
- bash({ command: "git status", workdir: "/Users/.../pai-opencode" })  ✓
- NOT: bash({ command: "cd /Users/.../pai-opencode && git status" })  ✗
```

---

## Consequences

### Positive

- **Explicit and clear:** The target directory is visible in every call
- **No hidden state:** Each command is independent and predictable
- **Safer:** No risk of commands running in wrong directory
- **Better for multi-repo workflows:** Clear separation of contexts

### Negative

- **More verbose:** Must specify `workdir` for every command
- **Breaking change:** Code that relied on `cd` persistence will fail
- **Learning curve:** Users familiar with Claude Code must adapt

### Mitigations

1. **Documentation:** This ADR and the Algorithm documentation explain the pattern
2. **Plugin validation:** WP3 can add workdir validation to catch missing parameters
3. **Code review:** Check for `cd` usage in bash calls during review

---

## Implementation

### Phase 1: Documentation (DONE)

- [x] ADR-008 created
- [x] Algorithm documentation updated (local PAI)
- [x] Learning documents created

### Phase 2: v3.0 Integration (WP1)

- [ ] Add workdir section to Algorithm v3.7.0.md
- [ ] Create PLATFORM-DIFFERENCES.md in PAI-OpenCode
- [ ] Update README.md for v3.0

### Phase 3: Validation (WP3)

- [ ] Add workdir validation to plugin
- [ ] Detect `cd` usage in bash calls
- [ ] Warn when workdir missing for external paths

---

## References

- **OpenCode Source:** `packages/opencode/src/tool/bash.ts`
- **Instance.directory:** `packages/opencode/src/project/instance.ts`
- **Local Learning:** `~/.opencode/MEMORY/LEARNING/2026-03-05_OpenCode-Bash-workdir-Parameter-Problem.md`
- **Integration Points:** `~/.opencode/MEMORY/LEARNING/2026-03-05_OpenCode-Bash-workdir-Parameter-Integration-Points.md`

---

## Notes

This is a **critical platform difference** that affects every multi-repository workflow. The PAI Algorithm must be updated to use `workdir` consistently when working outside `Instance.directory`.

**The Rule:** When working OUTSIDE Instance.directory:
1. NEVER use `cd` expecting it to persist
2. ALWAYS use `workdir` parameter for the target directory
3. Each bash call is INDEPENDENT — no state carries over
