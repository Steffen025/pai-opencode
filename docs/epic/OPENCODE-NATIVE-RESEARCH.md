---
title: OpenCode Native Architecture — Deep Research
description: Codemap-based DeepWiki research into OpenCode internals vs Claude Code — findings for PAI-OpenCode 3.0
date: 2026-03-06
source: DeepWiki codemap queries (6 queries, anomalyco/opencode)
status: reference
---

# OpenCode Native Architecture — Research Findings

> **Purpose:** Inform PAI-OpenCode 3.0 development with deep understanding of OpenCode internals.  
> **Method:** 6 DeepWiki codemap queries on `anomalyco/opencode`  
> **Actionability:** Each finding maps to a concrete PAI-OpenCode 3.0 implication.

---

## 1. Bash Tool — STATELESS, nicht sessionübergreifend

### Was DeepWiki gefunden hat

```
packages/opencode/src/tool/bash.ts:172
const proc = spawn(params.command, { shell, cwd, env: {...} })
```

**Jeder Bash-Aufruf spawnt einen NEUEN Shell-Prozess.** Kein State überlebt zwischen Aufrufen:
- ❌ Kein persistentes Working Directory
- ❌ Keine persistenten Umgebungsvariablen  
- ❌ Keine Shell-Aliases oder Functions
- ❌ `cd` in einem Call hat KEINEN Effekt auf den nächsten

### Der `workdir` Parameter

```typescript
// bash.ts:66 — Schema-Definition
workdir: z.string().describe(
  `The working directory to run the command in. Defaults to ${Instance.directory}. 
   Use this instead of 'cd' commands.`
).optional()

// bash.ts:79 — Resolution
const cwd = params.workdir || Instance.directory
```

**`workdir` ist PFLICHT für jeden Bash-Call der außerhalb des Instance.directory läuft.**

### Plugin Shell.env Hook

```typescript
// packages/plugin/src/index.ts:188
"shell.env"?: (input: { cwd, sessionID, callID }, output: { env }) => Promise<void>
```

Plugins können via `shell.env` Hook Umgebungsvariablen **pro Bash-Call** injizieren. Das ist der OpenCode-native Weg für z.B. API Keys.

### PAI-OpenCode 3.0 Implikationen

| Thema | Claude Code | OpenCode | PAI-Anpassung |
|-------|------------|---------|---------------|
| Working Directory | Persistent via `cd` | Stateless, `workdir` param | Alle Bash-Calls brauchen `workdir` |
| Env Variables | Persistent in Session | Fresh per Call, via Plugin | `shell.env` Plugin Hook nutzen |
| Shell State | Kann persisitiert werden | NIEMALS persistent | Kein State zwischen Calls annehmen |

**→ AGENTS.md Eintrag nötig:** "ALWAYS use `workdir` parameter — never `cd`"

---

## 2. Plugin & Event System — TypeScript API

### Plugin Interface

```typescript
// packages/plugin/src/index.ts:35
export type Plugin = (input: PluginInput) => Promise<Hooks>

// packages/plugin/src/index.ts:148
export interface Hooks {
  event?: (input: { event: Event }) => Promise<void>    // ALL events
  tool?: { [key: string]: ToolDefinition }               // Custom tools
  auth?: AuthHook                                         // Provider auth
  "shell.env"?: ...                                       // Env injection
  "tool.execute.before"?: ...                             // Pre-tool hook
  "tool.execute.after"?: ...                              // Post-tool hook
  "tool.definition"?: ...                                 // Tool desc modifier
  "permission.ask"?: ...                                  // Permission control
  "chat.parameters"?: ...                                 // LLM params modifier
}
```

### Vollständige Event-Liste (aus Bus-System)

