# PAI-OpenCode v0.7 Plugin Test Results

**Date:** 2026-01-18
**Tester:** Steffen + Jeremy

## Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Plugin Load | ✅ PASS | Plugin loads correctly on OpenCode start |
| 2. Context Injection | ✅ PASS | CORE skill injected via `experimental.chat.system.transform` |
| 3. Security Blocking | ✅ PASS | Dangerous commands blocked via `tool.execute.before` |
| 4. Logging | ✅ PASS | All events logged to `/tmp/pai-opencode-debug.log` |

## Test Details

### Test 1: Plugin Load

**Log Evidence:**
```
[INFO ] === PAI-OpenCode Plugin Loaded ===
[INFO ] Working directory: /Users/steffen/workspace/github.com/Steffen025/pai-opencode
```

### Test 2: Context Injection

**Log Evidence:**
```
[INFO ] Injecting context...
[INFO ] Loading context from: /Users/steffen/workspace/github.com/Steffen025/pai-opencode/.opencode/skill/CORE
[INFO ] Loaded SKILL.md
[INFO ] Loaded SYSTEM/SkillSystem.md
[INFO ] Context loaded successfully (2 parts, 3969 chars)
[INFO ] Context injected successfully
```

### Test 3: Security Blocking

**Harmless command (allowed):**
```
[DEBUG] Tool before: bash
[DEBUG] output.args: {"command":"ls -la","description":"Lists all files with details"}
[INFO ] Extracted command: ls -la
[DEBUG] Security check passed
```

**Dangerous command (blocked):**
```
[DEBUG] Tool before: bash
[DEBUG] output.args: {"command":"rm -rf ../test","description":"Removes test directory recursively"}
[INFO ] Extracted command: rm -rf ../test
[ERROR] BLOCKED: Dangerous pattern matched: /rm\s+-rf\s+\.\./
```

**User sees:**
```
Error: [PAI Security] This command has been blocked for security reasons.
It matches a known dangerous pattern.
```

### Test 4: Logging

All events logged correctly:
- `session.created`, `session.updated`, `session.idle`
- `message.updated`, `message.part.updated`
- `mcp.tools.changed`
- Tool lifecycle events

## Key Learnings

### 1. OpenCode Args Location (CRITICAL)

In `tool.execute.before`, args are in **`output.args`**, not `input.args`:

```typescript
"tool.execute.before": async (input, output) => {
  // input = { tool, sessionID, callID }
  // output = { args } ← Args are HERE!
  const command = output.args.command;
}
```

### 2. Blocking via Error Throwing

OpenCode doesn't reliably call `permission.ask`. To block commands:

```typescript
if (dangerousPattern.test(command)) {
  throw new Error("[PAI Security] Blocked!");  // This stops execution
}
```

### 3. Tool Name Case Sensitivity

OpenCode passes tool names in lowercase (`bash`), not PascalCase (`Bash`).
Solution: `input.tool.toLowerCase()` for comparison.

### 4. OpenCode Claude Compatibility

OpenCode scans `~/.claude/skills/**/SKILL.md` for Claude Code compatibility.
**Never store temp files with SKILL.md in that path** - causes TUI corruption.

## Files Modified During Testing

| File | Change |
|------|--------|
| `pai-unified.ts` | Use `output.args` instead of `input.args` |
| `security-validator.ts` | Case-insensitive tool matching, defensive null checks |
| `types.ts` | Updated regex patterns for parent traversal |

## Next Steps

1. Add more dangerous patterns as needed
2. Implement `tool.execute.after` for learning capture
3. Add session state persistence
4. Port more PAI hooks to OpenCode
