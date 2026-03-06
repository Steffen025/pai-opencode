# Platform Differences: Claude Code vs OpenCode

**Critical differences that affect PAI behavior and must be accounted for in the port.**

---

## Overview

PAI was originally built for Claude Code. When porting to OpenCode, certain platform differences require adaptation. This document catalogs those differences and how PAI-OpenCode handles them.

---

## 1. Bash Tool: workdir Parameter (CRITICAL)

### The Difference

| Platform | Behavior |
|----------|----------|
| **Claude Code** | `cd` persists across bash calls within a session |
| **OpenCode** | Each `bash()` call spawns a NEW shell — `cd` has NO persistent effect |

### The Solution

**Use the `workdir` parameter for all commands that must run in a different directory.**

```typescript
// WRONG in OpenCode
bash({ command: "cd /repo && git status" })

// CORRECT in OpenCode
bash({ command: "git status", workdir: "/repo" })
```

### Impact on PAI

- **Algorithm:** Must use `workdir` when working outside `Instance.directory`
- **Multi-repo workflows:** Explicit directory specification required
- **Plugin validation:** Can detect missing `workdir` for external paths

**See:** [ADR-008](architecture/adr/ADR-008-opencode-bash-workdir-parameter.md)

---

## 2. Hooks vs Plugins

### The Difference

| Platform | Mechanism | Execution |
|----------|-----------|-----------|
| **Claude Code** | Subprocess hooks (`.claude/hooks/*.hook.ts`) | External process, stdout capture |
| **OpenCode** | In-process plugins (`~/.opencode/plugins/*.ts`) | Same process, direct API |

### The Solution

**Migrate hooks to OpenCode plugins with event handlers.**

```typescript
// Claude Code hook
export default async function(context) {
  // Hook logic
}

// OpenCode plugin
export default {
  name: "pai-core",
  onSessionStart: async (context) => { /* ... */ },
  onToolCall: async (tool, args) => { /* ... */ },
}
```

### Impact on PAI

- **6 hooks migrated** to plugins (context-loader, security-validator, voice-notification, etc.)
- **Event-driven architecture** replaces hook-based
- **File-based logging** to prevent TUI corruption

**See:** [ADR-001](architecture/adr/ADR-001-hooks-to-plugins-architecture.md), [ADR-004](architecture/adr/ADR-004-plugin-logging-file-based.md)

---

## 3. Directory Structure

### The Difference

| Platform | Directory | Config File |
|----------|-----------|-------------|
| **Claude Code** | `~/.claude/` | `settings.json` |
| **OpenCode** | `~/.opencode/` | `opencode.json` |

### The Solution

**Use `.opencode/` for all PAI-OpenCode files.**

```
~/.opencode/
├── PAI/              # Core PAI system
├── skills/           # Skills (SKILL.md structure)
├── agents/           # Agent definitions
├── plugins/          # OpenCode plugins
├── MEMORY/           # Session history, learning
└── opencode.json     # OpenCode config
```

### Impact on PAI

- **All paths updated** from `.claude/` to `.opencode/`
- **Dual config files:** `settings.json` (PAI) + `opencode.json` (OpenCode)
- **Symlink support** for existing OpenCode users

**See:** [ADR-002](architecture/adr/ADR-002-directory-structure-claude-to-opencode.md), [ADR-005](architecture/adr/ADR-005-configuration-dual-file-approach.md)

---

## 4. Agent Swarms

### The Difference

| Platform | Status | Feature |
|----------|--------|---------|
| **Claude Code** | ✅ Released (Feb 2026) | Agent Teams, TeammateTool, shared tasks |
| **OpenCode** | ❌ Not implemented | GitHub issues #12661, #12711, PR #7756 (open) |

### The Solution

**Use OpenCode's Task tool with sequential subagents.**

```typescript
// Claude Code: Agent Teams
TeammateTool({ team_name: "research-team", message: "..." })

// OpenCode: Sequential subagents
Task({ subagent_type: "Researcher", prompt: "..." })
```

### Impact on PAI

- **No parallel agent swarms** in PAI-OpenCode v3.0
- **Sequential subagents** via Task tool
- **Monitor PR #7756** for future "subagent-to-subagent delegation"

**See:** [EPIC-v3.0-Synthesis-Architecture.md](epic/EPIC-v3.0-Synthesis-Architecture.md) Section 1

---

