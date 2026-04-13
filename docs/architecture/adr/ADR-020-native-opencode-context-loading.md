# ADR-020: Native OpenCode Context Loading (Bootstrap Removal)

**Status:** Accepted
**Date:** 2026-04-13
**Deciders:** Steffen Zellmer

---

## Context

PAI-OpenCode v2.x used a custom bootstrap mechanism (`MINIMAL_BOOTSTRAP.md`) loaded by the `pai-unified.ts` plugin via the `experimental.chat.system.transform` hook. This bootstrap served three purposes:

1. **Algorithm Essence** — A condensed summary of Algorithm v3.7.0 phases and ISC rules
2. **Skill Discovery Index** — A manual table listing all 50+ skills with their trigger phrases and paths
3. **User Identity Routing** — Instructions for loading ABOUTME, TELOS, DAIDENTITY files

The bootstrap was introduced in early v3.0 development as an interim solution while we were porting PAI's Claude Code `contextFiles` mechanism to OpenCode. The intent was "minimal useful context" — provide just enough for the AI to understand the system without loading everything upfront.

## Problem

Three issues emerged with this approach:

1. **Algorithm works poorly from the bootstrap alone.** The bootstrap contained only an "essence" (20-30 lines) of the full 479-line Algorithm. Models produced a degraded experience — following the Algorithm's structure but missing critical details like exact ISC minimums, capability audit format, Red Lines, and verification phase requirements.

2. **Skill Discovery Index was redundant.** OpenCode natively generates an `<available_skills>` XML block for every session, listing all discovered skills with name, description, and location. The bootstrap's 90-line manual table was duplicating what OpenCode already provided — and falling out of sync as new skills were added.

3. **Plugin used an experimental hook.** `experimental.chat.system.transform` is marked experimental. The PAI Core (Algorithm) is the most critical piece of PAI — anchoring it to an experimental hook was a reliability risk.

## Decision

Remove the bootstrap mechanism entirely. Shift PAI Core loading to OpenCode's native skill system.

**Three changes:**

### 1. PAI/SKILL.md → tier:always

Add `'PAI'` to the `ALWAYS_LOADED_SKILLS` array in `GenerateSkillIndex.ts`. The PAI Core Skill (479 lines, full Algorithm + ISC + Capabilities) is now loaded by the native OpenCode skill system at session start — not by the plugin.

```typescript
// PAI/Tools/GenerateSkillIndex.ts
const ALWAYS_LOADED_SKILLS = [
  'PAI',   // ← added
  'CORE',
  'Development',
  // ...
];
```

### 2. skills/PAI symlink

Create `skills/PAI → ../PAI` symlink so OpenCode's native skill scanner discovers `PAI/SKILL.md`. The scanner already follows symlinks (established in upstream #620). No special handling required.

```text
.opencode/
├── skills/
│   └── PAI -> ../PAI    ← new symlink
└── PAI/
    └── SKILL.md
```

### 3. Plugin simplified to user context only

`pai-unified.ts` no longer loads `MINIMAL_BOOTSTRAP.md`. It loads only:
- `PAI/AISTEERINGRULES.md` — behavioral governance (cannot be in a static skill file)
- `USER/ABOUTME.md` — personal background (user-specific, not in repo)
- `USER/TELOS/TELOS.md` — life goals and mission (user-specific)
- `USER/DAIDENTITY.md` — DA name and personality (user-specific)
- `USER/AISTEERINGRULES.md` — personal behavioral rules (user-specific)

These files are genuinely dynamic — they vary per user installation and cannot live in a static committed skill file. Everything else (the Algorithm, ISC rules, Capabilities) belongs in `PAI/SKILL.md`.

## Consequences

### Positive

- **Full Algorithm always available.** The complete 479-line PAI Core Skill is in context — not a condensed essence. Models follow the Algorithm correctly.
- **No redundant Skill Discovery Index.** OpenCode's native `<available_skills>` XML handles skill discovery. One source of truth.
- **Stable loading mechanism.** Native skill system (`tier:always`) is production-stable, not experimental.
- **Simpler plugin.** `pai-unified.ts` has a single clear responsibility: user identity context.
- **AGENTS.md simplified.** Reduced from 450 to 14 lines. PAI behavior has one home: `PAI/SKILL.md`.

### Negative / Tradeoffs

- **Larger always-loaded context.** PAI/SKILL.md (479 lines, ~18KB) vs. MINIMAL_BOOTSTRAP.md (203 lines, ~7KB). This is accepted — the degraded Algorithm experience from the thin bootstrap was worse than the token cost of loading it fully.
- **All context reaches model via user message (not system prompt).** The `cemalturkcan/opencode-anthropic-login-via-cli` plugin (used by most PAI-OpenCode users with Anthropic Max) relocates all system prompt blocks except the identity block to the first user message. This applies to both the old bootstrap and the new skill content equally — so the tradeoff is identical.

### No Impact

- Skill on-demand loading — unchanged. All 50+ non-PAI skills remain deferred, loaded via `Skill()` tool.
- Memory system, agents, security validation — unchanged.
- User identity loading — unchanged (still handled by plugin).

## Alternatives Considered

### Alternative A: Expand MINIMAL_BOOTSTRAP.md

Expand the bootstrap to contain the full Algorithm. Rejected: still uses the experimental hook, still a second copy of content that belongs in SKILL.md.

### Alternative B: Use opencode.json `instructions` field

Load Algorithm via `opencode.json → instructions: [".opencode/PAI/Algorithm/v3.7.0.md"]`. Rejected: the Anthropic auth plugin relocates `instructions` content to user messages exactly like the existing bootstrap — same net result, but adds complexity without benefit for the target user base.

### Alternative C: Inline Algorithm in AGENTS.md

Add Algorithm content to AGENTS.md. Rejected: AGENTS.md is loaded on every message by every agent working in the repo. Putting PAI Core there would load it for Contributors fixing CI issues — work that has nothing to do with PAI. Wrong layer of concern.

## Related ADRs

- [ADR-001](ADR-001-hooks-to-plugins-architecture.md) — Hooks → Plugins (original plugin architecture)
- [ADR-003](ADR-003-skills-system-unchanged.md) — Skills system preservation
- [ADR-019](ADR-019-vanilla-opencode-migration.md) — Vanilla OpenCode migration (prerequisite for this ADR)
