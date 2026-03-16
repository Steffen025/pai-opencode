---
title: PAI-OpenCode Agent Capability Matrix
description: Permissions, model tiers, tools, and MCP access for every agent type
type: reference
wp: WP-N8
updated: 2026-03-12
---

# PAI-OpenCode Agent Capability Matrix

> [!NOTE]
> **Source of truth for agent capabilities (WP-N8).** Model names are resolved from `opencode.json` — this document describes tiers and roles only.

---

## Overview

PAI-OpenCode defines agent types in `opencode.json` under the `agent` key. Each agent type has:
- A **default model tier** (quick / standard / advanced)
- Optionally **model tier overrides** per task complexity
- Inherits **session permissions** from `opencode.json` `permission` block

```text
Orchestrator (Algorithm)
    │
    ├── Task → Engineer (implementation)
    ├── Task → Architect (design/ADR)
    ├── Task → explore (fast search)
    ├── Task → Researcher agents (web/research)
    └── Task → Intern (simple batch work)
```

<details>
<summary>Agent hierarchy (Mermaid)</summary>

```mermaid
graph TD
    ORC[Algorithm<br/><i>advanced — orchestrates</i>]
    ORC --> ENG[Engineer<br/><i>standard — implements</i>]
    ORC --> ARC[Architect<br/><i>standard — designs</i>]
    ORC --> EXP[explore<br/><i>quick — codebase search</i>]
    ORC --> INT[Intern<br/><i>quick — simple tasks</i>]
    ORC --> WRT[Writer<br/><i>standard — docs</i>]
    ORC --> QA[QATester<br/><i>standard — testing</i>]
    ORC --> PEN[Pentester<br/><i>standard — security</i>]
    ORC --> DSG[Designer<br/><i>standard — UI/UX</i>]
    ORC --> ART[Artist<br/><i>standard — visuals</i>]
    ORC --> DRS[DeepResearcher<br/><i>standard — orchestrates research</i>]
    DRS --> GMR[GeminiResearcher]
    DRS --> GRK[GrokResearcher]
    DRS --> PPX[PerplexityResearcher]
    DRS --> CDX[CodexResearcher]
```

</details>

---

## Agent Type Reference

### Core Agents

| Agent | Default Tier | Primary Role | Spawned By |
|---|---|---|---|
| `Algorithm` | advanced | Full PAI Algorithm runs, orchestration | User directly |
| `Architect` | standard | System design, ADR writing | Algorithm |
| `Engineer` | standard | Implementation, code writing, file edits | Algorithm |
| `general` | standard | General purpose fallback | Algorithm |
| `explore` | quick | Fast codebase exploration, file search | Algorithm |
| `Intern` | quick | Simple batch tasks, data transformation | Algorithm |
| `Writer` | standard | Documentation, content, changelogs | Algorithm |
| `QATester` | standard | Quality assurance, test writing, review | Algorithm |

### Specialist Agents

| Agent | Default Tier | Primary Role | Notes |
|---|---|---|---|
| `Pentester` | standard | Security testing, vulnerability analysis | Offensive security — use with purpose |
| `Designer` | standard | UI/UX design, component specs | — |
| `Artist` | standard | Visual content, image generation prompts | — |

### Research Agents

| Agent | Default Tier | Primary Role | Data Source |
|---|---|---|---|
| `DeepResearcher` | standard | Research orchestration | Delegates to sub-researchers |
| `GeminiResearcher` | configured in `opencode.json` | Multi-perspective research | Google Gemini (or equivalent) |
| `GrokResearcher` | configured in `opencode.json` | Contrarian / fact-based analysis | xAI Grok (or equivalent) |
| `PerplexityResearcher` | configured in `opencode.json` | Real-time web search | Perplexity (or equivalent) |
| `CodexResearcher` | standard | Technical archaeology | Multiple models |

> [!NOTE]
> Research agents that use external providers (Gemini, Grok, Perplexity) require the corresponding API keys and provider configuration in `opencode.json`. The specific model IDs are set by the user — see `Configuration.md` for the agent model routing schema.

---

## Model Tier Matrix

All agents that support model tiers follow the same tier → model mapping defined in `opencode.json`.

| Tier | Cost | When to Use |
|---|---|---|
| `quick` | Low | Simple lookups, search, batch ops, data transformation |
| `standard` | Medium | Default — implementation, research, documentation |
| `advanced` | High | Complex reasoning, critical architecture, orchestration |

### Tier Override Usage

```typescript
// Default tier (omit model_tier)
Task({ subagent_type: "Engineer", prompt: "..." })

// Quick tier — fast/cheap for simple work
Task({ subagent_type: "Engineer", model_tier: "quick", prompt: "..." })

// Advanced tier — best quality when it matters
Task({ subagent_type: "Architect", model_tier: "advanced", prompt: "..." })
```

### Per-Agent Tier Support

| Agent | quick | standard | advanced | Fixed (no override) |
|---|---|---|---|---|
| `Algorithm` | — | — | — | ✅ (always advanced) |
| `Architect` | ✅ | ✅ | ✅ | — |
| `Engineer` | ✅ | ✅ | ✅ | — |
| `general` | ✅ | ✅ | ✅ | — |
| `explore` | — | — | — | ✅ (always quick) |
| `Intern` | ✅ | ✅ | ✅ (→ standard) | — |
| `Writer` | ✅ | ✅ | ✅ | — |
| `DeepResearcher` | ✅ | ✅ | ✅ | — |
| `GeminiResearcher` | ✅ | ✅ | ✅ | — |
| `GrokResearcher` | ✅ | ✅ | ✅ | — |
| `PerplexityResearcher` | ✅ | ✅ | ✅ | — |
| `CodexResearcher` | ✅ | ✅ | ✅ | — |
| `QATester` | — | — | — | ✅ (always standard) |
| `Pentester` | ✅ | ✅ | ✅ | — |
| `Designer` | ✅ | ✅ | ✅ | — |
| `Artist` | ✅ | ✅ | ✅ | — |

