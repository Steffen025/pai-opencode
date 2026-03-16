---
name: OpenCodeSystem
description: PAI-OpenCode system self-awareness. USE WHEN asking about tools, config, model routing, plugin handlers, MCP servers, troubleshooting, or operating environment.
---

## Customization

**Before executing, check for user customizations at:**
`~/.opencode/skills/PAI/USER/SKILLCUSTOMIZATIONS/OpenCodeSystem/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.

# OpenCodeSystem — System Self-Awareness

System self-awareness for PAI-OpenCode. Enables the Algorithm to answer questions about its own operating environment without asking the user or hallucinating.

## Visibility

This skill runs in the foreground. All lookups and diagnostic output should be visible to maintain transparency.

---

## MANDATORY — Quick Reference

| Question | Answer Location |
|----------|----------------|
| Directory layout + handler map | `docs/architecture/SystemArchitecture.md` |
| All available tools (native + custom + agents) | `docs/architecture/ToolReference.md` |
| Model routing, opencode.json, settings.json | `docs/architecture/Configuration.md` |
| Something not working? | `docs/architecture/Troubleshooting.md` |
| Why was a decision made? | `docs/architecture/adr/README.md` → find relevant ADR |

---

## MANDATORY — Key Facts (Inline — No File Read Needed)

### Runtime Identity
- **Platform:** OpenCode (NOT Claude Code — never use `~/.claude/`)
- **Correct path:** `~/.opencode/`
- **Project config:** `opencode.json` (root) + `settings.json` (~/.opencode/)
- **Plugin entry:** `.opencode/plugins/pai-unified.ts`

### Custom Tools Always Available
| Tool | Purpose |
|------|---------|
| `session_registry` | List recent sessions for CONTEXT RECOVERY |
| `session_results` | Get detailed results for a specific session ID |
| `code_review` | AI code review via roborev — call in VERIFY phase (WP-N7) |

### Model Tiers
- `quick` → fast, cheap (exploration, simple tasks)
- `standard` → balanced (default for most agents)
- `advanced` → complex reasoning (Algorithm agent)
- Actual model names resolved from `opencode.json` — never hardcode

### The 2-Second Rule
If Grep, Glob, or Read can answer in <2 seconds → use them directly. Never spawn an agent for what a direct tool call can do instantly.

### Critical Path Rules
```
bash workdir parameter → ALWAYS (never cd &&)
imports             → ALWAYS include .ts extension
package manager     → ALWAYS bun (never npm/yarn/pnpm)
memory paths        → ALWAYS ~/.opencode/ (never ~/.claude/)
```

---

## MANDATORY — When Something Doesn't Work

Walk `docs/architecture/Troubleshooting.md` top-to-bottom. The checklist covers:
1. Plugin not loading
2. Custom tools missing
3. Post-compaction recovery
4. Model routing issues
5. Path errors
6. Skill not triggering
7. Runtime/bun errors
8. Agent spawn issues

---

## OPTIONAL — Architecture in 30 Seconds

```text
opencode.json          → model routing, permissions, agent definitions
pai-unified.ts         → single plugin, all event hooks registered
handlers/              → 20+ modular handlers (session, security, capture, etc.)
AGENTS.md              → Algorithm's runtime operating instructions
skills/skill-index.json → skill discovery registry for CAPABILITY AUDIT
~/.opencode/MEMORY/    → PRDs, session data, reflections
```

Full details: `docs/architecture/SystemArchitecture.md`

---

## OPTIONAL — USE WHEN Triggers

- "What tools do I have?"
- "What custom tools are available?"
- "How is model routing configured?"
- "What MCP servers are connected?"
- "Why isn't the plugin firing?"
- "What's the difference between opencode.json and settings.json?"
- "How do I troubleshoot X not working?"
- "What agents can I spawn?"
- "Where is the memory stored?"
- "What hooks does the plugin register?"
- Any question about the operating environment, directory structure, or system configuration

---

## Tools

_No dedicated CLI tools for this skill. Reference documents are read directly via `read` tool._

## Workflows

_No workflow files. This skill operates by directing the Algorithm to the correct reference document._

---

## Related Skills

- **PAI** — Algorithm core, ISC creation, verification
- **System** — System maintenance, integrity check, documentation
