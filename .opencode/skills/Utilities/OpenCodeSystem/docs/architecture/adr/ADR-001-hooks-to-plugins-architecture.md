# ADR-001: Hooks → Plugins Architecture

**Status:** Accepted  
**Date:** 2026-01-25  
**Deciders:** Steffen (pai-opencode maintainer)  
**Tags:** architecture, platform-adaptation, core

---

## Context

Claude Code (the platform PAI v2.4 was built for) uses a "hooks" pattern where external TypeScript/Bash scripts run as subprocesses at lifecycle events (SessionStart, PreToolUse, Stop, etc.).

OpenCode (the target platform for this port) uses an in-process "plugin" system where TypeScript functions register handlers for platform events.

**The Problem:**
- OpenCode doesn't support the subprocess hooks pattern
- PAI v2.4 has 15 hooks implementing core functionality
- Need to preserve all hook functionality in the port

---

## Decision

**Rewrite all PAI hooks as OpenCode plugin handlers in a single unified plugin (`pai-unified.ts`).**

The mapping strategy:

| PAI Hook | OpenCode Plugin Hook | Purpose |
|----------|---------------------|---------|
| `SessionStart` | `experimental.chat.system.transform` | Inject CORE context at session start |
| `PreToolUse` | `tool.execute.before` | Security validation, can block via `throw Error()` |
| `PreToolUse` (blocking) | `permission.ask` | Override permission decisions via `output.status = "deny"` |
| `PostToolUse` | `tool.execute.after` | Observe tool results, capture learnings |
| `UserPromptSubmit` | `chat.message` | Process user input, filter by `role === "user"` |
| `Stop` | `event` | Session lifecycle, filter `session.ended` |

---

## Rationale

1. **OpenCode doesn't support subprocess execution**
   - Plugins run in-process (same Node/Bun runtime as OpenCode)
   - No subprocess overhead = faster execution

2. **Single unified plugin allows shared state**
   - Can share configuration between event handlers
   - Single registration point in `opencode.json`
   - Easier debugging with centralized logic

3. **Type safety with TypeScript**
   - Full type checking for plugin handlers
   - Better IDE support than bash scripts
   - Compile-time error catching

4. **Platform alignment**
   - Uses OpenCode's native extension mechanism
   - Future-proof as platform evolves
   - Community-standard pattern

---

## Alternatives Considered

### 1. Keep hooks and call them from plugin wrapper
**Rejected** because:
- Adds subprocess overhead (defeats in-process benefit)
- Complexity of stdin/stdout communication
- Error handling becomes fragile

### 2. Multiple separate plugins (one per hook)
**Rejected** because:
- Can't share state between handlers
- Complex configuration (multiple plugin entries)
- Harder to coordinate cross-cutting concerns (e.g., security + logging)

### 3. External daemon pattern
**Rejected** because:
- Adds deployment complexity (daemon management)
- Network communication overhead
- Doesn't leverage platform integration

---

## Consequences

### ✅ **Positive**

- **Performance:** No subprocess overhead → faster event handling
- **Type Safety:** Full TypeScript type checking → fewer runtime errors
- **Shared State:** Handlers can coordinate → better cross-cutting concerns
- **Single Config:** One plugin entry → simpler setup
- **Platform Native:** Uses OpenCode's extension API → better supported

### ❌ **Negative**

- **Complete Rewrite:** Can't reuse hook files directly from upstream PAI
  - *Mitigation:* Document mapping in PAI-TO-OPENCODE-MAPPING.md
  
- **Upstream Sync:** When Miessler adds new hooks, must be manually ported
  - *Mitigation:* Hooks change infrequently (stable API)

- **Different Debugging:** File logging required (can't use console.log)
  - *Mitigation:* Implemented `lib/file-logger.ts` with tail-friendly format

- **Learning Curve:** Contributors familiar with PAI hooks must learn plugin API
  - *Mitigation:* Comprehensive PLUGIN-SYSTEM.md documentation

---

## Implementation Notes

**Plugin Location:** `.opencode/plugins/pai-unified.ts`

**Key Files:**
- `plugins/pai-unified.ts` - Main plugin export
- `plugins/handlers/context-loader.ts` - SessionStart logic
- `plugins/handlers/security-validator.ts` - PreToolUse security
- `plugins/lib/file-logger.ts` - Logging utility (NO console.log!)

**Security Note:**
- Security validation patterns preserved 1:1 from PAI v2.4
- Blocking via `throw Error()` or `output.status = "deny"`
- Fail-open on errors (don't hang OpenCode)

---

## References

- **Implementation:** `.opencode/plugins/pai-unified.ts`
- **Documentation:** `docs/PLUGIN-SYSTEM.md`
- **Hook Migration Guide:** `docs/HOOK-MIGRATION-GUIDE.md` (if exists in jeremy-2.0)
- **Upstream:** PAI v2.4 `hooks/` directory

---

## Related ADRs

- ADR-004: Plugin Logging (console.log → file logging)
- ADR-007: Security Validation Pattern Preservation

---

*This ADR documents a core architectural decision in porting PAI to OpenCode. It explains WHY we chose plugins over subprocess hooks.*
