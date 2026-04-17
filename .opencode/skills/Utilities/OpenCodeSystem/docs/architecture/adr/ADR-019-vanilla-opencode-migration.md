---
title: "ADR-019: Vanilla OpenCode Migration (Burying model_tiers)"
status: accepted
date: 2026-04-11
deciders: [Steffen, Jeremy]
tags: [migration, vanilla-opencode, model-tiers-removal, fork-archived, breaking-change]
wp: WP-M1
type: adr
supersedes_partial: [ADR-005, ADR-012]
---

# ADR-019: Vanilla OpenCode Migration (Burying model_tiers)

> [!success] Accepted — April 11, 2026
> PAI-OpenCode migrates from the custom `Steffen025/opencode` fork (branch `feature/model-tiers`) to **vanilla OpenCode** from opencode.ai. The `model_tiers` feature is fully removed. Each agent has exactly one configured model.

## Status

**Accepted.** Shipping in PAI-OpenCode **v3.0** (unreleased, BREAKING change — see CHANGELOG `[3.0.0] - Unreleased`).

## Context

### The Original Problem (Why the Fork Existed)

PAI-OpenCode was built to optimize AI subagent costs by routing different task complexities to different model tiers:

- **`quick`** tier → cheap/fast models (Haiku, GPT-4.1-mini, Kimi K2.5 free)
- **`standard`** tier → default models (Sonnet 4.5, GPT-4.1)
- **`advanced`** tier → premium models (Opus 4.6, GPT-5.1)

The goal was to let the orchestrator dynamically pick a tier per Task tool call without changing the agent's definition. Example:

```typescript
// Cheap work → quick tier
Task({ subagent_type: "Engineer", model_tier: "quick", prompt: "Replace X with Y in 20 files" })

// Expensive work → advanced tier
Task({ subagent_type: "Engineer", model_tier: "advanced", prompt: "Debug this race condition" })
```

This required a custom `model_tiers` config block per agent in `opencode.json` and runtime logic to resolve `args.model_tier` against that block. Neither feature exists in upstream OpenCode.

### The Implementation Path We Took

1. Created a fork at `github.com/Steffen025/opencode`
2. Created branch `feature/model-tiers` based on upstream v1.2.24
3. Cherry-picked commit `95fd6ea7` ("feat(agent): implement model tier selection") from an **unmerged upstream PR** (author: Mohammed Muzammil Anwar, an external contributor)
4. Installer built a custom binary from this fork during fresh install

### The Decision Forcing Function (April 2026 Investigation)

A routine check revealed:

