# Configuration Reference

> **Authoritative source for PAI-OpenCode configuration (ADR-017 / WP-N6)**
> For model name actuals, `opencode.json` is the source of truth.
> Last updated: 2026-03-12

---

## Two-File Configuration (ADR-005)

PAI-OpenCode uses two configuration files with distinct responsibilities:

| File | Location | Purpose | Managed By |
|------|----------|---------|-----------|
| `opencode.json` | Project root | OpenCode runtime: model routing, agents, permissions | Developer / this repo |
| `settings.json` | `~/.opencode/` | User preferences: PAI behavior, identity, overrides | User's local install |

**Rule:** `opencode.json` is committed to the repo. `settings.json` is user-local and never committed.

---

## opencode.json

Full schema reference: `https://opencode.ai/config.json`

### Top-Level Fields

```json
{
  "$schema": "https://opencode.ai/config.json",
  "theme": "dark",
  "model": "anthropic/claude-sonnet-4-5",   // Default model for interactive sessions
  "snapshot": true,                          // Enable session snapshots
  "username": "User",
  "permission": { ... },                     // Tool permission rules
  "mode": { ... },                           // Mode-specific system prompts
  "agent": { ... }                           // Agent model routing
}
```

### Model Routing (`agent` section)

Each agent type has a default model and optional `model_tiers` for override:

```json
"agent": {
  "Algorithm": {
    "model": "anthropic/claude-opus-4-6"     // Always uses Opus — orchestration tier
  },
  "Engineer": {
    "model": "anthropic/claude-sonnet-4-5",  // Default
    "model_tiers": {
      "quick":    { "model": "anthropic/claude-haiku-4-5" },
      "standard": { "model": "anthropic/claude-sonnet-4-5" },
      "advanced": { "model": "anthropic/claude-opus-4-6" }
    }
  }
}
```

**Current agent→model mapping (from opencode.json):**

| Agent | Default Model | Quick | Standard | Advanced |
|-------|--------------|-------|----------|---------|
| Algorithm | claude-opus-4-6 | — | — | — |
| Architect | claude-sonnet-4-5 | claude-haiku-4-5 | claude-sonnet-4-5 | claude-opus-4-6 |
| Engineer | claude-sonnet-4-5 | claude-haiku-4-5 | claude-sonnet-4-5 | claude-opus-4-6 |
| general | claude-sonnet-4-5 | claude-haiku-4-5 | claude-sonnet-4-5 | claude-opus-4-6 |
| explore | claude-haiku-4-5 | — | — | — |
| Intern | claude-haiku-4-5 | claude-haiku-4-5 | claude-haiku-4-5 | claude-sonnet-4-5 |
| Writer | claude-sonnet-4-5 | claude-haiku-4-5 | claude-sonnet-4-5 | claude-opus-4-6 |
| DeepResearcher | claude-sonnet-4-5 | claude-haiku-4-5 | claude-sonnet-4-5 | claude-opus-4-6 |
| GeminiResearcher | google/gemini-2.5-flash | — | — | — |
| GrokResearcher | xai/grok-4-1-fast | — | — | — |
| PerplexityResearcher | perplexity/sonar | — | — | — |
| CodexResearcher | claude-sonnet-4-5 | claude-haiku-4-5 | claude-sonnet-4-5 | claude-opus-4-6 |
| QATester | claude-sonnet-4-5 | — | — | — |
| Pentester | claude-sonnet-4-5 | claude-haiku-4-5 | claude-sonnet-4-5 | claude-opus-4-6 |
| Designer | claude-sonnet-4-5 | claude-haiku-4-5 | claude-sonnet-4-5 | claude-opus-4-6 |
| Artist | claude-sonnet-4-5 | claude-haiku-4-5 | claude-sonnet-4-5 | claude-opus-4-6 |

> ⚠️ **Always verify against `opencode.json` — this table may lag changes.**

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

Set in `.env` at project root (auto-loaded by Bun, never committed):

| Variable | Purpose | Where Used |
|----------|---------|-----------|
| `OPENCODE_LSP_ENABLE` | Opt-in to LSP integration | `PAI-Install/engine/steps-fresh.ts` |
| `PAI_LOG_LEVEL` | Plugin logging verbosity | `pai-unified.ts` handlers |

---

## Plugin Configuration

The plugin (`pai-unified.ts`) is loaded automatically by OpenCode from `.opencode/plugins/`. No explicit registration needed — OpenCode discovers all `.ts` files in that directory.

Plugin behavior is configured via:
1. `settings.json` values (read at runtime)
2. Hard-coded constants in handler files
3. Environment variables

There is no separate plugin config file — all tuning is done in the handler source or environment.
