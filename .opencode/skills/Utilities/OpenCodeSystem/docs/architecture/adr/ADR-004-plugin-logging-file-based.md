# ADR-004: Plugin Logging (console.log → File-Based)

**Status:** Accepted  
**Date:** 2026-01-25  
**Deciders:** Steffen (pai-opencode maintainer)  
**Tags:** platform-adaptation, logging, debugging

---

## Context

**Claude Code Hooks:**
- Run as separate subprocess (fork/exec)
- Can use `console.log()` freely
- Output goes to separate stream (doesn't affect UI)

**OpenCode Plugins:**
- Run in-process with the TUI (terminal user interface)
- Share same stdout/stderr with UI
- `console.log()` writes directly to terminal = **corrupts TUI**

**The Problem:**
Plugins need logging for debugging, but can't use `console.log()` without breaking the interface.

---

## Decision

**Implement file-based logging system and mandate its use in all plugins.**

**Implementation:** `.opencode/plugins/lib/file-logger.ts`

```typescript
import { fileLog } from "./lib/file-logger";

// ✅ CORRECT:
fileLog("Plugin loaded successfully");
fileLog("Warning: config missing", "warn");

// ❌ WRONG:
console.log("Plugin loaded"); // CORRUPTS TUI!
```

**Log Location:** `/tmp/pai-opencode-debug.log`

---

## Rationale

### 1. TUI Integrity

OpenCode's TUI (terminal interface) requires:
- Full control of stdout for rendering
- No random text interruptions
- Predictable cursor positioning

Any `console.log()` from plugins:
- Writes directly to terminal
- Breaks TUI rendering
- Makes interface unusable

### 2. Persistent Debug Trail

File logging provides:
- **Persistence:** Logs survive crashes
- **Tail-ability:** `tail -f /tmp/pai-opencode-debug.log` for live monitoring
- **Grep-ability:** Search historical logs
- **No Size Limit:** Unlike in-memory buffers

### 3. Platform Pattern

File logging is common for in-process extensions:
- VS Code extensions → output channels (file-backed)
- Browser extensions → background page logs
- Daemon processes → syslog/files

---

## Alternatives Considered

### 1. Use console.log() and accept TUI corruption
**Rejected** because:
- Unusable user experience
- Defeats purpose of TUI
- No way to disable logging selectively

### 2. Structured logging to remote service (e.g., Sentry)
**Rejected** because:
- Adds external dependency
- Network calls from plugins = latency
- Overkill for development logging
- Privacy concerns (logs may contain sensitive data)

### 3. In-memory logging buffer exposed via UI
**Rejected** because:
- Lost on crashes (when you need it most)
- Requires UI implementation in OpenCode
- No way to monitor during development

### 4. Custom IPC channel to separate process
**Rejected** because:
- Complex setup (daemon management)
- Defeats in-process benefit of plugins
- Still needs file output somewhere

---

## Consequences

### ✅ **Positive**

- **TUI Stability:** Interface never corrupted → reliable UX
- **Persistent Logs:** Debug trail survives crashes → better debugging
- **Tail-Friendly:** `tail -f /tmp/pai-opencode-debug.log` → real-time monitoring
- **No External Deps:** No network logging services → simple setup
- **Privacy:** Logs stay local → no data leakage

### ❌ **Negative**

- **Different Debugging Workflow:** Not standard console.log()
  - *Mitigation:* Document clearly, provide examples
  - *Habit:* Import file-logger at top of every plugin file

- **Log File Growth:** Unbounded file size over time
  - *Mitigation:* Implement log rotation (future improvement)
  - *Current:* Manual cleanup if needed

- **Learning Curve:** Contributors must learn file-logger API
  - *Mitigation:* Simple API (drop-in console.log replacement)
  - *Documentation:* Clear examples in PLUGIN-SYSTEM.md

- **No Log Levels in OpenCode UI:** Can't toggle verbosity without editing code
  - *Mitigation:* Log levels in file (info, warn, error) + grep to filter

---

## Implementation

### File Logger API

**Basic Usage:**
```typescript
import { fileLog, fileLogError, clearLog } from "./lib/file-logger";

// Info logging
fileLog("Plugin initialized");

// Warning logging
fileLog("Config missing, using defaults", "warn");

// Error logging
fileLogError("Failed to load skill", error);

// Clear log file (rarely needed)
clearLog();
```

### Log Format

```
[2026-01-25 14:23:45] [INFO] Plugin initialized
[2026-01-25 14:23:45] [WARN] Config missing, using defaults
[2026-01-25 14:23:46] [ERROR] Failed to load skill: Error: File not found
    at loadSkill (/path/to/plugin.ts:42:15)
```

### Development Workflow

**Monitor logs during development:**
```bash
# Terminal 1: Run OpenCode
opencode chat

# Terminal 2: Tail logs
tail -f /tmp/pai-opencode-debug.log
```

**Search logs:**
```bash
# Find all errors
grep "\[ERROR\]" /tmp/pai-opencode-debug.log

# Find recent warnings
tail -100 /tmp/pai-opencode-debug.log | grep "\[WARN\]"
```

---

## Enforcement

### Code Review Checklist

- [ ] No `console.log()`, `console.error()`, `console.warn()` in plugin code
- [ ] All logging uses `fileLog()` or `fileLogError()`
- [ ] Error stack traces captured via `fileLogError(error)`

### Automated Checks (Future)

```bash
# Fail CI if console.log found in plugins
rg "console\.(log|warn|error)" .opencode/plugins/ && exit 1
```

---

## References

- **Implementation:** `.opencode/plugins/lib/file-logger.ts`
- **Usage Examples:** `.opencode/plugins/pai-unified.ts`
- **Documentation:** `docs/PLUGIN-SYSTEM.md` (logging section)

---

## Related ADRs

- ADR-001: Hooks → Plugins Architecture (motivates this decision)

---

*This ADR solves the TUI corruption problem while maintaining debuggability.*
