# ADR-018: roborev Code Review Integration

**Status:** Accepted
**Date:** 2026-03-12
**Deciders:** Steffen (maintainer)
**Tags:** code-quality, developer-experience, ci, plugin

---

## Context

PAI-OpenCode lacked automated code review tooling. After a feature is built, there was
no structured way to:

1. Catch code quality issues before committing
2. Verify plugin patterns (no `console.log`, handler structure) automatically
3. Run AI-powered architectural review of changes
4. Enforce PAI-specific conventions across contributors

The Algorithm's VERIFY phase needed a concrete, reproducible way to prove code quality beyond
"I looked at it." We needed a tool that: is MIT-licensed, works offline (no cloud dependency),
supports OpenCode explicitly, and integrates without requiring accounts or API keys.

---

## Decision

Integrate **roborev** as the code review tool for PAI-OpenCode:

1. **`.roborev.toml`** at repo root with `agent = "opencode"` and PAI-OpenCode-specific
   review guidelines (no console.log, handler pattern, no hardcoded models, Biome style).

2. **`roborev-trigger.ts` handler** in `.opencode/plugins/handlers/` following ADR-001's
   handler pattern. Provides a `code_review` custom tool the Algorithm can call during
   VERIFY or BUILD phases.

3. **Biome CI** via `.github/workflows/code-quality.yml` — runs `bun run lint` (Biome check)
   on every PR and push to `dev`/`main`. Catches formatting and linting issues before merge.

4. **CodeReview skill** at `.opencode/skills/CodeReview/SKILL.md` — documents the workflow,
   roborev commands, and how the Algorithm should integrate code review into its phases.

---

## Rationale

### Why roborev (and not alternatives)?

| Tool | License | Account Required | OpenCode Support | Decision |
|------|---------|-----------------|-----------------|----------|
| **roborev** | MIT ✅ | None ✅ | Explicit ✅ | **Chosen** |
| CodeRabbit CLI | Proprietary ❌ | Required ❌ | Rate-limited | Rejected |
| Manual review | N/A | None | N/A | Insufficient |
| Custom script | N/A | None | N/A | High maintenance |

roborev's key advantages:
- **MIT license** — safe for open-source embedding in README/INSTALL instructions
- **Locally executed** — no data leaves the machine, no account, no rate limits
- **Explicitly lists OpenCode** as a supported agent in its documentation
- **Active maintenance** — 713★, updated 2026-03-12
- **`roborev init` installs git hook** — automatic post-commit review with zero extra steps

### Why Biome (and not OXC/oxlint)?

Biome was already in the PAI stack. Adding OXC/oxlint would add complexity for marginal
gain — Biome covers 95%+ of TypeScript linting needs for this project. See also ADR-004
(file-based logging) for the philosophy of "right tool, not more tools."

### Why a plugin handler (not just a skill)?

The `code_review` tool in the plugin layer means:
- The Algorithm can invoke it as a first-class tool call (not a bash command)
- It handles the "roborev not installed" case gracefully with installation instructions
- It follows ADR-001's handler pattern — consistent with all other capabilities

---

## Alternatives Considered

### 1. CodeRabbit CLI
**Rejected** because: proprietary license, requires account registration, free tier has rate
limits. Not suitable for an open-source project where contributors should be able to use
all documented tools without accounts.

### 2. OXC / oxlint (in addition to Biome)
**Rejected** because: Biome already covers TypeScript linting and formatting. Adding a second
linter creates friction and maintenance overhead for marginal coverage gain on this project.
Revisit if a specific rule gap is identified.

### 3. Custom bash script for review
**Rejected** because: high maintenance burden, no LLM understanding, would need to encode
all PAI conventions manually as regex patterns.

### 4. No code review tooling
**Rejected** because: the Algorithm's VERIFY phase needs concrete, reproducible quality
evidence. "I read it" is not a verifiable criterion.

---

## Consequences

### ✅ Positive
- Algorithm can now cite `code_review tool exit 0` as evidence in VERIFY
- Post-commit hook runs automatic review on every commit (after `roborev init`)
- PAI-specific constraints are encoded in `.roborev.toml` review guidelines
- Biome CI catches formatting/linting issues before PR merge
- Zero external dependencies for basic usage (roborev is a local binary)

### ❌ Negative
- roborev requires separate installation (not bundled with `bun install`)
  - *Mitigation:* `INSTALL.md` documents the one-time setup; `code_review` tool returns
    installation instructions if roborev is not found.
- Biome CI adds ~30 seconds to PR checks
  - *Mitigation:* Acceptable trade-off for early feedback. Biome is very fast.
- roborev calls an LLM internally — costs tokens per review
  - *Mitigation:* roborev uses its own configuration for model selection; review is
    opt-in (not mandatory for every commit unless `roborev init` was run).

---

## References

- [roborev GitHub](https://github.com/roborev-dev/roborev) — MIT license, OpenCode support
- [Biome documentation](https://biomejs.dev) — linter/formatter
- [ADR-001](ADR-001-hooks-to-plugins-architecture.md) — handler pattern this follows
- [ADR-004](ADR-004-plugin-logging-file-based.md) — no console.log rule
- `.opencode/plugins/handlers/roborev-trigger.ts` — implementation
- `.opencode/skills/CodeReview/SKILL.md` — usage documentation
- `.github/workflows/code-quality.yml` — CI pipeline

---

## Related ADRs

- ADR-001: Handler pattern (roborev-trigger.ts follows this)
- ADR-004: File-based logging (roborev-trigger.ts uses file-logger.ts)