1. **Fork is 980 commits behind `upstream/dev`** (~4 months stale)
2. **The cherry-picked commit (95fd6ea7) was NEVER merged to upstream/dev** — it lives only in an orphaned PR branch (`feature/subagent-model-and-variant-selection-via-model-tiers`)
3. **Upstream built a different, orthogonal feature instead:** `variants` (PRs #19488, #19534, #19537) — which lets one MODEL have multiple configurations (e.g., reasoning-heavy vs. default), but does NOT let one AGENT have multiple models routed by tier
4. **Our fork has only 2 custom commits**, both duplicate cherry-picks of the same orphaned commit
5. **Every user install clones 980-commit-stale source and builds for 5-10 minutes** before they can use PAI-OpenCode

Maintenance burden: **unlimited** (monthly rebase conflicts guaranteed because upstream's `variants` system edits the same config schema).
Value delivered by `model_tiers`: **unclear** (never benchmarked; most subagent work runs at `standard` tier anyway; `explore` and `Intern` agents already cover the "cheap work" use case via agent selection).

## Decision

**Bury the `model_tiers` feature entirely. Migrate pai-opencode to vanilla OpenCode.**

Specifically:

1. Remove the `model_tiers` config block from `opencode.json`. Each agent gets **one** `model` field.
2. Remove `model_tier` as a runtime parameter to the Task tool. The agent's configured model is used, period.
3. Replace the custom fork build process with `curl -fsSL https://opencode.ai/install | bash` (the official vanilla installer).
4. Archive the `Steffen025/opencode` fork on GitHub with a README redirect.
5. Teach users to achieve cost optimization through **agent selection**, not tier selection:
   - **Lightweight work** → use `explore` or `Intern` agents (configured with cheap models)
   - **Default work** → use `Engineer`, `Writer`, etc. (configured with standard models)
   - **Heavy work** → use `Architect` or `Algorithm` (configured with premium models)
6. Provide a legacy-config migration script (`PAI-Install/engine/migrate-legacy-config.ts`) that converts old `opencode.json` files with `model_tiers` blocks to the new flat format, preserving each agent's `standard` tier model as the new canonical `model`.

## Consequences

### Positive

- **Zero fork maintenance burden.** PAI-OpenCode now tracks upstream OpenCode naturally via the official installer.
- **Faster installs.** No source clone + 5-10 minute Bun compile. Vanilla install is seconds.
- **Security updates delivered automatically.** Users get upstream fixes without waiting for a rebase.
- **Simpler mental model.** "One agent = one model" is easier to reason about than "agent + tier = model".
- **Canonical single source of truth preserved.** Models still live only in `opencode.json`, which was one of the original design goals.
- **No new dependency on Steffen025/opencode for users.** They install vanilla OpenCode and it works.

### Negative (Accepted Trade-offs)

- **Breaking change for users with existing `opencode.json` files** containing `model_tiers` blocks. Mitigation: migration script provided.
- **Loss of runtime dynamic model selection per Task call.** Mitigation: agent-based routing covers the same use cases (pick the right agent for the job).
- **Loss of theoretical cost optimization hook.** In practice this was never measured and was likely small — most subagent work was standard-tier anyway.
- **Existing ADRs (ADR-005, ADR-012) have partial supersession.** The runtime `model_tiers` aspects of those ADRs no longer apply, but the dual-file config approach and session registry design remain valid. Supersession notes added at the top of each.

### Neutral

- **`PROVIDER_MODELS` still exposes `quick/standard/advanced` keys.** These are now simply a lookup table of available models at a given price point, not a runtime routing mechanism. Installer code uses them to pick a sensible default model per agent (Algorithm → advanced, explore/Intern → quick, everyone else → standard).
- **Profile YAML files (`.opencode/profiles/*.yaml`) retain their structure** but with `tiers:` sections stripped. Only `model:` per agent.

## Rejected Alternatives

### Alt-A: Rebase the fork onto current upstream/dev

**Rejected.** Would take 1-2 hours of merge conflict resolution, require monthly rebases going forward (upstream's `variants` system conflicts directly with our `model_tiers` schema), and still leave us maintaining a fork for a feature the maintainers explicitly chose not to merge.

### Alt-B: Implement tier dispatch in PAI's Task tool wrapper layer

**Considered but rejected after user feedback.** The idea was to have agents like `Engineer-Quick`, `Engineer-Standard`, `Engineer-Advanced` resolved client-side by a PAI skill layer. User correctly pointed out this violates the "single source of truth" principle — now we'd have models defined in 3x agent files instead of once in `opencode.json`. Rejected.

### Alt-C: Submit the model_tiers PR to upstream

**Deferred.** We can still do this later if the community wants the feature. Not a prerequisite for cleaning up our own tech debt. If upstream accepts, we could revive the feature as a vanilla-compatible addition — not a fork-maintained patch.

### Alt-D: Keep `model_tier` as a semantic hint in the A2A protocol for JeremyHub

**Out of scope.** JeremyHub and A2A protocol live in a separate repository (`jeremy-opencode`). This ADR covers only `pai-opencode`. A separate ADR in jeremy-opencode will address A2A cleanup if needed.

## Implementation

Implemented in a multi-phase migration executed on April 11, 2026:

- **Phase 1 (Runtime):** 21 code/config files modified across installer, plugin handlers, profiles, and `opencode.json` itself. `PAI-Install/engine/build-opencode.ts` deleted (245 LOC).
- **Phase 2 (Docs):** 17 documentation files rewritten in parallel to remove fork/tier references.
- **Phase 3 (Integration):** This ADR, CHANGELOG `[3.0.0]` entry additions (WP-M1 subsection), final verification grep sweep.
- **Phase 4 (Migration Tooling):** `migrate-legacy-config.ts` script for existing user configs.
- **Phase 5 (Fork Archival):** `Steffen025/opencode` GitHub repo archived with redirect notice.
- **Phase 6 (Smoke Test):** Fresh install dry-run to verify the vanilla path works end-to-end.
- **Phase 7 (Learning):** Reflection memory persisted.

## Verification Criteria

The migration was verified against the following criteria:

- Zero `model_tier` or `modelTier` references in runtime code (plugins, installer, handlers, config)
- Zero `Steffen025/opencode` URLs in any installer file
- Zero `feature/model-tiers` branch references surviving
- All TypeScript files compile clean via `bun build --target=bun`
- Existing user configs with `model_tiers` blocks can be migrated via the provided script
- Fresh install via `curl -fsSL https://opencode.ai/install | bash` works end-to-end
- Fork repo archived on GitHub

## References

- **Partially superseded ADRs:** ADR-005 (dual-file config), ADR-012 (session registry)
- **Related CHANGELOG entry:** `[3.0.0] - Unreleased` (WP-M1 Vanilla OpenCode Migration)
- **Upstream commit (orphaned, never merged):** `95fd6ea7` by Mohammed Muzammil Anwar
- **Upstream's alternative:** `variants` system (PRs #19488, #19534, #19537)
- **Vanilla OpenCode installer:** `curl -fsSL https://opencode.ai/install | bash`
