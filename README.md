![PAI-OpenCode Hero Banner](docs/images/hero-banner.png)

# PAI-OpenCode

**Personal AI Infrastructure for OpenCode** — Bring Daniel Miessler's renowned PAI scaffolding to any AI provider.

[![Version](https://img.shields.io/badge/Version-1.2.0-brightgreen)](CHANGELOG.md)
[![OpenCode Compatible](https://img.shields.io/badge/OpenCode-Compatible-green)](https://github.com/anomalyco/opencode)
[![PAI Version](https://img.shields.io/badge/PAI-2.5-blue)](https://github.com/danielmiessler/Personal_AI_Infrastructure)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **v1.2.0 Release** — Real-time Observability Dashboard + 14 handlers. See [CHANGELOG.md](CHANGELOG.md).

---

## What is this?

PAI-OpenCode is the complete port of **Daniel Miessler's Personal AI Infrastructure (PAI)** to **OpenCode** — an open-source, provider-agnostic AI coding assistant.

![Architecture Overview](docs/images/architecture-overview.png)

**PAI** is a scaffolding system that makes AI assistants work better for *you*. It's not about which model you use — it's about the infrastructure around it:

- **Skills** — Modular capabilities (code review, security testing, research, design)
- **Agents** — Dynamic multi-agent orchestration
- **Memory** — Session history, project context, learning loops
- **Plugins** — Lifecycle automation (session init, security validation, observability)

**OpenCode** is an open-source alternative to Claude Code that supports 75+ AI providers — from Anthropic and OpenAI to Google, AWS Bedrock, Ollama, and beyond.

**PAI-OpenCode** = The best of both worlds.

---

## Why PAI-OpenCode?

| Challenge | Solution |
|-----------|----------|
| **PAI was built for Claude Code** (Anthropic only) | PAI-OpenCode works with **any AI provider** |
| **Vendor lock-in** limits your options | Switch providers freely while keeping your infrastructure |
| **Generic AI assistants** don't know your workflow | PAI's skills, memory, and plugins personalize to *your* needs |
| **One-shot interactions** lose context | PAI's memory system builds knowledge over time |

**The scaffolding is more important than the model.** PAI-OpenCode gives you:

✅ Provider freedom (Claude, GPT-4, Gemini, Llama, etc.)
✅ Full PAI infrastructure (skills, agents, memory, plugins)
✅ Real-time session sharing (OpenCode feature)
✅ Terminal + Desktop + Web clients
✅ Community-driven, open-source foundation

---

## Quick Start

```bash
# 1. Clone PAI-OpenCode
git clone https://github.com/Steffen025/pai-opencode.git
cd pai-opencode

# 2. Run the Installation Wizard
bun run .opencode/PAIOpenCodeWizard.ts

# 3. Start OpenCode
opencode
```

The wizard will ask you to:
- Choose your AI provider (8 options: Anthropic, OpenAI, Google, Groq, AWS Bedrock, Azure, ZEN free, Ollama)
- Set your name and timezone
- Name your AI assistant

**Takes ~2 minutes** and creates all necessary configuration files.

---

## Deep Personalization (Recommended)

After running the wizard, start OpenCode and paste this prompt for full personalization:

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

![Features Showcase](docs/images/features-showcase.png)

### 🎯 Skills System (29 Skills)
Modular, reusable capabilities invoked by name:
- **CORE** — Identity, preferences, auto-loaded at session start
- **Art** — Excalidraw-style visual diagrams
- **Browser** — Code-first browser automation
- **Security** — Pentesting, secret scanning
- **Research** — Cost-aware multi-provider research system (see below)

### 🤖 Agent Orchestration (16 Agents)
Dynamic multi-agent composition with specialized roles:
- **Agents Skill** — Create custom agents with personalities
- **RedTeam** — 32-agent adversarial analysis
- **Council** — 4-perspective decision-making

### 🧠 Memory & Learning
Persistent context across sessions:
- Session transcripts (`.opencode/MEMORY/SESSIONS/`)
- Project documentation (`.opencode/MEMORY/projects/`)
- Learning loops (`.opencode/MEMORY/LEARNINGS/`)

### 🔧 Plugin System (14 Handlers)
TypeScript lifecycle plugins with comprehensive coverage:
- **Context injection** at session start
- **Security validation** before commands
- **Voice notifications** (ElevenLabs + Google TTS + macOS say)
- **Implicit sentiment** detection from user messages
- **Tab state** updates for Kitty terminal
- **ISC tracking** and response capture
- **Rating capture** and learning loops
- **Observability** (real-time event streaming and monitoring)

### 🌐 75+ AI Providers
Use any AI provider:
- Anthropic (Claude)
- OpenAI (GPT-4)
- Google (Gemini)
- AWS Bedrock
- Groq, Mistral, Ollama, and more...

---

## Cost-Aware Research System

PAI-OpenCode includes a **3-tier research system** that optimizes for both quality and cost:

| Tier | Workflow | Agents | Cost | Trigger |
|------|----------|--------|------|---------|
| **Quick** (DEFAULT) | `QuickResearch` | 1 Claude | **$0 FREE** | "research X" |
| **Standard** | `StandardResearch` | 3 (Claude + Gemini + Perplexity) | ~$0.01 | "standard research" |
| **Extensive** | `ExtensiveResearch` | 4-5 providers | ~$0.10-0.50 | "extensive research" |

### Why This Matters

**Quick Research is FREE** — ClaudeResearcher uses Claude WebSearch, which is included in your Anthropic subscription. No API keys needed, no extra cost.

**Standard Research** adds multi-perspective coverage with Gemini and Perplexity for ~$0.01 per query.

**Extensive Research** requires explicit confirmation before running (cost gate) to prevent unexpected charges.

### Available Research Agents

| Agent | Model | Specialty | Cost |
|-------|-------|-----------|------|
| `ClaudeResearcher` | claude-sonnet-4-5 | Academic depth, scholarly synthesis | **FREE** |
| `GeminiResearcher` | gemini-1.5-pro | Multi-perspective analysis | ~$0.01 |
| `GrokResearcher` | grok-4-1-fast | Contrarian, social media, X access | ~$0.01 |
| `PerplexityResearcher` | sonar | Real-time news, breaking events | ~$0.01 |
| `PerplexityProResearcher` | sonar-pro | Deep investigation, extensive | ~$0.05 |
| `CodexResearcher` | gpt-4o | Technical, TypeScript-focused | ~$0.03 |

### Setup

Copy `.opencode/.env.example` to `.opencode/.env` and add your API keys:

```bash
cp .opencode/.env.example .opencode/.env
# Edit .env with your keys
```

**Required for Standard/Extensive only:**
- `PERPLEXITY_API_KEY` — $5/month includes sonar
- `GOOGLE_API_KEY` — Free tier available
- `XAI_API_KEY` — Very cheap (~$0.20/1M tokens)
- `OPENAI_API_KEY` — For CodexResearcher

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

**Key Principles:**
- **Preserve PAI's design** where possible
- **Adapt to OpenCode** where necessary
- **Document every change** in ADRs

---

## Documentation

| Document | Description |
|----------|-------------|
| [CHANGELOG.md](CHANGELOG.md) | Version history and release notes |
| [docs/WHAT-IS-PAI.md](docs/WHAT-IS-PAI.md) | PAI fundamentals explained |
| [docs/OPENCODE-FEATURES.md](docs/OPENCODE-FEATURES.md) | OpenCode unique features |
| [docs/PLUGIN-SYSTEM.md](docs/PLUGIN-SYSTEM.md) | Plugin architecture (14 handlers) |
| [docs/PAI-ADAPTATIONS.md](docs/PAI-ADAPTATIONS.md) | Changes from PAI 2.5 |
| [docs/MIGRATION.md](docs/MIGRATION.md) | Migration from Claude Code PAI |
| [ROADMAP.md](ROADMAP.md) | Version roadmap |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines |

**For Contributors:**
| Document | Description |
|----------|-------------|
| [PAI-to-OpenCode Mapping](.opencode/PAISYSTEM/PAI-TO-OPENCODE-MAPPING.md) | How to correctly import PAI components |

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

## License

MIT License — see [LICENSE](LICENSE) for details.

**PAI-OpenCode** is an independent port. Original PAI by Daniel Miessler, OpenCode by Anomaly.

---

## Get Started

```bash
git clone https://github.com/Steffen025/pai-opencode.git
cd pai-opencode && bun run .opencode/PAIOpenCodeWizard.ts && opencode
```

**Welcome to Personal AI Infrastructure, your way.**