| Event | Payload | Wann |
|-------|---------|------|
| `session.created` | `{ info: { id, title, directory } }` | Session startet |
| `session.updated` | `{ info: { title } }` | Titel ändert sich |
| `session.error` | `{ error, sessionID }` | Fehler in Session |
| `session.compacted` | — | Kontext komprimiert |
| `message.updated` | message data | Neue/aktualisierte Nachricht |
| `message.removed` | message ID | Nachricht gelöscht |
| `tool.execute.before` | tool name, args | Vor Tool-Ausführung |
| `tool.execute.after` | tool name, result | Nach Tool-Ausführung |
| `file.edited` | filepath, diff | Datei bearbeitet |
| `file.watcher.updated` | filepath, event | Datei extern geändert |
| `command.executed` | name, arguments | `/command` ausgeführt |
| `permission.asked` | id, permission, patterns, tool | Permission-Request |
| `permission.replied` | — | Permission-Antwort |
| `lsp.client.diagnostics` | diagnostics | LSP-Fehler/Warnings |
| `installation.update.available` | version | OpenCode Update verfügbar |
| `tui.prompt.append` | text | Text in TUI eingefügt |
| `pty.created/updated/exited` | pty data | Terminal-Events |

### Plugin kann Folgendes:

✅ **Modify:** Tool-Argumente vor Ausführung  
✅ **Block:** Tool-Ausführung via `permission.ask` → `"deny"`  
✅ **Inject:** Kontext in System-Prompt via instructions  
✅ **Add:** Custom Tools via `tool` Hook  
✅ **Intercept:** Alle Events via `event` Hook  
✅ **Inject:** Umgebungsvariablen via `shell.env`  
✅ **Modify:** LLM-Parameter (temperature, etc.) via `chat.parameters`  

❌ **Modify:** LLM-Antworten nach Erzeugung (kein output-Hook)  
❌ **Intercept:** User-Input vor Verarbeitung (kein input-Hook)

### PAI-OpenCode 3.0 Implikationen

**Der `session.compacted` Event ist KRITISCH:**
```typescript
if (eventType === "session.compacted") {
  // HIER Learnings retten, BEVOR Kontext verloren geht
  await extractLearningsFromWork();
}
```

**Der `shell.env` Hook ersetzt PAI-Hooks für Environment-Injection:**
```typescript
"shell.env": async (input, output) => {
  output.env["PAI_SESSION_ID"] = input.sessionID;
  output.env["PAI_WORK_DIR"] = getPAIWorkDir();
}
```

---

## 3. Agent & Task System

### Task Tool API

```typescript
// packages/opencode/src/tool/task.ts:14
const parameters = z.object({
  description: z.string(),     // 3-5 Wörter
  prompt: z.string(),          // Full task prompt
  subagent_type: z.string(),   // Agent name
  task_id: z.string().optional(),  // Resume previous task
  command: z.string().optional()   // Additional context
})
```

### Subagent Session Isolation

```typescript
// task.ts:72 — Child Session mit Parent-Referenz
const session = await Session.create({
  parentID: ctx.sessionID,
  title: params.description + ` (@${agent.name} subagent)`,
})
```

**Subagents:**
- ✅ Eigene isolierte Session
- ✅ Können Read, Write, Edit, Bash, Glob nutzen
- ✅ Haben Parent-Referenz für Context-Chain
- ❌ `todowrite`/`todoread` per default DEAKTIVIERT
- ❌ `task` Tool (kein re-entrant spawning) außer explizit erlaubt

### Built-in Agent Types

| Agent | Mode | Beschreibung | Tool-Einschränkungen |
|-------|------|--------------|---------------------|
| `build` | primary | Default, full access | Keine |
| `plan` | primary | Read-only Modus | Alle edit-Tools verboten |
| `general` | subagent | Multi-step Tasks | todowrite/todoread off |
| `explore` | subagent | Fast Codebase Exploration | Read-only |

### Custom Agents

Custom Agents werden aus `.opencode/agents/` geladen als Markdown-Files mit Frontmatter:
```markdown
---
name: Engineer
description: Principal engineer agent
model: opencode/kimi-k2.5
system: "You are an expert principal engineer..."
---
```

### PAI-OpenCode 3.0 Implikationen

- **PAI Agent `.md` Files** in `.opencode/agents/` sind der native OpenCode Weg ✅
- **`task_id` für Resume** — PAI kann das für Loop Mode nutzen
- **`model_tier` (unser Fork)** — ergänzt `model` Field per Agent
- `general-purpose` ist **NICHT** ein nativer OpenCode Typ — wir brauchen `general` als Fallback

---

## 4. File System Tools

### Read Tool

