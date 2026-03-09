---
title: PAI-OpenCode v3.0 — Task List
description: Granular, immediately actionable tasks for the remaining PRs until v3.0 release
status: active
date: 2026-03-08
---

# PAI-OpenCode v3.0 — TODO

> [!NOTE]
> **Basis:** Gap-Analysis 2026-03-06 | Reference: `GAP-ANALYSIS-v3.0.md` | Plan: `OPTIMIZED-PR-PLAN.md`
> **Updated:** 2026-03-08 — WP-A (PR #42) and WP-B (PR #43) merged. WP-C verified against v4.0.3 upstream.

---

## Overall Progress

```text
WP1  ████████████ 100% ✅  ← PR #32-35
WP2  ████████████ 100% ✅  ← PR #34
WP3  ████████████ 100% ✅  ← PR #37
WP4  ████████████ 100% ✅  ← PR #38-40
──────────────────────────────────────
WP-A  ████████████ 100% ✅  ← PR #42 merged
WP-B  ████████████ 100% ✅  ← PR #43 merged
WP-C  ████████████ 100% ✅  ← PR #45 merged
WP-D  ████████████ 100% ✅  ← PR #47 merged
WP-E  ██████████░░  85% 🔄  ← PR #48 in review
──────────────────────────────────────
WP-N1 ░░░░░░░░░░░░   0% ⏳  ← Session Registry (next)
WP-N2 ░░░░░░░░░░░░   0% ⏳  ← Compaction Intelligence
WP-N3 ░░░░░░░░░░░░   0% ⏳  ← Algorithm Awareness
WP-N4 ░░░░░░░░░░░░   0% ⏳  ← LSP + Fork
WP-N5 ░░░░░░░░░░░░   0% ⏳  ← Plan Update
```

> **The port is done. The native transformation starts with WP-N1.**
> See `docs/epic/EPIC-v3.0-OpenCode-Native.md` for the full WP-N plan.

---

## ✅ PR #A — WP3-Completion: Plugin System & Hooks — MERGED (#42)

**Branch:** `feature/wp-a-plugin-hooks` — **MERGED into `dev`**

All handlers ported and integrated into `pai-unified.ts`:

- [x] `plugins/handlers/prd-sync.ts` ✅
- [x] `plugins/handlers/session-cleanup.ts` ✅
- [x] `plugins/handlers/last-response-cache.ts` ✅
- [x] `plugins/handlers/relationship-memory.ts` ✅
- [x] `plugins/handlers/question-tracking.ts` ✅
- [x] All 6 handlers integrated into `pai-unified.ts` ✅
- [x] Bus events implemented: `session.compacted`, `session.error`, `permission.asked`, `command.executed`, `installation.update.available`, `session.updated`, `session.created` ✅
- [x] `biome check --write .` ✅
- [x] `bun test` ✅

---

## ✅ PR #B — WP3.5: Security Hardening / Prompt Injection — MERGED (#43)

**Branch:** `feature/wp-b-security-hardening` — **MERGED into `dev`**

- [x] `plugins/lib/injection-patterns.ts` ✅
- [x] `plugins/handlers/prompt-injection-guard.ts` ✅
- [x] `plugins/lib/sanitizer.ts` ✅
- [x] `MEMORY/SECURITY/` directory registered ✅
- [x] Integrated into `pai-unified.ts` (`tool.execute.before` + `message.received`) ✅
- [x] Sensitivity-level setting (low/medium/high) ✅
- [x] Manual tests with known injection patterns ✅
- [x] `biome check --write .` ✅

---

## 🟡 PR #C — WP5: Core PAI System + Skill Fixes

**Branch:** `feature/wp-c-core-pai-system`
**Estimated effort:** ~3–3.5h (verified against v4.0.3 upstream — many items already done)
**Dependencies:** PR #A ✅ (done)
**Priority:** CRITICAL

> [!NOTE]
> **Verified 2026-03-08:** Many items from the original TODO were already completed in earlier WPs.
> This section reflects only the **actual remaining gaps** confirmed against v4.0.3 at:
> `/Users/steffen/workspace/github.com/danielmiessler/Personal_AI_Infrastructure/Releases/v4.0.3/.claude/`

---

### C.1 — Structural Fixes: Flatten Nested Skills

Two skills have the same incorrect nested structure — content exists one level too deep.

**USMetrics — flatten:**
```bash
# Move contents up, merge SKILL.md, delete inner dir
cp -r .opencode/skills/USMetrics/USMetrics/Tools      .opencode/skills/USMetrics/
cp -r .opencode/skills/USMetrics/USMetrics/Workflows  .opencode/skills/USMetrics/
# Manually merge the two SKILL.md files (outer=category-wrapper, inner=actual skill content)
rm -rf .opencode/skills/USMetrics/USMetrics/
```

- [ ] Move `USMetrics/USMetrics/Tools/` → `USMetrics/Tools/`
- [ ] Move `USMetrics/USMetrics/Workflows/` → `USMetrics/Workflows/`
- [ ] Merge inner `USMetrics/USMetrics/SKILL.md` into outer `USMetrics/SKILL.md`
- [ ] Delete `USMetrics/USMetrics/` directory

**Telos — flatten:**
```bash
mv .opencode/skills/Telos/Telos/DashboardTemplate  .opencode/skills/Telos/
mv .opencode/skills/Telos/Telos/ReportTemplate     .opencode/skills/Telos/
mv .opencode/skills/Telos/Telos/Tools              .opencode/skills/Telos/
mv .opencode/skills/Telos/Telos/Workflows          .opencode/skills/Telos/
rm -rf .opencode/skills/Telos/Telos/
```

- [ ] Move `Telos/Telos/DashboardTemplate/` → `Telos/DashboardTemplate/`
- [ ] Move `Telos/Telos/ReportTemplate/` → `Telos/ReportTemplate/`
- [ ] Move `Telos/Telos/Tools/` → `Telos/Tools/`
- [ ] Move `Telos/Telos/Workflows/` → `Telos/Workflows/`
- [ ] Delete `Telos/Telos/` directory
- [ ] Verify `Telos/SKILL.md` references point to `Telos/` not `Telos/Telos/`

---

### C.2 — Missing Skill Content: Port from v4.0.3

Reference source: `.../Releases/v4.0.3/.claude/skills/`

**Utilities — 2 skills missing:**
- [ ] `skills/Utilities/AudioEditor/` — port from v4.0.3 (`SKILL.md`, `Tools/`, `Workflows/`)
- [ ] `skills/Utilities/Delegation/` — port from v4.0.3 (`SKILL.md` only)
- [ ] Update `skills/Utilities/SKILL.md` — add AudioEditor + Delegation entries
- [ ] Replace any `.claude/` references with `.opencode/` in ported files

**Research — 2 items missing:**
- [ ] `skills/Research/MigrationNotes.md` — port from v4.0.3
- [ ] `skills/Research/Templates/` — port directory (contains `MarketResearch.md`, `ThreatLandscape.md`)

**Agents — 1 file missing:**
- [ ] `skills/Agents/ClaudeResearcherContext.md` — port from v4.0.3

---

### C.3 — Missing PAI/ Docs: Port from v4.0.3

Reference source: `.../Releases/v4.0.3/.claude/PAI/`

**9 flat docs missing from `.opencode/PAI/`:**

```bash
SRC=".../Releases/v4.0.3/.claude/PAI"
DST=".opencode/PAI"

for f in CLI.md CLIFIRSTARCHITECTURE.md DOCUMENTATIONINDEX.md FLOWS.md \
          PAIAGENTSYSTEM.md README.md SYSTEM_USER_EXTENDABILITY.md \
          THEFABRICSYSTEM.md THENOTIFICATIONSYSTEM.md; do
  cp $SRC/$f $DST/$f
  sed -i '' 's/\.claude\//\.opencode\//g' $DST/$f
done
```

- [ ] `CLI.md` → `.opencode/PAI/CLI.md`
- [ ] `CLIFIRSTARCHITECTURE.md` → `.opencode/PAI/CLIFIRSTARCHITECTURE.md`
- [ ] `DOCUMENTATIONINDEX.md` → `.opencode/PAI/DOCUMENTATIONINDEX.md`
- [ ] `FLOWS.md` → `.opencode/PAI/FLOWS.md`
- [ ] `PAIAGENTSYSTEM.md` → `.opencode/PAI/PAIAGENTSYSTEM.md`
- [ ] `README.md` → `.opencode/PAI/README.md`
- [ ] `SYSTEM_USER_EXTENDABILITY.md` → `.opencode/PAI/SYSTEM_USER_EXTENDABILITY.md`
- [ ] `THEFABRICSYSTEM.md` → `.opencode/PAI/THEFABRICSYSTEM.md`
- [ ] `THENOTIFICATIONSYSTEM.md` → `.opencode/PAI/THENOTIFICATIONSYSTEM.md`
- [ ] All 9 files: replace `.claude/` → `.opencode/` after copy

**3 subdirectories missing from `.opencode/PAI/`:**
- [ ] `ACTIONS/` — port from v4.0.3 (contains `A_EXAMPLE_FORMAT/`, `A_EXAMPLE_SUMMARIZE/`, `lib/`, `pai.ts`, `README.md`)
- [ ] `FLOWS/` — port from v4.0.3 (contains `README.md`)
- [ ] `PIPELINES/` — port from v4.0.3 (contains `P_EXAMPLE_SUMMARIZE_AND_FORMAT.yaml`, `README.md`)
- [ ] All ported files: replace `.claude/` → `.opencode/` after copy

> [!NOTE]
> Already present in `.opencode/PAI/` (no action needed): `ACTIONS.md`, `AISTEERINGRULES.md`,
> `CONTEXT_ROUTING.md`, `MEMORYSYSTEM.md`, `MINIMAL_BOOTSTRAP.md`, `PAISYSTEMARCHITECTURE.md`,
> `PRDFORMAT.md`, `SKILL.md`, `SKILLSYSTEM.md`, `THEDELEGATIONSYSTEM.md`, `THEHOOKSYSTEM.md`, `TOOLS.md`

> [!NOTE]
> Already present in `.opencode/skills/PAI/SYSTEM/` (docs exist, also belong in PAI/ per v4.0.3 arch):
> `PAIAGENTSYSTEM.md`, `CLIFIRSTARCHITECTURE.md`, `THEFABRICSYSTEM.md`, `THENOTIFICATIONSYSTEM.md`,
> `DOCUMENTATIONINDEX.md`, `SYSTEM_USER_EXTENDABILITY.md` — copy to PAI/ as well.

---

### C.4 — PAI Tools: BuildCLAUDE.ts → BuildOpenCode.ts

> [!NOTE]
> All other PAI Tools are already present in `.opencode/PAI/Tools/` — identical to v4.0.3.
> Only `BuildCLAUDE.ts` needs adaptation for OpenCode.

- [ ] Copy `.opencode/PAI/Tools/BuildCLAUDE.ts` → `.opencode/PAI/Tools/BuildOpenCode.ts`
- [ ] In `BuildOpenCode.ts`: replace all `.claude/` → `.opencode/`
- [ ] In `BuildOpenCode.ts`: replace all `CLAUDE.md` → `AGENTS.md`
- [ ] In `BuildOpenCode.ts`: replace all `claude` CLI references → `opencode`
- [ ] Update file header comment: `// BuildOpenCode.ts — OpenCode-native version of BuildCLAUDE.ts`

---

### C.5 — Bootstrap & Index Update

- [ ] Update `MINIMAL_BOOTSTRAP.md` — fix USMetrics path (remove `/USMetrics/USMetrics/` nesting)
- [ ] Update `MINIMAL_BOOTSTRAP.md` — add AudioEditor and Delegation entries
- [ ] Regenerate skill index: `bun GenerateSkillIndex.ts`

---

### PR #C Completion

- [ ] `bun run skills:validate` (ValidateSkillStructure.ts)
- [ ] `bun run skills:index` (GenerateSkillIndex.ts)
- [ ] `biome check --write .`
- [ ] `bun test`
- [ ] Create PR against `dev`

---

## 🟢 PR #D — WP6: Installer & Migration

**Branch:** `feature/wp-d-installer-migration`
**Estimated effort:** 1–2 days
**Dependencies:** PR #C
**Priority:** CRITICAL (release blocker)

### Port PAI-Install

Reference: `.../Releases/v4.0.3/.claude/PAI-Install/`

- [ ] `PAI-Install/install.sh` — port + adapt for OpenCode
  - `~/.claude/` → `~/.opencode/`
  - `CLAUDE.md` → `AGENTS.md`
- [ ] `PAI-Install/cli/` — port
- [ ] `PAI-Install/engine/` — port
- [ ] `PAI-Install/electron/` — port + adapt for OpenCode (**required for v3.0**)
  - Electron app as GUI installer: step-by-step "Install PAI-OpenCode" UI
  - Replace all Claude Code references → OpenCode
- [ ] `PAI-Install/web/` — port (Electron web UI)
- [ ] `PAI-Install/main.ts` — adapt for OpenCode
- [ ] `PAI-Install/README.md` — write

> [!IMPORTANT]
> **Electron GUI is required for v3.0** — both CLI installer AND Electron GUI

### Migration Script

- [ ] Create `tools/migration-v2-to-v3.ts`:
  ```text
  1. Backup ~/.opencode/ → ~/.opencode-backup-YYYYMMDD/
  2. Detect current version (v2.x vs v3.x)
  3. Move flat skills → hierarchical structure (if not already done)
  4. Update MINIMAL_BOOTSTRAP.md
  5. Run ValidateSkillStructure.ts
  6. Report: what was migrated, what was skipped, what needs manual review
  ```
- [ ] Test migration against a clean v2.x test setup

### DB Health (WP-F — integrated into PR #D)

- [ ] Extend `plugins/handlers/session-cleanup.ts` with `checkDbHealth()` — warn when DB > 500MB or sessions > 90 days old
- [ ] Implement `plugins/lib/db-utils.ts` — `getDbSizeMB()` and `getSessionsOlderThan(days)`
- [ ] Create `Tools/db-archive.ts` — standalone Bun script for session archiving
  - `bun db-archive.ts` — archive sessions > 90 days
  - `bun db-archive.ts 180` — archive sessions > 180 days
  - `bun db-archive.ts --dry-run` — preview what would be archived
  - `bun db-archive.ts --vacuum` — VACUUM after archiving (requires OpenCode to be stopped)
  - `bun db-archive.ts --restore archive-2025-Q4.db` — restore from archive
- [ ] Create `.opencode/commands/db-archive.ts` — OpenCode custom command `/db-archive`
- [ ] Add "DB Health" tab to `PAI-Install/electron/`
- [ ] Create `docs/DB-MAINTENANCE.md`

### Documentation

- [ ] Write `UPGRADE.md` — step-by-step from v2.x → v3.0
- [ ] Write `INSTALL.md` — fresh installation for new users
- [ ] Create `CHANGELOG.md` — all breaking changes, new features, migration path
- [ ] Update root `README.md` — v3.0-specific info

### PR #D Completion

- [ ] Test migration script on clean test directory
- [ ] Install script dry-run
- [ ] `bun Tools/db-archive.ts --dry-run` on a real DB
- [ ] Test custom command `/db-archive` in a fresh session
- [ ] Test archive restore (restore one session)
- [ ] `biome check --write .`
- [ ] Create PR against `dev`

---

## 🏁 PR #E — WP-E: Final Testing & v3.0.0 Release

**Branch:** `release/v3.0.0` from `dev`
**Estimated effort:** 0.5–1 day
**Dependencies:** PRs #A–#D all merged
**Priority:** CRITICAL (final step)

### Pre-Release Tests

- [ ] `bun test` — all tests green
- [ ] `biome check .` — zero errors
- [ ] `bun run skills:validate` — all skills valid
- [ ] Manual end-to-end: Algorithm 7 phases complete run
- [ ] Plugin events check: hooks fire correctly (session-start, tool-call, session-end)
- [ ] Injection guard test: known patterns blocked
- [ ] Migration script: clean run from v2 → v3

### GitHub Release

- [ ] Create tag `v3.0.0`
- [ ] Fill GitHub Release from `CHANGELOG.md`
- [ ] Release notes: What's New, Breaking Changes, Migration

### Communication (optional)

- [ ] Inform PAI Community (Discord/GitHub Discussions)
- [ ] Review `CONTRIBUTING.md` — are guidelines still current?

---

## 📋 Quick Reference: Files to Delete / Restructure

| File | Action | Reason |
|------|--------|--------|
| `docs/epic/ARCHITECTURE-PLAN.md` | 🗑️ Deleted | Content consolidated into EPIC + GAP-ANALYSIS |
| `docs/epic/WP4-IMPLEMENTATION-PLAN.md` | 🗑️ Deleted | WP4 complete, outdated |
| `docs/epic/WORK-PACKAGE-GUIDELINES.md` | 🗑️ Deleted | Important parts integrated into EPIC |
| `.opencode/skills/USMetrics/USMetrics/` | 🔀 Flatten → PR #C | Incorrect nested structure |
| `.opencode/skills/Telos/Telos/` | 🔀 Flatten → PR #C | Incorrect nested structure |
| `.opencode/PAI/WP2_CONTEXT_COMPARISON.md` | 🗑️ Deleted | Build artifact, no lasting value |

---

## 🗂️ Target Structure `docs/epic/` (after consolidation)

```text
docs/epic/
├── EPIC-v3.0-Synthesis-Architecture.md   ← Master (Vision + WP-Status + Guidelines)
├── GAP-ANALYSIS-v3.0.md                  ← Audit result (reference for PR work)
├── OPTIMIZED-PR-PLAN.md                  ← Active PR plan (A-E)
└── TODO-v3.0.md                          ← This file (granular tasks)
```

<details>
<summary>Mermaid view of target structure</summary>

```mermaid
graph TD
    root["docs/epic/"]
    root --> epic["EPIC-v3.0-Synthesis-Architecture.md<br/><i>Master: Vision + WP-Status + Guidelines</i>"]
    root --> gap["GAP-ANALYSIS-v3.0.md<br/><i>Audit result (3-way comparison)</i>"]
    root --> plan["OPTIMIZED-PR-PLAN.md<br/><i>Active PR plan (A–E)</i>"]
    root --> todo["TODO-v3.0.md<br/><i>Granular tasks</i>"]
```

</details>

---

*Created: 2026-03-06*
*Updated: 2026-03-08 — WP-A/WP-B merged; WP-C verified against v4.0.3 upstream*
*Basis: GAP-ANALYSIS-v3.0.md + EPIC-v3.0-Synthesis-Architecture.md + live repo audit*
