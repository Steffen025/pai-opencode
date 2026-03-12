# Architecture Decision Records (ADRs)

**Purpose:** Document key architectural decisions made when porting PAI v2.4 to OpenCode.

---

## What Are ADRs?

Architecture Decision Records document **WHY** we made specific technical choices during the port. They explain:
- The context/problem we faced
- What we decided to do
- Why we chose that option
- What alternatives we considered
- What trade-offs we accepted

**Target Audience:**
- Contributors wanting to understand design rationale
- Users curious about port decisions
- Future maintainers (including future us!)
- Anyone porting PAI to another platform

---

## ADR Index

| ADR | Title | Status | Category | PR |
|-----|-------|--------|----------|----|
| [ADR-001](ADR-001-hooks-to-plugins-architecture.md) | Hooks → Plugins Architecture | ✅ Accepted | Platform Adaptation | v1.0 |
| [ADR-002](ADR-002-directory-structure-claude-to-opencode.md) | Directory Structure (.claude/ → .opencode/) | ✅ Accepted | Platform Convention | v1.0 |
| [ADR-003](ADR-003-skills-system-unchanged.md) | Skills System - 100% Unchanged | ✅ Accepted | Compatibility | v1.0 |
| [ADR-004](ADR-004-plugin-logging-file-based.md) | Plugin Logging (console.log → File-Based) | ✅ Accepted | Platform Adaptation | v1.0 |
| [ADR-005](ADR-005-configuration-dual-file-approach.md) | Configuration - Dual File Approach | ✅ Accepted | Platform Convention | v1.0 |
| [ADR-006](ADR-006-security-validation-preservation.md) | Security Validation Pattern Preservation | ✅ Accepted | Security | v1.0 |
| [ADR-007](ADR-007-memory-system-structure-preserved.md) | Memory System Structure Preserved | ✅ Accepted | Compatibility | v1.0 |
| [ADR-008](ADR-008-opencode-bash-workdir-parameter.md) | OpenCode Bash workdir Parameter | ✅ Accepted | Platform Adaptation | v1.0 |
| [ADR-009](ADR-009-handler-audit-opencode-adaptation.md) | Handler Audit — Claude-Code-specific Patterns | ✅ Accepted | Platform Adaptation | PR #42 |
| [ADR-010](ADR-010-shell-env-two-layer-system.md) | Shell.env + .env Two-Layer Env Variable System | ✅ Accepted | Platform Adaptation | PR #42 |
| [ADR-011](ADR-011-security-hardening.md) | Security Hardening — Prompt Injection Defense | ✅ Accepted | Security | WP-B |

---

## Categories

### Platform Adaptation
Decisions about translating Claude Code patterns to OpenCode platform.
- ADR-001: Hooks → Plugins
- ADR-004: File-based logging
- ADR-008: Bash workdir parameter (stateless shell)
- ADR-009: Handler audit — Claude-Code-specific patterns fixed
- ADR-010: shell.env + .env two-layer environment variable system

### Platform Convention
Decisions about following OpenCode conventions vs PAI patterns.
- ADR-002: Directory structure
- ADR-005: Dual configuration files

### Compatibility
Decisions prioritizing upstream PAI compatibility.
- ADR-003: Skills system unchanged
- ADR-007: Memory system structure preserved

### Security
Decisions about security and safety guarantees.
- ADR-006: Security validation preservation
- ADR-011: Prompt injection defense & audit logging (WP-B)

---

## How to Read These ADRs

**Start with these if you're:**

| You are... | Start here |
|------------|-----------|
| New to pai-opencode | ADR-001, ADR-003, ADR-006 |
| Migrating from PAI on Claude Code | ADR-002, ADR-005, ADR-007 |
| Contributing plugins | ADR-001, ADR-004 |
| Porting another skill from PAI | ADR-003 |
| Security-focused | ADR-006 |
| Understanding why X works this way | Search for keyword in ADR titles |

---

## ADR Template

When adding new ADRs, use this structure:

```markdown
# ADR-NNN: [Title]

**Status:** [Proposed | Accepted | Deprecated | Superseded by ADR-XXX]
**Date:** YYYY-MM-DD
**Deciders:** [Who made this decision]
**Tags:** [category, keywords]

---

## Context
[What is the situation? What problem are we solving?]

---

## Decision
[What did we decide to do?]

---

## Rationale
[WHY did we choose this option?]

---

## Alternatives Considered
### 1. [Alternative Name]
**Rejected** because: [reasons]

---

## Consequences
### ✅ **Positive**
- [Good thing 1]
- [Good thing 2]

### ❌ **Negative**
- [Trade-off 1]
  - *Mitigation:* [How we handle it]

---

## References
- [Links to code, docs, or related resources]

---

## Related ADRs
- ADR-XXX: [Related decision]
```

---

## OpenCode-Native ADRs (ADR-012 to ADR-016)

These ADRs document the **native OpenCode transformation** — the shift from "port"
to "genuinely native". See `docs/epic/EPIC-v3.0-OpenCode-Native.md` for context.

| ADR | Title | Status | WP |
|-----|-------|--------|----|
| ADR-012 | Session Registry as Custom Plugin Tool | ✅ Merged | WP-N1 |
| ADR-013 | Algorithm Session Awareness Post-Compaction | ✅ Merged | WP-N3 |
| ADR-014 | LSP-Native Code Navigation | ✅ Merged | WP-N4 |
| ADR-015 | Compaction Intelligence via Plugin Hook | ✅ Merged | WP-N2 |
| ADR-016 | Session Fork for Experiment Isolation | ✅ Merged | WP-N4 |
| ADR-017 | System Self-Awareness Documentation | ✅ Merged | WP-N6 |
| ADR-018 | roborev Code Review + Biome CI Pipeline | ✅ Accepted | WP-N7 |

## Legacy Future ADRs

| Topic | Why It Matters | Status |
|-------|----------------|--------|
| Config Hierarchy (6-Level) | Understanding override precedence | Future |
| Relationship Memory Names | Hardcoded @Jeremy/@Steffen → config-based | Future |
| Session-Scoped Response Cache | Global cache causes cross-session pollution | Future |

---

## Contributing ADRs

**When to create an ADR:**
- You're making a significant architectural choice
- Future contributors will ask "why did we do it this way?"
- There were trade-offs or alternatives worth documenting
- The decision affects multiple components or users

**When NOT to create an ADR:**
- Routine bug fixes (not architectural)
- Obvious/standard choices (no alternatives considered)
- Temporary decisions (will be replaced soon)

**Process:**
1. Copy template above
2. Fill in all sections (especially Alternatives and Consequences)
3. Get feedback from maintainers
4. Merge and update this README index

---

## Questions?

- **"Why isn't X decision documented?"** - Might be obvious, routine, or we missed it! Open an issue.
- **"Can I propose changing an Accepted ADR?"** - Yes! Create a new ADR that supersedes it.
- **"How do ADRs relate to MIGRATION.md?"** - ADRs explain WHY, MIGRATION.md explains HOW.

---

*Last Updated: 2026-03-12*
*ADRs Created: 18 (ADR-011: Security Hardening — WP-B; ADR-012–018: OpenCode-Native Transformation — ADR-012–017 merged, ADR-018 WP-N7)*