## 5. Model Tiers

### The Difference

| Platform | Native Support | Implementation |
|----------|----------------|----------------|
| **Claude Code** | ❌ No | Would require custom routing |
| **OpenCode** | ⚠️ Partial | Custom fork with `model_tier` parameter |

### The Solution

**Use custom OpenCode binary with Model Tier support.**

```json
// opencode.json
{
  "agent": {
    "Engineer": {
      "model": "opencode/kimi-k2.5",
      "model_tiers": {
        "quick": { "model": "opencode/glm-4.7" },
        "standard": { "model": "opencode/kimi-k2.5" },
        "advanced": { "model": "opencode/claude-sonnet-4.5" }
      }
    }
  }
}
```

### Impact on PAI

- **Custom binary required** for PAI-OpenCode v3.0
- **60x cost savings** with tier routing
- **Production-ready** (battle-tested for months)

**See:** [EPIC-v3.0-Synthesis-Architecture.md](epic/EPIC-v3.0-Synthesis-Architecture.md) Section "Model Tiers"

---

## 6. Lazy Loading

### The Difference

| Platform | Mechanism | Context Size |
|----------|-----------|--------------|
| **Claude Code** | Static context loading | 233KB at session start |
| **OpenCode** | Native `skill` tool | On-demand, ~20KB bootstrap |

### The Solution

**Use OpenCode's native skill discovery and lazy loading.**

```typescript
// OpenCode-native skill discovery
const skills = await skill_find({ pattern: "research" });
await skill_use({ name: "research", action: "deepResearch" });
```

### Impact on PAI

- **Remove static context loader** (233KB → 20KB)
- **Use native skill tool** for on-demand loading
- **Faster session startup** (<3 seconds)

**See:** [EPIC-v3.0-Synthesis-Architecture.md](epic/EPIC-v3.0-Synthesis-Architecture.md) WP2

---

## 7. Event System

### The Difference

| Platform | Events | Hook Points |
|----------|--------|-------------|
| **Claude Code** | Limited | Pre/post tool, session start/end |
| **OpenCode** | 20+ events | session, tool, file, message, compaction, pty, lsp, etc. |

### Complete OpenCode Event List (verified via DeepWiki 2026-03-06)

| Event | Payload | PAI Usage |
|-------|---------|-----------|
| `session.created` | `{ info: { id, title, directory } }` | Work session start, context load |
| `session.updated` | `{ info: { title } }` | Title tracking |
| `session.error` | `{ error, sessionID }` | Error diagnostics |
| `session.compacted` | — | **🔴 CRITICAL: Learning rescue before context loss** |
| `message.updated` | message data | Sentiment, ISC validation, response cache |
| `tool.execute.before` | tool name, args | Security validation, guard checks |
| `tool.execute.after` | tool name, result | PRD sync, question tracking, observability |
| `file.edited` | filepath, diff | PRD auto-sync (WP-G planned) |
| `file.watcher.updated` | filepath, event | External change detection |
| `command.executed` | name, arguments | `/command` usage tracking |
| `permission.asked` | id, permission, patterns, tool | Full permission audit log |
| `permission.replied` | — | Permission response tracking |
| `lsp.client.diagnostics` | diagnostics | Code error detection after edits |
| `installation.update.available` | version | OpenCode update notification |
| `tui.prompt.append` | text | TUI text injection |
| `pty.created/updated/exited` | pty data | Terminal session events |

### The Solution

**Use OpenCode's native event system — subscribe to all via `event` hook.**

```typescript
"event": async (input) => {
  const eventType = (input.event as any)?.type;
  
  // CRITICAL: session.compacted = last chance to save learnings
  if (eventType === "session.compacted") {
    await extractAndSaveLearnings(sessionID);  // IMMEDIATE
  }
  
  // file.edited for event-driven PRD sync
  if (eventType === "file.edited") {
    const filepath = input.event?.properties?.filepath;
    if (filepath?.endsWith("PRD.md")) await syncPRD(filepath);
  }
}
```

### Impact on PAI

