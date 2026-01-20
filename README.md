# PAI-OpenCode

[![Status](https://img.shields.io/badge/status-v1.0.0%20Released-brightgreen)](https://github.com/Steffen025/pai-opencode)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![PAI Version](https://img.shields.io/badge/PAI-2.3-green)](https://github.com/danielmiessler/PAI)

> A community-driven port of Daniel Miessler's PAI 2.3 from Claude Code to OpenCode

![PAI-OpenCode Hero Banner](docs/images/hero-banner.png)

---

## New to PAI? Start Here

**PAI (Personal AI Infrastructure)** is an open-source scaffolding system by [Daniel Miessler](https://github.com/danielmiessler/PAI) that transforms AI coding assistants from unreliable chatbots into dependable, context-aware systems.

### The Core Insight: Scaffolding > Model

![The Core Principle - Architecture Matters More Than AI Power](docs/images/scaffolding-greater-than-model.png)

**The problem:** Raw AI models hallucinate, give inconsistent outputs, and forget context between sessions.

**The solution:** PAI wraps the AI in structured workflows, validation layers, and persistent memory - turning chaos into reliability.

### The AI Evolution (Why PAI is Different)

| Level | What It Does | Example |
|-------|--------------|---------|
| **Chatbots** | Ask → Answer → Forget | ChatGPT, vanilla Claude |
| **Agentic Platforms** | Ask → Use Tools → Get Result | Claude Code, Cursor, OpenCode |
| **PAI** | Observe → Think → Plan → Execute → Verify → **Learn** → Improve | This project |

The key difference: **Continuous learning and personal context retention.**

### PAI's Building Blocks

| Component | What It Does |
|-----------|--------------|
| **Skills** | Domain expertise that auto-activates on triggers ("security audit" → loads security skill) |
| **Agents** | Specialized AI personalities (Engineer, Architect, Researcher) that work in parallel |
| **Memory** | Learnings, decisions, and context that persist across sessions |
| **Hooks/Plugins** | Lifecycle events that inject context, block dangerous commands, capture history |

**Full documentation:** [danielmiessler/PAI](https://github.com/danielmiessler/PAI) - the original, authoritative source.

---

## What is PAI-OpenCode?

**This project ports PAI to [OpenCode](https://github.com/anomalyco/opencode)** - a community-driven migration proving that PAI's architecture transcends any single platform.

We're not just copying files. We're documenting every adaptation, solving platform differences, and creating a blueprint for porting PAI anywhere.

### Why Port PAI?

| Challenge | Our Solution |
|-----------|--------------|
| Hooks → Plugins | Unified TypeScript plugin with security blocking + context injection |
| Different lazy loading | Native OpenCode skill loading |
| Agent delegation differences | Hybrid Task API + subagent mapping |
| Session management | OpenCode-native storage + PAI memory layer |

**The result:** A working PAI 2.3 installation on OpenCode, with a converter tool that migrates 767 files in 5 seconds.

---

## Project Status

**Current Version:** v1.0.0 - Public Release ✅

**Development Progress:**

| Milestone | Description | Status |
|-----------|-------------|--------|
| v0.1 | Foundation (Workspace + Git + Research) | ✅ DONE |
| v0.2 | Vanilla Install (PAI 2.0 packs) | ✅ DONE |
| v0.3 | Skills Translation (OpenCode lazy loading) | ✅ DONE |
| v0.4 | Agent Delegation (Hybrid Task API) | ✅ DONE |
| v0.4.2 | Agent Profiles (Provider switching) | ✅ DONE |
| v0.5 | Plugin Infrastructure (Hook→Plugin translation) | ✅ DONE |
| v0.6 | PAI 2.3 Alignment (Structure reset, MEMORY/, CORE split) | ✅ DONE |
| v0.7 | **Plugin Adapter** (Security blocking, context injection) | ✅ DONE |
| v0.8 | **Converter Tool** (PAI→OpenCode translator) | ✅ DONE |
| v0.9 | Integration Testing + Documentation | ✅ DONE |
| v0.9.1 | Agent Invocation Verification | ✅ DONE |
| v1.0 | **PUBLIC RELEASE** (Community-ready vanilla PAI 2.3) | ✅ DONE |

**Recent Achievements:**
- **v1.0.0:** PUBLIC RELEASE - Community-ready vanilla PAI 2.3 on OpenCode
- **v0.9.1:** Agent Invocation Verification - Critical discovery about Task tool vs @syntax
- **v0.9:** Integration Testing - All components validated together
- **v0.8:** Converter Tool - 767 files migrated in 5 seconds

### Milestone Highlights

**v0.9.1 - Agent Invocation Discovery**

![v0.9 All Systems Go](docs/images/v0.9-launchpad-all-systems-go.png)

Critical finding: `Task({subagent_type: "AgentName"})` works for AI-to-Agent delegation, while `@agentname` only works for user input.

**v0.8 - Automatic Migration Converter**

![v0.8 Converter - Translation Layer](docs/images/v0.8-converter-translation-layer.png)

Converts entire PAI 2.x installation to OpenCode in 5 seconds. 767 files, zero manual edits.

**v0.7 - Plugin Adapter**

![v0.7 Plugin Adapter - Security Shield](docs/images/v0.7-plugin-adapter.png)

Security blocking, context injection, all 4 tests passing.

**v0.7 Resolved Issues:**
| Issue | Resolution |
|-------|------------|
| TUI Corruption | ✅ Fixed with file-only logging to `/tmp/pai-opencode-debug.log` |
| Security Blocking | ✅ Working via `tool.execute.before` + throw Error |
| Context Injection | ✅ Working via `experimental.chat.system.transform` |

**Deferred to v1.x (Post-Release):**
- Voice System (if not part of vanilla PAI 2.3 core)
- Observability Dashboard (community plugins phase)
- Ollama deep integration (local model support)
- Daniel Miessler's additional packs (importable via Converter)

**Full Roadmap:** See [ROADMAP.md](ROADMAP.md) for detailed milestone specifications.

---

## Scope

### What's IN Scope (v1.0)

This project is a **pure vanilla PAI 2.3 port** to OpenCode. We include:

✅ **All PAI 2.3 Core Components:**
- 8 kai-* packs (kai-core-install, kai-hook-system, etc.)
- Skills system with progressive disclosure (20+ skills)
- Agent delegation (13 named agents: Intern, Engineer, Architect, Designer, Pentester, etc.)
- COMPLETE History system (OpenCode sessions + PAI knowledge layer)
- Unified Plugin (security blocking + context injection)
- Constitutional framework and Two Loops architecture

✅ **Platform Adaptation Layer:**
- Converter tool for importing PAI updates
- Skill format translation for OpenCode lazy loading
- Hook → Plugin adaptation
- Documentation for community use

### What's OUT of Scope (v1.0)

This is **NOT a fork with modifications**. We exclude:

❌ **Personal Customizations:**
- User-specific identity layers (TELOS, Ideology)
- Custom business contexts
- Personal workflow adaptations
- Private tools and extensions

❌ **Platform-Specific Experiments:**
- Untested feature additions
- Performance optimizations beyond vanilla
- New capabilities not in PAI 2.0

### The Vanilla Principle

**v1.0 = Pure PAI 2.0 on OpenCode.** Nothing more, nothing less.

This ensures:
1. The port is a faithful reference implementation
2. Others can trust it as a starting point
3. Platform differences are clearly isolated
4. Personal extensions can be built on top (separately)

**After v1.0:** Personal customizations and extensions live in separate private projects, not in this public repository.

---

## Technical Approach

PAI-OpenCode makes **6 key technical decisions** documented in our Constitution:

| Decision | Approach | Rationale |
|----------|----------|-----------|
| **Configuration** | Clean Break + Converter | Maintain import capability, not backwards compatibility |
| **Agent Delegation** | Hybrid (Task API + Subagents) | PAI packs use Task tool, simple tasks use OpenCode native |
| **Skills Loading** | LazyLoad Translation | OpenCode supports native lazy loading |
| **Hook System** | DEFERRED (needs research) | Plugins fundamentally different from hooks—requires investigation |
| **History System** | OpenCode Sessions (v1.0) | Use native session storage for public port |
| **Directory Structure** | Clean `.opencode/` | Project-level config, not global, with converter for PAI updates |

**Guiding Principle:** *Import capability over backwards compatibility.* We build on OpenCode natively while maintaining the ability to import PAI 2.0 updates via our converter tool.

![Migration Flow: Claude Code to OpenCode](docs/images/migration-flow.png)

**Full Technical Decisions:** See [constitution.md](constitution.md) Section IX for detailed rationale.

---

## Getting Started

### Prerequisites

- **OpenCode** installed ([github.com/anomalyco/opencode](https://github.com/anomalyco/opencode))
- **Bun** runtime ([bun.sh](https://bun.sh))
- **ANTHROPIC_API_KEY** environment variable set

### Installation (Clone = Ready)

The repository IS a complete PAI 2.3 installation. Just clone and run:

```bash
# 1. Clone the repository
git clone https://github.com/Steffen025/pai-opencode.git
cd pai-opencode

# 2. Install dependencies
bun install

# 3. Start OpenCode with PAI
opencode
```

That's it! PAI 2.3 is now running on OpenCode with:
- 20+ skills (auto-loaded on triggers)
- 13 named agents (Intern, Engineer, Architect, Designer, Pentester, etc.)
- Unified Plugin (security blocking, context injection)

### Verify Installation

In OpenCode, try these commands:
- `/skills` - List available skills
- `/agents` - List available agents
- Ask: "What skills do you have?" - Should list PAI skills

### For Existing PAI Users (Migration)

If you have an existing PAI installation on Claude Code, use the converter:

```bash
bun Tools/pai-to-opencode-converter.ts --source ~/.claude --target .opencode --dry-run
```

See [docs/CONVERTER.md](docs/CONVERTER.md) for detailed migration guide.

---

## Contributing

We welcome contributions! Here's how you can help:

### Ways to Contribute

- **Test the Migration**: Try installing PAI-OpenCode and report issues
- **Document Edge Cases**: Found a quirk? Document it for others
- **Improve Documentation**: Help make our guides clearer
- **Share Feedback**: Tell us what works and what doesn't
- **Report Bugs**: File issues with detailed reproduction steps

### Contribution Guidelines

1. **Read the Constitution**: Our [constitution.md](constitution.md) defines project principles and scope
2. **Check Existing Issues**: Avoid duplicates by searching first
3. **Stay Vanilla**: v1.0 is pure PAI 2.0—no custom features in this repo
4. **Document Thoroughly**: Explain your reasoning and decisions
5. **Test Before Submitting**: Ensure changes don't break existing functionality

### Code of Conduct

Be respectful, constructive, and collaborative. This is a community project—we're learning together.

---

## Credits & Acknowledgments

### Daniel Miessler - Original PAI Creator

This project would not exist without [Daniel Miessler's](https://github.com/danielmiessler) groundbreaking work on PAI (Personal AI Infrastructure). Daniel designed PAI's architecture, created the pack-and-bundle system, and pioneered the Two Loops methodology that makes sophisticated AI scaffolding possible.

**Original PAI Repository:** https://github.com/danielmiessler/PAI

PAI-OpenCode is a community-driven port that validates Daniel's vision of platform independence. All credit for PAI's core design, philosophy, and innovation belongs to Daniel.

### Port Maintainer

**Steffen** ([@Steffen025](https://github.com/Steffen025)) - PAI-OpenCode migration, documentation, and community contribution

### Research & Documentation

This port is based on comprehensive research (48-page synthesis) of PAI 2.0's architecture, pack system, and design principles. See `research/SYNTHESIS.md` for the complete analysis.

---

## License

**MIT License** - Same as the [original PAI repository](https://github.com/danielmiessler/PAI).

This project is open source and free to use, modify, and distribute. See [LICENSE](LICENSE) for details.

**In Daniel's words:**
> "Do whatever you want with this. Build on it, sell it, modify it. Just don't blame us if something breaks. Attribution appreciated but not required."

---

## Project Links

- **Repository:** https://github.com/Steffen025/pai-opencode
- **Issues:** https://github.com/Steffen025/pai-opencode/issues
- **Roadmap:** [ROADMAP.md](ROADMAP.md)
- **Constitution:** [constitution.md](constitution.md)
- **Research:** [research/SYNTHESIS.md](research/SYNTHESIS.md)

---

## v1.0 Released!

**PAI-OpenCode v1.0.0 is now available!** A complete, community-ready port of PAI 2.3 to OpenCode.

### What's Included

- **20+ Skills** with native OpenCode lazy loading
- **13 Named Agents** with Task API delegation (Intern, Engineer, Architect, etc.)
- **Unified Plugin** for security blocking and context injection
- **Converter Tool** for migrating existing PAI installations (767 files in 5 seconds)
- **Comprehensive Documentation** for getting started

### Known Limitations (OpenCode API)

Some PAI 2.3 features cannot be ported due to OpenCode's architecture:

| Feature | Reason | Impact |
|---------|--------|--------|
| User Input Interception | OpenCode has no `UserPromptSubmit` event | Format enforcement, auto-work creation not available |
| Tab Title Updates | OpenCode tab API not exposed | No dynamic tab titles |
| Rating Capture | Requires `UserPromptSubmit` | Explicit/implicit rating capture not available |

These are **OpenCode platform limitations**, not implementation gaps. See [docs/HOOK-MAPPING.md](docs/HOOK-MAPPING.md) for full details.

### Key Discovery: Agent Invocation in OpenCode

```
Task({subagent_type: "Intern"})     → ✅ AI-to-Agent delegation
Task({subagent_type: "Architect"})  → ✅ AI-to-Agent delegation
@architect (user types in input)    → ✅ User-to-Agent invocation
```

### Future Roadmap (Post v1.0)

- **Ollama Integration** - Local model support for complete data sovereignty
- **Voice System** - Audio notifications and feedback
- **Observability Dashboard** - Performance and usage insights
- **Additional PAI Packs** - Importable via the Converter tool

**Follow our progress:** Watch this repository or check [ROADMAP.md](ROADMAP.md) for milestone updates.

---

**PAI-OpenCode** - *Bringing Personal AI Infrastructure to OpenCode, for the community.*