```typescript
// Parameters:
filePath: string         // Absolute path
offset?: number          // Line to start from (1-indexed)
limit?: number           // Max lines (default 2000)
```

**Nach jedem Read:** `LSP.touchFile()` → informiert Language Server  
**File-Time Tracking:** `FileTime.read()` → Concurrency Control

### Write Tool

```typescript
// Parameters:
filePath: string
content: string
```

**Nach jedem Write:**
1. Diff generiert (createTwoFilesPatch)
2. File geschrieben
3. `Bus.publish(File.Event.Edited)` → Event Bus
4. `LSP.touchFile()` → Language Server
5. `LSP.diagnostics()` → Syntax-Fehler sofort zurück

### Edit Tool — Intelligente Matching-Strategien

```typescript
// Bei Match-Failure versucht Edit mehrere Strategien:
SimpleReplacer           // Exact match
LineTrimmedReplacer      // Ignores leading/trailing whitespace
BlockAnchorReplacer      // First + last line als Anchor
WhitespaceNormalizedReplacer  // Collapse multiple spaces
```

**Wichtig:** Edit acquiert File-Lock via `FileTime.withLock()` — Concurrent edits safe.

### Snapshot/Undo System

OpenCode nutzt **Git als Snapshot-Backend** (separates hidden Repo):
```bash
# Intern: git write-tree für jeden Snapshot
git --git-dir ${hidden_git} --work-tree ${project} write-tree

# Undo via:
git --git-dir ${hidden_git} --work-tree ${project} checkout ${hash} -- ${file}
```

**Das bedeutet:** `opencode.json` hat `"snapshot": true` — OpenCode erstellt automatisch Git-Snapshots vor AI-Edits. Das erklärt den `snapshot/` Ordner in `~/.local/share/opencode/`.

### File Watching

OpenCode nutzt **Parcel Watcher** (plattformübergreifend):
- macOS: FSEvents
- Linux: inotify  
- Windows: Windows API

Events: `FileWatcher.Event.Updated` mit `{ file, event: "add"|"change"|"delete" }`

### PAI-OpenCode 3.0 Implikationen

- `snapshot: true` in `opencode.json` **bereits aktiv** → Undo für alle AI-Edits ✅
- LSP Integration ist automatisch — kein PAI-Code nötig
- File Watching für PRD-Sync nutzen: `file.edited` Event auf `*.prd.md` → Auto-Update

---

## 5. Context & Konfiguration

### Config-Hierarchie (6 Ebenen, Low → High)

```
1. Remote .well-known/opencode   ← Org-Defaults
2. Global ~/.config/opencode/    ← User-Defaults  
3. OPENCODE_CONFIG env var        ← Environment Override
4. ./opencode.json               ← Projekt-Config
5. .opencode/ directories        ← Skills, Commands, Agents, Plugins
6. Inline config                 ← Höchste Priorität
```

**Arrays werden CONCATENIERT** (nicht ersetzt) beim Merging → Plugins, Instructions etc. additiv!

### Context Compaction

```typescript
// Trigger: Wenn tokens >= (model.limit.input - reserved_output_tokens)
// Aktiv wenn: config.compaction?.auto !== false

// Plugin Hook:
if (eventType === "session.compacted") {
  // Learnings retten JETZT
}
```

**Konfigurierbar in opencode.json:**
```json
{
  "compaction": {
    "auto": true,   // false = deaktiviert
    "reserved": 8000  // Tokens für Output reservieren
  }
}
```

### AGENTS.md / System Prompt Injection

```typescript
// Sucht in folgender Reihenfolge (findUp):
FILES = ["AGENTS.md", "CLAUDE.md", "CONTEXT.md"]

// Format im System-Prompt:
"Instructions from: /path/to/AGENTS.md\n{content}"
```

**CLAUDE.md wird auch gelesen** → Backward-Kompatibilität mit Claude Code Projekten.

### Custom Commands

**Zwei Wege:**

1. **Markdown Files** (empfohlen):
```
.opencode/commands/db-archive.md
---
name: db-archive
description: Archive old sessions
agent: general
---
Archive all sessions older than {{days}} days...
```