- **20+ events** now covered in `pai-unified.ts` (WP-A PR #42)
- **`session.compacted` is critical** — only chance to save before context loss
- **`file.edited` enables event-driven PRD sync** (planned WP-G)
- **`permission.asked` provides full audit log** of all AI permissions

**See:** [PLUGIN-SYSTEM.md](PLUGIN-SYSTEM.md), [ADR-009](architecture/adr/ADR-009-handler-audit-opencode-adaptation.md)

---

## 8. Environment Variables: Two-Layer System (NEW — 2026-03-06)

### The Difference

| Platform | Env Handling |
|----------|-------------|
| **Claude Code** | Shell session persists; `export VAR=value` works across calls |
| **OpenCode** | Fresh process per call; env vars need explicit management |

### The Two-Layer Solution

```
Layer 1 — .opencode/.env → Bun → process.env (TypeScript code)
Layer 2 — shell.env plugin hook → Bash child processes
```

**Layer 1 (`.env`):** API keys, credentials, service URLs — loaded by Bun at startup into `process.env`. TypeScript code reads these directly. No code needed.

**Layer 2 (`shell.env` hook):** Runtime context per bash call — session ID, working directory, + explicit passthrough of selected keys for bash scripts.

```typescript
// shell.env hook in pai-unified.ts
"shell.env": async (input, output) => {
  output.env["PAI_CONTEXT"] = "1";
  output.env["PAI_SESSION_ID"] = input.sessionID ?? "unknown";
  output.env["PAI_WORK_DIR"] = input.cwd ?? "";

  // Explicit passthrough for bash scripts that need these
  const PASSTHROUGH_KEYS = ["GOOGLE_API_KEY", "TTS_PROVIDER", "DA", "TIME_ZONE"];
  for (const key of PASSTHROUGH_KEYS) {
    if (process.env[key]) output.env[key] = process.env[key];
  }
}
```

### Impact on PAI

- **TypeScript plugins:** Read from `process.env` directly — no hook needed
- **Bash scripts:** Receive `PAI_CONTEXT`, `PAI_SESSION_ID`, `PAI_WORK_DIR` + selected keys
- **API key inheritance:** `.env` → `process.env` → explicit passthrough (not automatic)

**See:** [ADR-010](architecture/adr/ADR-010-shell-env-two-layer-system.md)

---

## 9. Session Storage & Database (NEW — 2026-03-06)

### The Difference

| Platform | Session Storage | Growth |
|----------|----------------|--------|
| **Claude Code** | Files in `~/.claude/` | Manageable |
| **OpenCode** | SQLite at `~/.local/share/opencode/opencode.db` | Can reach 2+ GB |

### Architecture

```
~/.local/share/opencode/
├── opencode.db         ← All sessions, messages, parts (2.4 GB after 3 months)
├── opencode.db-wal     ← Write-Ahead Log
└── storage/
    ├── migration       ← Migration marker (value: 2 = SQLite mode)
    ├── part/           ← Legacy JSON files (obsolete after migration)
    ├── message/        ← Legacy JSON files (obsolete after migration)
    └── session/
```

### Database Tables

| Table | Records (3 months) | Size |
|-------|-------------------|------|
| `session` | ~4,000 | small |
| `message` | ~60,000 | medium |
| `part` | ~235,000 | **1.4 GB** (code, text, tool outputs) |

### The Problem: No Auto-Cleanup

**OpenCode has no automatic session retention policy.** The database grows indefinitely:
- Each message part (code block, tool output) = ~6 KB
- After 3 months: 2.4 GB, 235k parts, 60k messages
- **Startup-lock error:** Migration check on 135k legacy JSON files blocks first start

### The Solution (WP-F — planned for PR #D)

Three-level archiving solution:
1. **Plugin warning:** `session-cleanup.ts` checks DB size after session end
2. **CLI tool:** `bun Tools/db-archive.ts [days] [--dry-run] [--vacuum]`
3. **Custom command:** `/db-archive` in OpenCode TUI
4. **VACUUM:** Like disk defragmentation — reclaims freed space (requires OpenCode shutdown)

```bash
# Archive sessions older than 90 days
bun Tools/db-archive.ts 90

# Dry run — shows what would be archived
bun Tools/db-archive.ts 90 --dry-run

# Archive + VACUUM (requires OpenCode to be stopped)
bun Tools/db-archive.ts 90 --vacuum
```

### Impact on PAI

- **PR #42 scope:** DB health warning in `session-cleanup.ts` (WP-A)
- **PR #D scope:** Full archive tool + VACUUM + Electron GUI (WP-F)

---

## 10. File Tools: LSP, Snapshots, File Watching (NEW — 2026-03-06)

### OpenCode-Exclusive Features (No Claude Code Equivalent)

**LSP Integration (automatic):**
After every `Write` or `Edit`, OpenCode notifies language servers and returns syntax errors immediately. PAI gets code diagnostics for free — no additional code needed.

**Git Snapshot System (automatic):**
OpenCode maintains a hidden Git repository for every project. Before each AI edit, a snapshot is created. Undo = `git checkout` from the snapshot. Configure with `"snapshot": true` in `opencode.json` (already set).

**Parcel File Watcher (automatic):**
OpenCode watches the project directory using platform-native file system events (FSEvents on macOS, inotify on Linux). Plugins can subscribe to `file.edited` and `file.watcher.updated` events.

### Impact on PAI

- **LSP diagnostics:** Automatic after every Write/Edit — no PAI code needed
- **Undo system:** `~/.local/share/opencode/snapshot/` stores all AI edit history
- **PRD sync:** Subscribe to `file.edited` for event-driven PRD frontmatter updates

---

## Summary Table (Updated 2026-03-06)

| Feature | Claude Code | OpenCode | PAI-OpenCode Solution |
|---------|-------------|----------|----------------------|
| **Bash workdir** | `cd` persists | `workdir` param | Use `workdir` always (ADR-008) |
| **Hooks** | Subprocess | In-process plugins | Migrated to plugins (ADR-001) |
| **Directory** | `.claude/` | `.opencode/` | Use `.opencode/` (ADR-002) |
| **Agent Swarms** | ✅ Yes | ❌ No | Sequential Task tool |
| **Model Tiers** | ❌ No | ⚠️ Custom fork | Custom binary |
| **Lazy Loading** | Static | Native skill tool | Use native discovery |
| **Events** | ~5 events | 16+ events | Use native events (ADR-009) |
| **Env Variables** | Shell-persistent | Fresh per call | Two-layer system (ADR-010) |
| **Session DB** | Files | SQLite (grows!) | WP-F archive tool |
| **LSP Diagnostics** | ❌ Manual | ✅ Auto after Write | Free — no code needed |
| **Git Snapshots** | ❌ Manual | ✅ Auto per edit | Free — `snapshot: true` |
| **File Watching** | ❌ Polling | ✅ Native events | `file.edited` event |
| **Config Hierarchy** | Flat | 6-level override | `opencode.json` precedence |
| **Skill Loading** | `.claude/skills/` | Both `.claude/` + `.opencode/` | Backward compatible! |
| **ACP Server** | ❌ No | ✅ IDE integration | Future: IDE plugin |

---

## Migration Checklist

When porting PAI features to OpenCode:

- [x] Check for `cd` usage in bash calls → use `workdir`
- [x] Migrate hooks to plugin event handlers
- [x] Update paths from `.claude/` to `.opencode/`
- [x] Use Task tool instead of Agent Teams
- [x] Configure Model Tiers in `opencode.json`
- [x] Use native skill tool for lazy loading
- [x] Map hooks to all 16 OpenCode events
- [x] Add `shell.env` hook for bash context injection
- [ ] Implement DB archive tool (WP-F, PR #D)
- [ ] Add `file.edited` → PRD sync (WP-G, PR #B)

---

## References

- [ADR-001: Hooks to Plugins](architecture/adr/ADR-001-hooks-to-plugins-architecture.md)
- [ADR-002: Directory Structure](architecture/adr/ADR-002-directory-structure-claude-to-opencode.md)
- [ADR-004: Plugin Logging](architecture/adr/ADR-004-plugin-logging-file-based.md)
- [ADR-005: Dual Config](architecture/adr/ADR-005-configuration-dual-file-approach.md)
- [ADR-008: Bash workdir](architecture/adr/ADR-008-opencode-bash-workdir-parameter.md)
- [ADR-009: Handler Audit](architecture/adr/ADR-009-handler-audit-opencode-adaptation.md)
- [ADR-010: Shell.env Two-Layer System](architecture/adr/ADR-010-shell-env-two-layer-system.md)
- [EPIC-v3.0-Synthesis-Architecture](epic/EPIC-v3.0-Synthesis-Architecture.md)
- [OpenCode Native Research](epic/OPENCODE-NATIVE-RESEARCH.md)

---

*Last updated: 2026-03-06*
*Status: Updated with DeepWiki research findings — Session 2026-03-06*