> [!IMPORTANT]
> `Algorithm` and `explore` are **fixed** — no tier override applies. `QATester` has a single model with no tier override in the current config.

---

## Tool Access

All agents inherit the session's tool permissions from `opencode.json`. The current permission block:

```json
"permission": {
  "*": "allow",
  "websearch": "allow",
  "codesearch": "allow",
  "webfetch": "allow",
  "doom_loop": "ask",
  "external_directory": "ask"
}
```

### Native Tool Access by Agent Role

| Tool Category | Algorithm | Engineer | Architect | explore | Intern | Researcher |
|---|---|---|---|---|---|---|
| File read/write | ✅ | ✅ | ✅ | Read only | ✅ | Read only |
| Bash / shell | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Web search | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Web fetch | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Task (spawn subagent) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Custom tools (PAI) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `doom_loop` | ask | ask | ask | ask | ask | ask |
| `external_directory` | ask | ask | ask | ask | ask | ask |

> [!NOTE]
> The `explore` agent is designed for **read-only codebase exploration**. It uses `grep`, `glob`, and `read` only — no bash, no writes. Use `Engineer` for any operation that modifies files.

### PAI Custom Tools (WP-N1 + WP-N7)

| Tool | Available To | Description |
|---|---|---|
| `session_registry` | All agents | Lists recent sessions with summaries |
| `session_results` | All agents | Detailed results for a specific session ID |
| `code_review` | All agents | Runs roborev AI code review on changed files |

---

## MCP Tool Access

MCP servers are configured globally and available to all agents in a session. Each server exposes its own tools.

### Configuring MCP Servers

MCP servers are defined in your `opencode.json` under the `mcp` key. Each server you add exposes its own tools automatically to all agents in a session.

```jsonc
// opencode.json
{
  "mcp": {
    "my-server": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@my-org/my-mcp-server"]
    },
    "remote-server": {
      "type": "sse",
      "url": "https://my-mcp-endpoint.example.com/sse"
    }
  }
}
```

> [!TIP]
> Run `/mcp` in an OpenCode session to see all currently connected MCP servers and their available tools.

> [!NOTE]
> Which MCP servers you configure is entirely up to your workflow. Common categories include project management tools, documentation lookups, CI/CD systems, and external APIs. See [`Configuration.md`](./Configuration.md) for the full `mcp` schema.

### Detecting Active MCP Servers

```bash
# List MCP server keys defined in your local opencode.json
jq '.mcp | keys' opencode.json
```

---

## Agent Selection Guide

| Task | Recommended Agent | Tier | Rationale |
|---|---|---|---|
| Complex implementation, multi-file | `Engineer` | standard | Default implementation role |
| Simple rename, search-replace | `Engineer` | quick | Doesn't need standard for mechanical ops |
| Architecture decisions, ADR writing | `Architect` | standard | Design role |
| Major redesign, critical ADR | `Architect` | advanced | Best quality for high-stakes decisions |
| Find files, search codebase | `explore` | — (fixed quick) | 2-second rule — fastest option |
| Documentation, README, changelogs | `Writer` | standard | Dedicated writing role |
| Live web search, real-time facts | `PerplexityResearcher` | — (fixed Sonar) | Real-time web index |
| Deep multi-angle research | `DeepResearcher` | standard | Orchestrates multiple sub-researchers |
| Contrarian / fact-check | `GrokResearcher` | — (fixed Grok) | xAI contrarian analysis |
| Security testing | `Pentester` | standard | Purpose-built security role |
| Batch/trivial data tasks | `Intern` | quick | Lowest cost for mechanical work |

---

## Decision Rules

> [!IMPORTANT]
> **2-Second Rule:** If `grep`, `glob`, or `read` can answer in <2 seconds, do NOT spawn an agent. Agent spawn overhead is 5–15s plus potential permission prompt.

| Situation | Action |
|---|---|
| Search within 1–3 known files | Use `grep`/`glob`/`read` directly |
| Unknown codebase structure, 5+ files | Spawn `explore` |
| Multi-step implementation work | Spawn `Engineer` |
| You need a web search result | Spawn `PerplexityResearcher` |
| You need architecture advice | Spawn `Architect` |
| Multiple independent criteria | Parallelize with `Promise.all` over multiple `Task` calls |

---

## References

- `opencode.json` — authoritative agent + model configuration
- `docs/architecture/ToolReference.md` — full tool catalog with usage examples
- `docs/architecture/Configuration.md` — `opencode.json` schema reference
- `AGENTS.md` — Algorithm operating instructions (CAPABILITIES SELECTION section)

---

## Installer Preset Coverage (WP-N9)

The installer generates `opencode.json` for 4 provider presets. Each preset configures the orchestrator and all agent model routes:

| Preset | Orchestrator | Quick Tier | Standard Tier | Advanced Tier |
|--------|-------------|------------|---------------|---------------|
| **anthropic** | Claude Opus 4.6 | Claude Haiku 3.5 | Claude Sonnet 4.5 | Claude Opus 4.6 |
| **zen** | Claude Opus 4.6 (via Zen) | GLM 4.7 | Kimi K2.5 | Claude Sonnet 4.5 |
| **openrouter** | Kimi K2.5 (via OpenRouter) | GLM 4.7 | Kimi K2.5 | Claude Sonnet 4.5 |
| **openai** | GPT-4o | GPT-4o-mini | GPT-4o | GPT-4.1 |