2. **opencode.json:**
```json
{
  "command": {
    "db-archive": {
      "description": "Archive old sessions",
      "template": "Archive sessions older than {{days}} days"
    }
  }
}
```

### PAI-OpenCode 3.0 Implikationen

- **`/db-archive` Command** → Markdown file in `.opencode/commands/` ✅
- **Array Concatenation** → Mehrere `plugin` Einträge additiv — gut für Modularität
- **CLAUDE.md Support** → Wir können sowohl AGENTS.md als auch CLAUDE.md pflegen
- **Compaction Hook** → `session.compacted` für Learning-Extraktion **KRITISCH**

---

## 6. OpenCode vs Claude Code — Entscheidende Unterschiede

### Was Claude Code hat, OpenCode NICHT hat

| Feature | Claude Code | OpenCode | Migration |
|---------|------------|---------|-----------|
| **Agent Swarms** (Teams) | ✅ EXPERIMENTAL | ❌ Nicht implementiert | Task Tool mit sequential subagents |
| **Plan Mode Tool** | ✅ EnterPlanMode/ExitPlanMode | ❌ Kein native Tool | `plan` Agent verwenden |
| **Stateful Bash Sessions** | ✅ Persistent Shell | ❌ Fresh per Call | `workdir` param überall |
| **StatusLine** | ✅ Real-time TUI | ❌ Kein Äquivalent | Plugin Events nutzen |

### Was OpenCode hat, Claude Code NICHT hat

| Feature | OpenCode | Claude Code | Nutzen für PAI |
|---------|---------|------------|----------------|
| **Multi-Provider Native** | ✅ 75+ Provider via Vercel AI SDK | ❌ Nur Anthropic | Model Tier Routing |
| **ACP Server** | ✅ IDE Integration (Zed) | ❌ Nicht vorhanden | Future: IDE plugin |
| **MCP OAuth** | ✅ Full OAuth flow | ❌ Manual | Remote MCP Servers |
| **LSP Integration** | ✅ Auto-Diagnostics nach Edit | ❌ Manuell | Sofortiges Code Feedback |
| **Git Snapshot System** | ✅ Auto-Undo für alle Edits | ❌ Manuell | Safety Net gratis |
| **Parcel File Watcher** | ✅ Real-time FS Events | ❌ Polling | PRD-Sync Event-driven |
| **Config Hierarchy (6 levels)** | ✅ Flexible Override | ❌ Flat | Org/User/Project Splits |
| **Plugin npm Install** | ✅ Auto npm install | ❌ Manual | Plugin Ecosystem |
| **`explore` Subagent** | ✅ Native Read-only | ❌ Custom | Codebase Navigation |

### Skill-Loading: BEIDE Formate unterstützt

```typescript
// packages/opencode/src/skill/skill.ts:47
const EXTERNAL_DIRS = [".claude", ".agents"]  // Claude Code kompatibel!
const EXTERNAL_SKILL_PATTERN = "skills/**/SKILL.md"  // Gleiche Struktur
```

**OpenCode liest BEIDE: `.claude/skills/` UND `.opencode/skills/`** — Backward kompatibel!

### Migration von Claude Code Hooks zu OpenCode Plugins

| PAI v4.0.3 Hook | OpenCode Equivalent | Status |
|-----------------|--------------------|----|
| `LoadContext.hook.ts` | `session.created` event | ✅ Portiert |
| `SecurityValidator.hook.ts` | `tool.execute.before` hook | ✅ Portiert |
| `VoiceNotification.hook.ts` | `session.created` + bash curl | ✅ Portiert |
| `PRDSync.hook.ts` | `tool.execute.after` (Write/Edit) | ✅ WP-A |
| `SessionCleanup.hook.ts` | `session.ended` event | ✅ WP-A |
| `LearningPatternSynthesis.hook.ts` | `session.compacted` event | ⚠️ WP-A |
| `WorkCompletionLearning.hook.ts` | `session.ended` event | ⚠️ WP-A |
| `AgentExecutionGuard.hook.ts` | `permission.ask` hook | ⚠️ WP-A |
| `SkillGuard.hook.ts` | `tool.execute.before` | ⚠️ WP-A |

---

## 7. Neue WPs/Anpassungen für PAI-OpenCode 3.0

