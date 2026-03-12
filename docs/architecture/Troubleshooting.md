---
title: Troubleshooting — Self-Diagnostic Checklist
description: Algorithm self-diagnosis when something isn't working
type: reference
adr: ADR-017
wp: WP-N6
updated: 2026-03-12
---

# Troubleshooting — Self-Diagnostic Checklist

> [!NOTE]
> Walk each checklist top-to-bottom. Stop at the first match.

---

## Quick Triage

| Symptom | Jump To |
|---------|---------|
| Plugin not firing / hooks silent | [Plugin Not Loading](#plugin-not-loading) |
| Custom tools not available | [Custom Tools Missing](#custom-tools-missing) |
| Session context lost after compaction | [Post-Compaction Recovery](#post-compaction-recovery) |
| Wrong model being used | [Model Routing](#model-routing) |
| Path errors (`~/.claude/` vs `~/.opencode/`) | [Path Errors](#path-errors) |
| Skill not triggering | [Skill Not Triggering](#skill-not-triggering) |
| Bun / npm errors | [Runtime Errors](#runtime-errors) |
| Agent spawn failing | [Agent Spawn Issues](#agent-spawn-issues) |

---

## Plugin Not Loading

```
□ Does .opencode/plugins/pai-unified.ts exist?
    → NO: Run PAI installer or restore from git

□ Does pai-unified.ts have syntax errors?
    → Check: bun check .opencode/plugins/pai-unified.ts
    → Fix syntax errors before restart

□ Did you restart OpenCode after changing plugin files?
    → Plugin changes require OpenCode restart to take effect

□ Is the plugin exporting a default plugin object?
    → Must export: export default { ... } with hooks
    → Check pai-unified.ts final lines

□ Are handlers imported correctly in pai-unified.ts?
    → Check import paths at top of pai-unified.ts
    → All handlers are in .opencode/plugins/handlers/
```

---

## Custom Tools Missing

`session_registry` and `session_results` not available:

```
□ Is the plugin loaded? (See Plugin Not Loading above)

□ Check pai-unified.ts for tool: { } registration block
    → Search: grep -n "session_registry" .opencode/plugins/pai-unified.ts
    → Should show line ~370: session_registry: sessionRegistryTool

□ Check session-registry.ts exports
    → grep -n "export" .opencode/plugins/handlers/session-registry.ts
    → Should export: sessionRegistryTool, sessionResultsTool

□ Restart OpenCode — custom tools require fresh session to register
```

---

## Post-Compaction Recovery

Context was compacted and working memory is lost:

```
□ Use session_registry tool immediately
    → Call: session_registry (no arguments needed)
    → Returns: list of recent sessions with IDs and task descriptions

□ Identify the relevant session from the list
    → Match task description to current work context

□ Call session_results with that session ID
    → Returns: ISC criteria, decisions, artifacts from that session

□ If session_registry returns empty:
    → Sessions may have been cleaned up
    → Check ~/.opencode/MEMORY/WORK/ for PRD files
    → Read PRD file directly to recover ISC and context

□ Rebuild working memory from recovered data
    → Re-create ISC via TaskCreate matching recovered criteria
    → Resume from last known phase in PRD LOG section
```

See AGENTS.md "Session Recovery" section for the full CONTEXT RECOVERY protocol.

---

## Model Routing

Wrong model being used for an agent:

```
□ Check opencode.json agent section
    → cat opencode.json | grep -A 10 '"AgentName"'
    → Verify model field matches expected

□ Verify model_tier is being passed correctly in task tool call
    → model_tier: "quick" | "standard" | "advanced"
    → Only works if model_tiers block exists in opencode.json for that agent

□ Is the model provider configured?
    → Anthropic models: require ANTHROPIC_API_KEY in environment
    → Google models: require GOOGLE_API_KEY
    → xAI models: require XAI_API_KEY
    → Perplexity: require PERPLEXITY_API_KEY

□ Check opencode.json top-level "model" field
    → This is the default for interactive sessions, not for agents
    → Agent routing always comes from "agent" section
```

Full model table: `docs/architecture/Configuration.md`

---

## Path Errors

Files being written to wrong location:

```
□ CRITICAL: This is OpenCode, NOT Claude Code
    → CORRECT: ~/.opencode/
    → WRONG:   ~/.claude/ or ~/.Claude/

□ Check every file operation path before executing
    → Memory: ~/.opencode/MEMORY/
    → Skills: ~/.opencode/skills/ (user-level) or .opencode/skills/ (project)
    → PRDs: ~/.opencode/MEMORY/WORK/{session-slug}/

□ If files were written to ~/.claude/:
    → First backup: cp -r ~/.claude/MEMORY/ ~/.claude/MEMORY.bak/
    → Then move: rsync -av ~/.claude/MEMORY/ ~/.opencode/MEMORY/
    → Verify: ls ~/.opencode/MEMORY/ (confirm files arrived)
    → Only then remove source: rm -rf ~/.claude/MEMORY/
    → Update any references in PRD files

□ Working directory in bash tool
    → Always use workdir parameter
    → NEVER use cd && pattern
```

---

## Skill Not Triggering

A skill's USE WHEN condition matches but skill isn't being loaded:

```
□ Is the skill in skill-index.json?
    → grep -n "SkillName" .opencode/skills/skill-index.json
    → If missing: add entry with name, path, triggers, fullDescription

□ Does the skill path in skill-index.json match the actual file?
    → Check path field in index matches real file location
    → Paths are relative to .opencode/skills/

□ Is CAPABILITY AUDIT reading skill-index.json?
    → OBSERVE phase must show: "🔍 SKILL INDEX SCAN (#4 — MANDATORY)"
    → If missing from output, re-read AGENTS.md CAPABILITY AUDIT section

□ Do the skill triggers match the task context?
    → Check triggers array in skill-index.json for the skill
    → Triggers are keyword matches against the task description
```

---

## Runtime Errors

Bun or build errors:

```
□ Always use bun, never npm/yarn/pnpm
    → bun install (not npm install)
    → bun run dev (not npm run dev)
    → bun test (not jest or vitest)

□ TypeScript errors in plugin files
    → bun check .opencode/plugins/pai-unified.ts
    → Fix type errors before testing

□ Module not found errors
    → Check import has .ts extension: import { foo } from './bar.ts'
    → Bun requires explicit .ts extensions in imports

□ Environment variables not loading
    → Bun auto-loads .env — do NOT use dotenv package
    → Verify .env exists at project root
    → Verify variable names match exactly (case-sensitive)
```

---

## Agent Spawn Issues

Task tool not spawning agents or agents failing:

```
□ Is subagent_type valid?
    → Valid types: Algorithm, Architect, Engineer, explore, Intern, Writer,
      DeepResearcher, GeminiResearcher, GrokResearcher, PerplexityResearcher,
      CodexResearcher, QATester, Pentester, Designer, Artist, general
    → Check ToolReference.md for full list with model defaults

□ Is the task prompt complete?
    → Include: CONTEXT, TASK, EFFORT LEVEL, OUTPUT FORMAT
    → Agents need full context — they don't inherit session memory

□ Did you check if Grep/Glob/Read can do this instead?
    → 2-second rule: if search/read can answer in <2s, don't spawn agent
    → Agent spawning has 5-15s overhead + permission prompt risk

□ Is doom_loop triggering?
    → opencode.json has "doom_loop": "ask"
    → If agent is recursively spawning agents, user sees a prompt
    → This is expected safety behavior
```

---

## Still Stuck?

If none of the above resolves the issue:

1. Read the relevant ADR: `docs/architecture/adr/README.md`
2. Check git log for recent changes: `git log --oneline -10`
3. Read the full handler file for the failing component
4. Ask the user — include what you've already diagnosed
