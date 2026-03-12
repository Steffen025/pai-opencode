---
title: Configuration Reference
doc_type: reference
tags: [architecture, configuration, ADR-017, wp-n6]
last_updated: 2026-03-12
---

# Configuration Reference

> [!info] Authoritative Source
> PAI-OpenCode configuration reference (ADR-017 / WP-N6).
> **Single Source of Truth for models: `opencode.json`** — no other file should hardcode model names.

---

## Two-File Configuration (ADR-005)

PAI-OpenCode uses two configuration files with distinct responsibilities:

| File | Location | Purpose | Managed By |
|------|----------|---------|-----------|
| `opencode.json` | Project root (symlink) | OpenCode runtime: model routing, agents, permissions | Developer / this repo |
| `settings.json` | `~/.opencode/` | User preferences: PAI behavior, identity, overrides | User's local install |

**Rule:** `opencode.json` is committed to the repo. `settings.json` is user-local and never committed.

---

## Config Switching (Symlink Architecture)

`opencode.json` at project root is a **symlink** pointing to one of multiple config variants:

```text
opencode.json → opencode.anthropic.json   (Anthropic models — Opus/Sonnet/Haiku)
             → opencode.zen.json          (Zen/multi-provider models)
```

Terminal commands switch the active configuration:

| Command | What It Does |
|---------|-------------|
| `oc-anthropic` | Switch to Anthropic model config |
| `oc-zen` | Switch to Zen/multi-provider config |
| `oc-which` | Show which config variant is currently active |

**Key principle:** The Algorithm and all agents are **unaware** which config variant is active. They only see `opencode.json` and interact with it via the three-tier model system. This means model names change transparently without any code or documentation updates.

---

## opencode.json

Full schema reference: `https://opencode.ai/config.json`

### Top-Level Fields

```json
{
  "$schema": "https://opencode.ai/config.json",
  "theme": "dark",
  "model": "<default model>",     // Default model for interactive sessions
  "snapshot": true,                // Enable session snapshots
  "username": "User",
  "permission": { ... },           // Tool permission rules
  "mode": { ... },                 // Mode-specific system prompts
  "agent": { ... }                 // Agent model routing (three-tier)
}
```

### Three-Tier Model System

Every agent has three model tiers. The Algorithm selects tiers based on task complexity:

| Tier | When | Cost Profile |
|------|------|-------------|
| `quick` | Simple tasks, batch operations, data transformation | Cheapest |
| `standard` | Normal operations (default for most agents) | Balanced |
| `advanced` | Complex reasoning, architecture decisions | Most expensive |

```json
"agent": {
  "Engineer": {
    "model": "<default>",
    "model_tiers": {
      "quick":    { "model": "<fast-cheap-model>" },
      "standard": { "model": "<balanced-model>" },
      "advanced": { "model": "<powerful-expensive-model>" }
    }
  }
}
```

> [!important] Model Names Are NOT Documented Here
> Actual model names live **exclusively** in `opencode.json`. This prevents documentation drift when models change (e.g., new model release, provider switch, config variant swap). To see current models: `cat opencode.json`.

### Algorithm Delegation Principle

The Algorithm runs on the **most capable and most expensive model** in the system. Because of this cost profile, it should:

1. **Delegate aggressively** — write clear instructions for cheaper agents to execute
2. **Write instructions, not code** — for anything >100 lines of code or significant documents, spawn an Engineer/Writer agent
3. **Use `quick` tier agents** for batch operations, simple edits, data transformations
4. **Reserve `advanced` tier** for genuinely complex reasoning that `standard` cannot handle

The agents doing the actual work use significantly cheaper models. The Algorithm's value is in **orchestration and instruction quality**, not in doing the work itself.

### Permissions

```json
"permission": {
  "*": "allow",          // Allow all tools by default
  "websearch": "allow",  // Web search: no prompt
  "codesearch": "allow", // Code search: no prompt
  "webfetch": "allow",   // URL fetch: no prompt
  "doom_loop": "ask",    // Recursive agent calls: requires confirmation
  "external_directory": "ask"  // Files outside project: requires confirmation
}
```

### Mode Prompts

```json
"mode": {
  "build": { "prompt": "You are a Personal AI assistant powered by PAI-OpenCode infrastructure." },
  "plan":  { "prompt": "You are a Personal AI assistant powered by PAI-OpenCode infrastructure." }
}
```

---

## settings.json

Located at `~/.opencode/settings.json`. User-local, never committed.

### Common PAI Settings

```json
{
  "daidentity": {
    "name": "Jeremy"         // DA name used in voice output
  },
  "principal": {
    "name": "Steffen",       // User name
    "timezone": "Europe/Berlin"
  }
}
```

See `AGENTS.md` for the full list of settings.json fields the PAI Algorithm reads.

---

## AGENTS.md

Located at project root (`AGENTS.md`). **Not a config file** — it is the Algorithm's runtime instructions document. Loaded automatically by OpenCode as project-level agent instructions.

Key sections:
- `## Build, Test & Lint Commands` — commands the Algorithm uses
- `## Technology Stack` — stack preferences and rules
- `## Session Recovery` (added WP-N3) — how to use `session_registry` + `session_results`
- `## LSP Integration` (added WP-N4) — LSP opt-in instructions
- `## Session Fork Pattern` (added WP-N4) — experiment isolation pattern

---

## Environment Variables

Set in `.env` (auto-loaded by Bun, never committed). See `.opencode/.env.example` for template.

| Variable | Purpose | Default | Where Used |
|----------|---------|---------|-----------|
| `OPENCODE_EXPERIMENTAL_LSP_TOOL` | Enable LSP tool integration | `true` | OpenCode runtime, documented in ADR-014 |
| `PAI_LOG_LEVEL` | Plugin logging verbosity | — | `pai-unified.ts` handlers |
| `DA` | AI assistant name | — | Voice server, prompt templates |
| `TIME_ZONE` | User timezone | — | Timestamp formatting |
| `PAI_DIR` | Path to `.opencode/` directory | — | Skill and memory system |

---

## Plugin Loading

> [!warning] Only `pai-unified.ts` Should Load at Startup
> OpenCode discovers `.ts` files in `.opencode/plugins/`. The **only** file that should be loaded as a plugin is `pai-unified.ts`. All handler modules in `handlers/` are imported by `pai-unified.ts` internally — they are NOT standalone plugins.
>
> TypeScript files in `skills/*/Tools/` are CLI tools meant to be run on-demand with `bun run <file>`, NOT loaded as plugins. If OpenCode tries to load ALL `.ts` files in the directory tree, this creates errors and performance issues.

Plugin behavior is configured via:
1. `settings.json` values (read at runtime)
2. Hard-coded constants in handler files
3. Environment variables

There is no separate plugin config file — all tuning is done in the handler source or environment.