### WP-G: OpenCode-Native Hardening (NEU — aus diesem Research)

**Erkenntnisse die neue/erweiterte Arbeit erfordern:**

**G.1 — AGENTS.md: workdir-Pflicht dokumentieren**
```markdown
# CRITICAL: Bash is STATELESS in OpenCode
- ALWAYS use workdir parameter: `Bash({ command: "...", workdir: "/path" })`  
- NEVER use `cd` — it has NO effect on subsequent calls
- Working directory does NOT persist between bash tool calls
```

**G.2 — shell.env Plugin Hook für PAI-Kontext**
```typescript
// In pai-unified.ts — Umgebungsvariablen per Bash-Call
"shell.env": async (input, output) => {
  output.env["OPENCODE_SESSION_ID"] = input.sessionID;
  output.env["PAI_CONTEXT"] = "1";
  // API Keys aus .env automatisch verfügbar (kein dotenv nötig)
}
```

**G.3 — session.compacted als KRITISCHEN Learning-Hook implementieren**
```typescript
// HÖCHSTE PRIORITÄT: Learnings retten bevor Kontext weg ist
if (eventType === "session.compacted") {
  await extractAndSaveLearnings(sessionID);  // SOFORT
  fileLog("[Compaction] Learnings rescued before context loss");
}
```

**G.4 — Snapshot System dokumentieren**
- `"snapshot": true` bereits in `opencode.json` ✅
- Dokument: Wie Snapshots genutzt werden können für Undo
- `~/.local/share/opencode/snapshot/` erklärt in DB-MAINTENANCE.md

**G.5 — Custom Commands als Markdown Files (nicht TypeScript)**
```
.opencode/commands/db-archive.md    ← Bevorzugt (simpler)
.opencode/commands/session-info.md
.opencode/commands/memory-refresh.md
```

**G.6 — explore Subagent in AGENTS.md dokumentieren**
```markdown
# Available Subagent Types (OpenCode Native)
- general: Multi-step tasks, full tools (no todo)
- explore: READ-ONLY codebase exploration (fastest)
- + Custom agents from .opencode/agents/
```

**G.7 — file.edited Event für PRD-Sync nutzen**
```typescript
// Statt Polling: Event-driven PRD sync
if (eventType === "file.edited" && event.properties?.filepath?.endsWith(".prd.md")) {
  await syncPRDFrontmatter(event.properties.filepath);
}
```

---

## 8. Zusammenfassung: Was müssen wir in 3.0 anpassen?

### Sofort (in bestehende WPs integrieren):

| Was | Wo | Priorität |
|-----|-----|-----------|
| AGENTS.md: `workdir` Pflicht dokumentieren | WP-A/AGENTS.md | 🔴 KRITISCH |
| `session.compacted` Hook implementieren | WP-A plugin | 🔴 KRITISCH |
| `shell.env` Hook in pai-unified.ts | WP-A | 🟠 HOCH |
| `file.edited` für PRD-Sync | WP-A | 🟠 HOCH |
| Custom Commands als .md files | WP-D | 🟡 MITTEL |
| Snapshot-Docs in DB-MAINTENANCE.md | WP-F | 🟡 MITTEL |
| `explore` agent in Docs erwähnen | WP-C/Docs | 🟡 MITTEL |

### Neue Erkenntnisse die wir noch NICHT im Plan haben:

| Erkenntnis | Implikation | WP |
|-----------|------------|-----|
| OpenCode liest `.claude/skills/` auch! | Wir können parallel pflegen | Info |
| LSP gibt Syntax-Fehler nach jedem Write zurück | PAI könnte Fehler in Loop nutzen | Future |
| ACP Server für IDE-Integration vorhanden | Open Arc Feature | Future |
| MCP OAuth für Remote-Server | Für Tools wie BrightData/Atlassian | WP-A |
| `task_id` für Resume | PAI Loop Mode kann damit arbeiten | WP-C Tools |
| Plugin npm auto-install | Plugin als npm package veröffentlichen | Future |

---

*Research Date: 2026-03-06*  
*Method: DeepWiki codemap queries (6x) on anomalyco/opencode*  
*Coverage: Bash, Plugin/Events, Agents, File Tools, Config, Architecture Differences*
