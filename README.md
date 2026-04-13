![PAI-OpenCode Hero Banner](docs/images/hero-banner.jpg)

# PAI-OpenCode

**Personal AI Infrastructure for OpenCode** — Bring Daniel Miessler's renowned PAI scaffolding to any AI provider.

[![Version](https://img.shields.io/badge/Version-3.0.0-brightgreen)](CHANGELOG.md)
[![OpenCode Compatible](https://img.shields.io/badge/OpenCode-Compatible-green)](https://github.com/anomalyco/opencode)
[![PAI Version](https://img.shields.io/badge/PAI-3.0-blue)](https://github.com/danielmiessler/Personal_AI_Infrastructure)
[![Algorithm](https://img.shields.io/badge/Algorithm-1.8.0-blueviolet)](https://github.com/danielmiessler/TheAlgorithm)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> [!note]
> **v3.0 Release** — Zero-bootstrap context loading, Zen free out-of-box (no API key required), PAI Core Skill always-loaded via OpenCode's native skill system, plugin event bus, security hardening (prompt injection protection), terminal installer wizard + headless mode, DB health tooling, hierarchical skills structure, and 52 skills. See [CHANGELOG.md](CHANGELOG.md) and [UPGRADE.md](UPGRADE.md).

> **🎯 Scope Note:** PAI-OpenCode is a **community port** of PAI to OpenCode. For the future vision (Voice-to-Voice, Ambient AI, OMI integration), see **[Open Arc](https://github.com/jeremaiah-ai/openark)**.

---

## What is this?

PAI-OpenCode is the complete port of **Daniel Miessler's Personal AI Infrastructure (PAI v3.0)** to **OpenCode** — an open-source, provider-agnostic AI coding assistant.

![Architecture Overview](docs/images/architecture-overview.jpg)

**PAI** is a scaffolding system that makes AI assistants work better for *you*. It's not about which model you use — it's about the infrastructure around it:

- **The Algorithm (v1.8.0)** — 8 effort levels with Verify Completion Gate, Wisdom Frames, phase separation enforcement, and quality gates
- **Skills** — Modular capabilities (52 skills including AudioEditor, Cloudflare, ExtractWisdom, Security)
- **Agents** — Dynamic multi-agent orchestration with cost optimization via appropriate agent selection
- **Memory** — Session history, project context, learning loops, PRD system
- **Plugins** — Event-driven lifecycle automation (security validation, observability, algorithm tracking, DB health)
- **Installer** — CLI-only installer for easy setup
- **Security** — Prompt injection protection with 200+ patterns
- **DB Health** — Automated session archiving and maintenance

**OpenCode** is an open-source alternative to Claude Code that supports 75+ AI providers — from Anthropic and OpenAI to Google, AWS Bedrock, Ollama, and beyond.

**PAI-OpenCode** = The best of both worlds.

---

## Why PAI-OpenCode?

| Challenge | Solution |
|-----------|----------|
| **PAI was built for Claude Code** (Anthropic only) | PAI-OpenCode works with **any AI provider** |
| **Vendor lock-in** limits your options | Switch providers freely while keeping your infrastructure |
| **One model fits all** wastes money or quality | Each agent is configured with the right model for its role — use lightweight agents for simple work, heavy agents for complex reasoning |
| **Generic AI assistants** don't know your workflow | PAI's skills, memory, and plugins personalize to *your* needs |
| **One-shot interactions** lose context | PAI's memory system builds knowledge over time |

**The scaffolding is more important than the model.** PAI-OpenCode gives you:

✅ **Agent-based model routing** — match the right agent to the task; each agent has exactly one model configured in `opencode.json`
✅ Provider freedom (Claude, GPT-4, Gemini, Kimi, Ollama, etc.)
✅ Full PAI infrastructure (skills, agents, memory, plugins)
✅ Real-time session sharing (OpenCode feature)
✅ Terminal + Desktop + Web clients
✅ Community-driven, open-source foundation

> **Note:** Agent-based routing is provided by PAI-OpenCode's multi-agent system on top of OpenCode's multi-provider support. Other AI coding tools either lock you to one provider (Claude Code, Copilot) or let you switch manually (Cursor, Aider) — PAI-OpenCode routes different agents with different models based on task type.

---

## 📋 Scope: What PAI-OpenCode Is (and Isn't)

**PAI-OpenCode is a community contribution** — focused, minimal, "as little as necessary."

### ✅ What It IS

| Feature | Description |
|---------|-------------|
| **Core PAI Port** | Algorithm v3.7.0, Skills, TELOS on OpenCode |
| **OpenCode-Native** | Lazy Loading, Agent-based routing, Events, MCP integration |
| **Developer Tool** | Infrastructure for power users and developers |
| **Community-Driven** | Open source, documented, maintainable |
| **Minimal Context** | ~20KB core, not 233KB static loading |

### ❌ What It Is NOT (See [Open Arc](https://github.com/jeremaiah-ai/openark))

| Excluded Feature | Why Excluded | Belongs To |
|------------------|--------------|------------|
| **Voice-to-Voice** | Custom orchestration beyond core PAI | Open Arc |
| **OMI Ambient AI** | Hardware integration, product layer | Open Arc |
| **Branded UX** | End-user product experience | Open Arc |
| **SaaS Infrastructure** | User management, billing | Open Arc |

**The Rule:** If it's an OpenCode-native feature that improves PAI → **PAI-OpenCode**. If it's a new product abstraction → **Open Arc**.


---

## Quick Start

### New Users (Installer)

```bash
# Run the interactive terminal installer wizard
bash PAI-Install/install.sh

# Headless example (optional)
bash PAI-Install/install.sh --headless --name "Your Name" --ai-name "Jeremy"
```

### Manual Setup

```bash
# 1. Clone PAI-OpenCode
git clone https://github.com/Steffen025/pai-opencode.git
cd pai-opencode

# 2. Install dependencies
bun install

# 3. Run the installer (interactive wizard)
bash PAI-Install/install.sh

# 4. Start OpenCode
opencode
```

> **Already using OpenCode?** If you have an existing `~/.opencode` directory, see [Existing OpenCode Users](#existing-opencode-users) in the Installation Guide for symlink setup.

**Prerequisites:** [Git](https://git-scm.com/) and [Bun 1.3.9+](https://bun.sh/).

The installer wizard will:
- **Install vanilla OpenCode** from opencode.ai
- **Uses Zen free models by default** — no API key required to start
- Set your name and timezone
- Name your AI assistant

To add premium providers (Anthropic, OpenAI, OpenRouter), run `/connect` inside a running OpenCode session after install.

**Takes ~2-3 minutes** and creates all necessary configuration files.

---

## Switch Providers Anytime

After installation, you can switch to **any provider** at any time:

```bash
# See all available provider profiles
bun run .opencode/tools/switch-provider.ts --list

# Switch to OpenAI GPT models
bun run .opencode/tools/switch-provider.ts openai

# Switch to Ollama (local)
bun run .opencode/tools/switch-provider.ts local

# Check your current provider
bun run .opencode/tools/switch-provider.ts --current
```

Available profiles: `anthropic`, `openai`, `zen-paid`, `zen` (free), `local` (Ollama). See [Advanced Setup](docs/ADVANCED-SETUP.md) for multi-provider research routing.

---

## Deep Personalization (Recommended)

After running the installer, start OpenCode and paste this prompt for full personalization:

```
Let's do the onboarding. Guide me through setting up my personal context -
my name, my goals, my values, and how I want you to behave. Create the TELOS
and identity files that make this AI mine.
```

This **10-15 minute** interactive session will configure your complete TELOS framework:

| What Gets Created | Purpose |
|-------------------|---------|
| **Mission & Goals** | Your life purposes and specific objectives |
| **Challenges & Strategies** | What's blocking you and how to overcome it |
| **Values & Beliefs** | Core principles that guide decisions |
| **Narratives** | Your key talking points and messages |
| **Tech Preferences** | Languages, frameworks, tools you prefer |

**Why TELOS matters:** PAI becomes exponentially more useful when it knows your context. Generic AI gives generic advice. PAI with TELOS gives *you-specific* guidance.

---

## Features

![Features Showcase](docs/images/features-showcase.jpg)

### 🎯 Skills System (52 Skills)
Modular, reusable capabilities invoked by name:
- **PAI** — Core Algorithm, ISC, Capabilities — always-loaded via skill system (`tier:always`)
- **Art** — Excalidraw-style visual diagrams
- **Browser** — Code-first browser automation
- **Security** — Pentesting, secret scanning
- **Research** — Cost-aware multi-provider research system (see below)
- **ExtractWisdom** — Fabric-style wisdom extraction
- **Science** — Hypothesis-driven experimentation
- **Cloudflare** — Pages, Workers, R2, KV automation
- **Plus 44 more** — See `.opencode/skills/` for full list

### 🤖 Agent Orchestration (16 Agents)
Dynamic multi-agent composition — each agent is configured with exactly one model in `opencode.json`. Match the right agent to the task for cost optimization:

| Agent (runtime ID) | Best For |
|---|---|
| **`Algorithm`** | Full PAI Algorithm runs, orchestration |
| **`Architect`** | Architecture design, ADRs |
| **`Engineer`** | Feature implementation, bug fixes |
| **`DeepResearcher`** | Academic depth, scholarly synthesis |
| **`GeminiResearcher`** | Multi-perspective analysis |
| **`PerplexityResearcher`** | Real-time news, breaking events |
| **`GrokResearcher`** | Contrarian, social media, X access |
| **`CodexResearcher`** | Technical, TypeScript-focused research |
| **`Writer`** | Content creation, documentation |
| **`Pentester`** | Security audits |
| **`Intern`** | Lightweight tasks, simple edits |
| **`explore`** | Fast file/codebase exploration |
| **`QATester`** | Quality assurance |
| **`Designer`** | UX/UI design |
| **`Artist`** | Visual content |
| **`general`** | General-purpose fallback |

> [!NOTE]
> **Source of truth:** actual model assignments live in [`opencode.json`](./opencode.json) under the `agent` key. They vary per provider profile (Anthropic, Zen, OpenAI, Local). See [`.opencode/profiles/*.yaml`](./.opencode/profiles/) for the example presets the installer ships with.

For cost optimization, match the task to the right agent — use `Intern` or `explore` for lightweight work; use `Architect` or `Algorithm` for heavy reasoning.

### 🧠 Memory & Learning
Persistent context across sessions:
- Session transcripts (`.opencode/MEMORY/SESSIONS/`)
- Project documentation (`.opencode/MEMORY/projects/`)
- Learning loops (`.opencode/MEMORY/LEARNINGS/`)

### 🔧 Plugin System (20 Handlers)
TypeScript lifecycle plugins with comprehensive coverage:
- **User identity context** loaded at session start (ABOUTME, TELOS, DAIDENTITY, Steering Rules)
- **Security validation** before commands
- **Voice notifications** (ElevenLabs + Google TTS + macOS say)
- **Implicit sentiment** detection from user messages
- **Tab state** updates for Kitty terminal
- **ISC tracking** and response capture
- **Rating capture** and learning loops
- **Observability** (real-time event streaming and monitoring)
- **Algorithm tracking** — Monitors phase transitions and ISC progress
- **Agent execution guard** — Validates agent invocations
- **Skill guard** — Ensures skill prerequisites
- **Version check** — Algorithm version compatibility
- **Integrity check** — Session-end validation

> [!NOTE]
> PAI Core (Algorithm, ISC, Capabilities) is loaded automatically by OpenCode's native skill system via `tier:always`. The plugin handles user identity context only.

### 🌐 75+ AI Providers
Use any AI provider:
- Anthropic (Claude)
- OpenAI (GPT-4)
- Google (Gemini)
- AWS Bedrock
- Groq, Mistral, Ollama, and more...

---

## Provider Configuration

PAI-OpenCode ships with **Zen free as the default** — OpenCode Zen is pre-connected with free models, so you can start immediately with no API key.

| Provider | How to Enable | Cost |
|----------|---------------|------|
| **Zen free** (Default) | Works out of the box — no setup required | **FREE** |
| **Zen paid** | Run `/connect` in OpenCode → select Zen AI Gateway | ~$1-75/1M tokens depending on tier |
| **Anthropic API** | Add `ANTHROPIC_API_KEY` to `~/.opencode/.env`, then `/connect` | Pay-per-token |
| **OpenRouter** | Run `/connect` in OpenCode → select OpenRouter | Varies by model |
| **Ollama (local)** | Run `/connect` in OpenCode → select Ollama | **FREE** (your hardware) |

> **Anthropic Claude Max:** Using a Claude Max subscription (claude.ai) with OpenCode requires a community plugin not shipped with PAI-OpenCode due to Anthropic ToS concerns. See [INSTALL.md](INSTALL.md#️-anthropic-claude-max--important-note) for details.

### Connecting Providers After Install

Provider setup is a **two-step process** — no reinstall needed:

1. **Run `/connect`** inside OpenCode to store credentials:

```text
/connect
```

2. **Update agent model assignments** in `opencode.json` to point at your new provider:

```bash
bun run .opencode/tools/switch-provider.ts anthropic   # or zen-paid, openai, etc.
```

See [INSTALL.md](INSTALL.md#connecting-premium-providers) for the full walkthrough.

### Why This Design?

The key insight is **dynamic multi-provider routing within a single session**. Unlike tools locked to one provider, PAI-OpenCode can:

- Route the orchestrator to Anthropic (Opus 4.6) for complex decisions
- Route research agents to Zen (GLM 4.7, Kimi K2.5) for cost-effective search
- Route real-time queries to Perplexity (Sonar) for breaking news
- All in the **same task**, automatically

This is what PAI on OpenCode can do that PAI on Claude Code cannot — Claude Code is locked to Anthropic only.

**Easy to customize** later via [ADVANCED-SETUP.md](docs/ADVANCED-SETUP.md)

### Switching Provider Profiles

Use the provider switcher tool anytime after install:

```bash
bun run .opencode/tools/switch-provider.ts --list
bun run .opencode/tools/switch-provider.ts openai
```

---

## Agent-Based Cost Optimization

Each agent has exactly one model configured in `opencode.json`. The key to cost optimization is matching the right agent to the task:

| Task Type | Recommended Agent | Why |
|-----------|------------------|-----|
| Batch rename files | `Intern` or `Explore` | Lightweight agent for simple work |
| Implement auth middleware | `Engineer` | Balanced model for real coding tasks |
| Debug complex race condition | `Architect` | Heavy reasoning agent for complex problems |
| Quick web lookup | `DeepResearcher` | Configured for research tasks |
| Architecture decision | `Architect` | Designed for system design work |
| Algorithm orchestration | `Algorithm` | Highest capability for orchestration |

Use `explore` or `Intern` for cheap, fast tasks. Use `Architect` or `Algorithm` for complex reasoning. Model assignments are defined in `opencode.json`.

---

## Cost-Aware Research System

PAI-OpenCode includes a **3-tier research system** that optimizes for both quality and cost:

| Tier | Workflow | Agents | Cost | Trigger |
|------|----------|--------|------|---------|
| **Quick** (DEFAULT) | `QuickResearch` | 1 agent | **$0 FREE** | "research X" |
| **Standard** | `StandardResearch` | 3 (Claude + Gemini + Perplexity) | ~$0.01 | "standard research" |
| **Extensive** | `ExtensiveResearch` | 4-5 providers | ~$0.10-0.50 | "extensive research" |

### Why This Matters

**Quick Research is FREE** — Uses free tier or cached results. No API keys needed for basic queries.

**Standard Research** adds multi-perspective coverage with Gemini and Perplexity for ~$0.01 per query.

**Extensive Research** requires explicit confirmation before running (cost gate) to prevent unexpected charges.

### Available Research Agents

| Agent | Model | Specialty | Cost |
|-------|-------|-----------|------|
| `DeepResearcher` | Configured in `opencode.json` | Academic depth, scholarly synthesis | Free/Paid |
| `GeminiResearcher` | Gemini 2.5 Flash | Multi-perspective analysis | ~$0.002 |
| `GrokResearcher` | xAI Grok 4.1 Fast | Contrarian, social media, X access | ~$0.01 |
| `PerplexityResearcher` | Perplexity Sonar | Real-time news, breaking events | ~$0.01 |
| `CodexResearcher` | GPT-4.1 / GPT-5.1 | Technical, TypeScript-focused | ~$0.03 |

### Setup

Enable multi-provider research routing anytime:
```bash
bun run .opencode/tools/switch-provider.ts anthropic --multi-research
```

**Required API keys** (add to `~/.opencode/.env`):
| Key | For | Where to get |
|-----|-----|-------------|
| `GOOGLE_API_KEY` | GeminiResearcher | https://aistudio.google.com/apikey |
| `XAI_API_KEY` | GrokResearcher | https://console.x.ai/ |
| `PERPLEXITY_API_KEY` | PerplexityResearcher | https://perplexity.ai/settings/api |
| `OPENROUTER_API_KEY` | CodexResearcher | https://openrouter.ai/keys |

Missing a key? No problem — that researcher falls back to your primary provider.

---

## Architecture

PAI-OpenCode's design is documented through **Architecture Decision Records (ADRs)**—formal documents explaining *why* we made specific choices during the port from Claude Code to OpenCode.

| ADR | Decision | Why It Matters |
|-----|----------|----------------|
| [ADR-001](docs/architecture/adr/ADR-001-hooks-to-plugins-architecture.md) | Hooks → Plugins | OpenCode uses in-process plugins, not subprocess hooks |
| [ADR-002](docs/architecture/adr/ADR-002-directory-structure-claude-to-opencode.md) | `.claude/` → `.opencode/` | Platform directory convention |
| [ADR-003](docs/architecture/adr/ADR-003-skills-system-unchanged.md) | Skills System Unchanged | Preserves upstream PAI compatibility |
| [ADR-004](docs/architecture/adr/ADR-004-plugin-logging-file-based.md) | File-Based Logging | Prevents TUI corruption from console.log |
| [ADR-005](docs/architecture/adr/ADR-005-configuration-dual-file-approach.md) | Dual Config Files | PAI settings.json + OpenCode opencode.json |
| [ADR-006](docs/architecture/adr/ADR-006-security-validation-preservation.md) | Security Patterns Preserved | Critical security validation unchanged |
| [ADR-007](docs/architecture/adr/ADR-007-memory-system-structure-preserved.md) | Memory Structure Preserved | File-based MEMORY/ system unchanged |
| [ADR-008](docs/architecture/adr/ADR-008-opencode-bash-workdir-parameter.md) | Bash workdir Parameter | Critical platform difference for multi-repo workflows |
| [ADR-020](docs/architecture/adr/ADR-020-native-opencode-context-loading.md) | Zero Bootstrap / tier:always | PAI Core loads via native skill system, no custom bootstrap |

**Key Principles:**
- **Preserve PAI's design** where possible
- **Adapt to OpenCode** where necessary
- **Document every change** in ADRs

**Platform Differences:** See [PLATFORM-DIFFERENCES.md](docs/PLATFORM-DIFFERENCES.md) for a comprehensive guide to Claude Code vs OpenCode differences.

---

## Documentation

| Document | Description |
|----------|-------------|
| [CHANGELOG.md](CHANGELOG.md) | Version history and release notes |
| [docs/WHAT-IS-PAI.md](docs/WHAT-IS-PAI.md) | PAI fundamentals explained |
| [docs/OPENCODE-FEATURES.md](docs/OPENCODE-FEATURES.md) | OpenCode unique features |
| [docs/PLATFORM-DIFFERENCES.md](docs/PLATFORM-DIFFERENCES.md) | Claude Code vs OpenCode differences |
| [docs/PLUGIN-SYSTEM.md](docs/PLUGIN-SYSTEM.md) | Plugin architecture (20 handlers) |
| [docs/PAI-ADAPTATIONS.md](docs/PAI-ADAPTATIONS.md) | Changes from PAI v3.0 |
| [docs/MIGRATION.md](docs/MIGRATION.md) | Migration from Claude Code PAI |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines |

**Upstream Resources:**
- [Daniel Miessler's PAI](https://github.com/danielmiessler/Personal_AI_Infrastructure) — Original PAI documentation
- [OpenCode Documentation](https://docs.opencode.ai) — OpenCode official docs

---

## Credits

**PAI-OpenCode** stands on the shoulders of giants:

### Daniel Miessler — Personal AI Infrastructure
The original PAI vision and architecture. Daniel's work on personalized AI scaffolding is foundational to this project.
🔗 [github.com/danielmiessler/Personal_AI_Infrastructure](https://github.com/danielmiessler/Personal_AI_Infrastructure)

### Anomaly — OpenCode
The open-source, provider-agnostic runtime that makes PAI-OpenCode possible.
🔗 [github.com/anomalyco/opencode](https://github.com/anomalyco/opencode)
🔗 [docs.opencode.ai](https://docs.opencode.ai)

---

## Contributors

Thank you to everyone who has contributed code, content, or tooling to PAI-OpenCode:

| Contributor | Contribution |
|-------------|-------------|
| **[@eddovandenboom](https://github.com/eddovandenboom)** | PAI wrapper script — separate `pai` command, `--fix-symlink` flag ([PR #104](https://github.com/Steffen025/pai-opencode/pull/104)) |
| **[@ktneely](https://github.com/ktneely)** | Model profile updates for provider-agnostic routing ([PR #103](https://github.com/Steffen025/pai-opencode/pull/103), incorporated into [PR #107](https://github.com/Steffen025/pai-opencode/pull/107)) |
| **[@step-security-bot](https://github.com/step-security-bot)** | CI security hardening — pinned Actions SHA hashes, `permissions: contents: read` ([PR #106](https://github.com/Steffen025/pai-opencode/pull/106), incorporated into [PR #108](https://github.com/Steffen025/pai-opencode/pull/108)) |

*Want to contribute? See [CONTRIBUTING.md](CONTRIBUTING.md).*

---

## License

MIT License — see [LICENSE](LICENSE) for details.

**PAI-OpenCode** is an independent port. Original PAI by Daniel Miessler, OpenCode by Anomaly.

---

## Get Started

```bash
git clone https://github.com/Steffen025/pai-opencode.git
cd pai-opencode
bun install
bash PAI-Install/install.sh
opencode
```

For scripted installs, use `--headless`:

```bash
bash PAI-Install/install.sh --headless --name "Your Name" --ai-name "Jeremy"
```

**Welcome to Personal AI Infrastructure, your way.**
