# PAI-OpenCode

[![Status](https://img.shields.io/badge/status-v0.9.1%20Integration%20Complete-blue)](https://github.com/Steffen025/pai-opencode)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![PAI Version](https://img.shields.io/badge/PAI-2.3-green)](https://github.com/danielmiessler/PAI)

> A community-driven port of Daniel Miessler's PAI 2.3 from Claude Code to OpenCode

![PAI-OpenCode Hero Banner](docs/images/hero-banner.png)

---

## Vision

PAI-OpenCode brings the power of PAI (Personal AI Infrastructure) to the OpenCode platform. This is a systematic, documented migration that validates PAI 2.0's platform independence promise while creating a shareable foundation for the community. We're not just porting code—we're proving that sophisticated AI scaffolding can transcend any single platform.

---

## What is PAI?

[PAI (Personal AI Infrastructure)](https://github.com/danielmiessler/PAI) is an open-source scaffolding system created by Daniel Miessler for building AI-powered personal assistants. PAI extends AI coding environments with sophisticated capabilities that vanilla installations lack.

### PAI 2.0 Core Concepts

**Packs** - Self-contained bundles of functionality distributed as single markdown files. Each pack contains complete code, configuration, and documentation needed to add capabilities to your AI assistant.

**Skills** - Domain expertise packages that auto-activate based on natural language triggers. Skills use progressive disclosure to load only what's needed, dramatically reducing token usage.

**Agents** - Specialized AI personalities (engineer, researcher, architect, designer, pentester) with unique voices and capabilities that can be delegated tasks and work in parallel.

**Two Loops Pattern** - PAI's architectural philosophy: an Outer Loop (Current → Desired state) combined with an Inner Loop (7-phase execution: Plan → Specify → Clarify → Apply → Validate → Archive → Release).

### Why PAI Matters

PAI transforms AI coding assistants from reactive chat interfaces into proactive, context-aware systems with memory, specialized expertise, and systematic workflows. It's the difference between talking to a chatbot and collaborating with a team of specialized experts who understand your context, maintain continuity across sessions, and follow disciplined development practices.

![Why PAI Matters - The Transformation](docs/images/why-pai-matters-transformation.png)

---

## Why This Port?

**The Platform Reality:** Daniel's PAI 2.0 was initially built for Claude Code. While PAI promises platform independence through its pack-and-bundle architecture, the actual migration to OpenCode requires significant adaptation:

- **Different Extension Systems**: Claude Code uses hooks (JSON configuration), OpenCode uses plugins (TypeScript modules)
- **Different Loading Mechanisms**: Claude Code lacks native lazy loading (requiring workarounds), OpenCode supports it natively
- **Different Session Management**: Each platform stores session data differently
- **Different API Patterns**: Agent delegation, tool execution, and event handling vary between platforms

**The Goal:** This port validates PAI 2.0's portability claims while documenting every adaptation required. We're creating a reusable blueprint for migrating PAI to any platform—proving the architecture is sound and the methodology works.

**The Community Benefit:** By documenting this migration thoroughly, we enable others to:
- Migrate PAI to OpenCode following our tested path
- Port PAI to other platforms (Cursor, Windsurf, etc.) using our lessons learned
- Understand the differences between platforms when building portable AI systems
- Contribute improvements back to the ecosystem

---

## Project Status

**Current Version:** v0.9.1 - Integration Complete ✅

**Progress to v1.0 Public Release:**

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
| v1.0 | **PUBLIC RELEASE** (Community-ready vanilla PAI 2.3) | ⚠️ NEXT |

**Recent Achievements:**
- **v0.9.1:** Agent Invocation Verification - Critical discovery about Task tool vs @syntax
- **v0.9:** Integration Testing - All components validated together
- **v0.8:** Converter Tool - 767 files migrated in 5 seconds
- **v0.7:** Plugin Adapter with security blocking, context injection

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

This project is a **pure vanilla PAI 2.0 port** to OpenCode. We include:

✅ **All PAI 2.0 Core Components:**
- 8 kai-* packs (kai-core-install, kai-hook-system, etc.)
- Skills system with progressive disclosure
- Agent delegation (intern, engineer, architect, designer, pentester)
- COMPLETE History system (OpenCode sessions + PAI knowledge layer: learnings/, research/, decisions/, ideas/, projects/)
- Hooks adapted as OpenCode plugins (6 core plugin equivalents)
- Constitutional framework and Two Loops architecture
- Voice system (if part of vanilla PAI 2.0)

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
| **Skills Loading** | LazyLoad Translation | OpenCode supports native lazy loading (92.5% token reduction) |
| **Hook System** | DEFERRED (needs research) | Plugins fundamentally different from hooks—requires investigation |
| **History System** | OpenCode Sessions (v1.0) | Use native session storage for public port |
| **Directory Structure** | Clean `.opencode/` | Project-level config, not global, with converter for PAI updates |

**Guiding Principle:** *Import capability over backwards compatibility.* We build on OpenCode natively while maintaining the ability to import PAI 2.0 updates via our converter tool.

![Migration Flow: Claude Code to OpenCode](docs/images/migration-flow.png)

**Full Technical Decisions:** See [constitution.md](constitution.md) Section IX for detailed rationale.

---

## Getting Started

**Note:** Installation guide coming in **v0.2** (next milestone).

### Prerequisites (When Available)

- OpenCode installed and configured
- Bun runtime (PAI uses Bun, not Node.js)
- ANTHROPIC_API_KEY environment variable

### Quick Start (Preview - Not Yet Functional)

```bash
# Clone the repository
git clone https://github.com/Steffen025/pai-opencode.git
cd pai-opencode

# Install PAI 2.0 packs
bun run install-packs.ts

# Verify installation
bun Tools/PaiArchitecture.ts check
```

**Current Status:** Foundation complete (workspace + git + research). Installation workflow in development.

### Converter Quick Start

The PAI→OpenCode converter tool translates PAI 2.x structure to OpenCode format automatically:

```bash
# Convert PAI 2.x to OpenCode format
bun run tools/pai-to-opencode-converter.ts --source ~/.claude --target .opencode

# Preview changes first (recommended)
bun run tools/pai-to-opencode-converter.ts --dry-run --verbose

# See all options
bun run tools/pai-to-opencode-converter.ts --help
```

**Key Features:**
- Automatic structure translation (skills/, hooks/, config/)
- Conflict detection and backup creation
- Dry-run mode for safe previewing
- Verbose logging for transparency
- Preserves existing OpenCode files

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

## What's Next?

**v0.9.1 Complete!** Integration testing done, critical agent invocation discovery documented.

### Key Discovery: Agent Invocation in OpenCode

```
Task({subagent_type: "Intern"})     → ✅ Clickable session
Task({subagent_type: "Architect"})  → ✅ Clickable session
@architect (in AI response)         → ❌ Just text, no agent called
@architect (user types in input)    → ✅ Works
```

**The insight:** OpenCode has TWO invocation contexts. AI uses `Task({subagent_type})`, users type `@agentname`.

### Project Progress

```
v0.1 ────→ v0.2 ────→ v0.3 ────→ v0.4 ────→ v0.5
  ✅        ✅        ✅         ✅         ✅

           ────→ v0.6 ────→ v0.7 ────→ v0.8 ────→ v0.9.1
                  ✅        ✅         ✅        ✅ (WE ARE HERE)

           ────→ v1.0 PUBLIC RELEASE 🚀
                  ⚠️ NEXT
```

**Upcoming:**
- **v1.0** - PUBLIC RELEASE (Community-ready vanilla PAI 2.3)
  - Final documentation review
  - Repository cleanup
  - Fresh system installation test
  - Community announcement

**Future (Post v1.0):**
- Ollama integration for local models
- Voice system
- Observability dashboard

**Follow our progress:** Watch this repository or check [ROADMAP.md](ROADMAP.md) for milestone updates.

---

**PAI-OpenCode** - *Bringing Personal AI Infrastructure to OpenCode, for the community.*
