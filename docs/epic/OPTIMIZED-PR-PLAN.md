---
title: PAI-OpenCode v3.0 - Corrected PR Plan
description: Port complete — WP-N1..N5 shipped (PR #50–#54), WP-N6 in progress (PR #55 open)
version: "3.0-native-1"
status: active
authors: [Jeremy]
date: 2026-03-10
tags: [architecture, migration, v3.0, PR-strategy, native-transformation]
---

# PAI-OpenCode v3.0 — Corrected PR Plan

**Based on:** Full repository audit + live v4.0.3 upstream comparison (2026-03-08)
**Goal:** Accurate representation of remaining work (2 PRs remaining until v3.0)

---

## Current Status (After WP-A + WP-B Completion, 2026-03-08)

| WP | Name | PRs | Status | Content |
|----|------|-----|--------|---------|
| **WP1** | Algorithm v3.7.0 + Workdir Docs | #35, #36 | ✅ **Complete** | Algorithm v3.7.0, OpenCode workdir parameter |
| **WP2** | Context Modernization | #34 | ✅ **Complete** | Lazy Loading, Hybrid Algorithm loading |
| **WP3** | Category Structure Part A | #37 | ✅ **Complete** | Category Structure + Hooks via WP-A |
| **WP4** | Integration & Validation | #38, #39, #40 | ✅ **Complete** | Functional, validated |
| **WP-A** | WP3-Completion: Plugin System & Hooks | #42 | ✅ **Merged** | 5 handlers + bus events + pai-unified.ts |
| **WP-B** | Security Hardening / Prompt Injection | #43 | ✅ **Merged** | injection-guard + sanitizer + patterns |
| **WP-C** | Core PAI System + Skill Fixes | #45 | ✅ **Merged** | PAI docs, skill structure fixes, BuildOpenCode.ts |
| **WP-D** | Installer & Migration | #47 | ✅ **Merged** | PAI-Install, migration script, DB health |
| **WP-E** | Installer Refactor (Electron-first) | #48 | ✅ **Merged** | Symlink architecture, Google TTS, Electron flows |
| **WP-N1** | Session Registry | #50 | ✅ **Merged** | Custom tools: session_registry + session_results |
| **WP-N2** | Compaction Intelligence | #51 | ✅ **Merged** | experimental.session.compacting hook + context injection |
| **WP-N3** | Algorithm Awareness | #52+#53 | ✅ **Merged** | SKILL.md context recovery, PRD parent_session_id |
| **WP-N4** | LSP + Fork Documentation | #53 | ✅ **Merged** | AGENTS.md LSP + Fork sections, installer .env |
| **WP-N5** | Plan Update | #54 | ✅ **Merged** | Sync all planning docs to reflect N1-N4 complete |
| **WP-N6** | System Self-Awareness | #55 | ✅ **Merged** | OpenCodeSystem skill, 4 architecture reference docs, ADR-017 |
| **WP-N7** | roborev + Biome CI | #56 | ✅ **Merged** | roborev plugin handler, CodeReview skill, GitHub Actions CI, ADR-018 |
| **WP-N8** | Obsidian Formatting Guidelines | — | 🔄 **In Progress** | Formatting guidelines, agent capability matrix (split from WP-N7) |

> [!NOTE]
> **2026-03-08 Live Audit:** WP-C scope significantly reduced after comparing repo against v4.0.3.
> Most PAI Tools and many docs were already ported in earlier WPs.
> See `TODO-v3.0.md` PR #C section for the verified remaining task list.

---

## Remaining Work: 2 PRs (after WP-A + WP-B)

### ✅ PR #A: WP3-Completion — Plugin System & Hooks — MERGED (#42)

**Branch:** `feature/wp-a-plugin-hooks` → merged into `dev`

```text
DELIVERED:
├── plugins/handlers/prd-sync.ts            ✅
├── plugins/handlers/session-cleanup.ts     ✅
├── plugins/handlers/last-response-cache.ts ✅
├── plugins/handlers/relationship-memory.ts ✅
├── plugins/handlers/question-tracking.ts   ✅
├── pai-unified.ts (all handlers integrated) ✅
└── Bus events: session.compacted, session.error, permission.asked,
    command.executed, installation.update.available,
    session.updated, session.created (info object)  ✅
```

---

### ✅ PR #B: WP3.5 — Security Hardening / Prompt Injection — MERGED (#43)

**Branch:** `feature/wp-b-security-hardening` → merged into `dev`

```text
DELIVERED:
├── plugins/handlers/prompt-injection-guard.ts  ✅
├── plugins/lib/injection-patterns.ts           ✅
├── plugins/lib/sanitizer.ts                    ✅
└── Integrated into pai-unified.ts              ✅
```

---

### 📋 PR #C: WP5 — Core PAI System Completion (CRITICAL)

**Branch:** `feature/wp-c-core-pai-system` (new from `dev`)
**Estimate:** ~21 tasks, ~3–3.5h
**Dependencies:** PR #A ✅

> [!NOTE]
> **Verified against v4.0.3 upstream** — the task list below reflects only confirmed gaps.
> Many items from the original plan were already done in earlier WPs.

```text
PHASE 1 — Structural fixes (flatten nested skills):
├── skills/USMetrics/USMetrics/ → flatten to skills/USMetrics/
│   (move Tools/, Workflows/, merge SKILL.md, delete inner dir)
└── skills/Telos/Telos/ → flatten to skills/Telos/
    (move DashboardTemplate/, ReportTemplate/, Tools/, Workflows/, delete inner dir)

PHASE 2 — Missing skill content (port from v4.0.3):
├── skills/Utilities/AudioEditor/     (SKILL.md + Tools/ + Workflows/)
├── skills/Utilities/Delegation/      (SKILL.md only)
├── skills/Research/MigrationNotes.md
├── skills/Research/Templates/        (MarketResearch.md, ThreatLandscape.md)
├── skills/Agents/ClaudeResearcherContext.md
└── skills/Utilities/SKILL.md         (update: add AudioEditor + Delegation entries)

PHASE 3 — Missing PAI/ flat docs (9 files, port + sed-replace .claude→.opencode):
├── CLI.md
├── CLIFIRSTARCHITECTURE.md
├── DOCUMENTATIONINDEX.md
├── FLOWS.md
├── PAIAGENTSYSTEM.md
├── README.md
├── SYSTEM_USER_EXTENDABILITY.md
├── THEFABRICSYSTEM.md
└── THENOTIFICATIONSYSTEM.md

PHASE 3b — Missing PAI/ subdirectories (3 dirs, port + sed-replace):
├── ACTIONS/   (A_EXAMPLE_FORMAT/, A_EXAMPLE_SUMMARIZE/, lib/, pai.ts, README.md)
├── FLOWS/     (README.md)
└── PIPELINES/ (P_EXAMPLE_SUMMARIZE_AND_FORMAT.yaml, README.md)

PHASE 4 — PAI Tools:
└── BuildCLAUDE.ts → BuildOpenCode.ts  (copy + replace .claude→.opencode, CLAUDE.md→AGENTS.md)
    Note: All other PAI Tools already present and identical to v4.0.3 ✅

PHASE 5 — Bootstrap & index:
├── MINIMAL_BOOTSTRAP.md  (fix USMetrics path, add AudioEditor + Delegation)
└── bun GenerateSkillIndex.ts
```

**Completion checklist:**
- [ ] `bun run skills:validate`
- [ ] `bun run skills:index`
- [ ] `biome check --write .`
- [ ] `bun test`
- [ ] PR against `dev`

---

### 📋 PR #D: WP6 — Installer & Migration + DB Health (CRITICAL)

**Branch:** `feature/wp-d-installer-migration` (new from `dev` after #C merges)
**Estimate:** ~18 files, ~1300 lines
**Dependencies:** PR #C

```text
PAI-Install/ (port from v4.0.3, adapt for OpenCode):
├── install.sh           (~/.claude/ → ~/.opencode/, CLAUDE.md → AGENTS.md)
├── cli/
├── engine/
├── electron/            ← Required for v3.0 + DB Health tab integrated here
├── web/
└── main.ts

DB Health (WP-F — integrated):
├── plugins/handlers/session-cleanup.ts  (extend: checkDbHealth())
├── plugins/lib/db-utils.ts              (getDbSizeMB, getSessionsOlderThan)
├── Tools/db-archive.ts                  (standalone: archive/vacuum/restore)
└── .opencode/commands/db-archive.ts     (OpenCode custom command /db-archive)

Migration & Docs:
├── tools/migration-v2-to-v3.ts
├── UPGRADE.md
├── CHANGELOG.md
├── docs/DB-MAINTENANCE.md
└── README.md (update)
```

> [!IMPORTANT]
> **Electron GUI is required for v3.0** — CLI installer AND Electron GUI both required

---

## ⚙️ Architecture Decision: Plugin Consolidation

> [!TIP]
> **Decided 2026-03-06 — Option B: Pragmatic**

**Option A (Epic goal):** Dissolve all 19 handlers, native OpenCode events, ~300 lines
**Option B (Chosen):** Handler modules remain as "internal modules", only add missing hooks

**Rationale for Option B:**
- Lower risk (no complete restructuring)
- Functionality guaranteed preserved
- Less effort (~1 day vs ~2 days)
- True consolidation deferred to **v3.1**

**Consequence:** `pai-unified.ts` stays as coordinator over handler modules. New hooks added as new handler files and imported in `pai-unified.ts`.

---

## Progress Diagram

```text
Current state (dev branch):
├── WP1  ✅ Algorithm v3.7.0
├── WP2  ✅ Context Modernization
├── WP3  ✅ Category Structure (completed via WP-A)
├── WP4  ✅ Integration & Validation
├── WP-A ✅ Plugin System + 5 Hooks (PR #42)
├── WP-B ✅ Security Hardening (PR #43)
├── WP-C ✅ Core PAI System (PR #45)
├── WP-D ✅ Installer & Migration (PR #47)
├── WP-E ✅ Installer Refactor (PR #48)
├── WP-N1 ✅ Session Registry (PR #50)
├── WP-N2 ✅ Compaction Intelligence (PR #51)
├── WP-N3 ✅ Algorithm Awareness (PR #52+#53)
├── WP-N4 ✅ LSP + Fork Documentation (PR #53)
├── WP-N5 ✅ Plan Update (PR #54)
└── WP-N6 🔄 System Self-Awareness (PR #55)
```

---

## Summary (Updated 2026-03-12)

| Metric | 2026-03-08 | 2026-03-11 | **Current (2026-03-12)** |
|--------|------------|------------|--------------------------|
| Port WPs done | 8 ✅ | 9 ✅ (WP-E) | **9 ✅** |
| Native WPs done | 0 | 4 ✅ (N1–N4) | **7 ✅ (N1–N7), N8 in progress** |
| Open PRs | 2 (C, D) | 1 (#55) | **1 (WP-N8 — open, in progress)** |
| Remaining native work | Not planned | WP-N6 in progress | **WP-N8 in progress (Obsidian formatting)** |

**Status:** Port complete. Native transformation: WP-N1 through WP-N7 merged (PR #50–#56). WP-N8 in progress (Obsidian formatting guidelines + agent capability matrix).

**Native transformation plan:** `docs/epic/EPIC-v3.0-OpenCode-Native.md`
**Full gap analysis:** `docs/epic/GAP-ANALYSIS-v3.0.md`
**Granular task list:** `docs/epic/TODO-v3.0.md`

---

*Original plan: 2026-03-06*
*Correction 1 (2026-03-06): Fixed WP3 completion status — was never fully done*
*Correction 2 (2026-03-08): WP-A (#42) + WP-B (#43) merged; WP-C scope verified against v4.0.3 upstream*
*Correction 3 (2026-03-11): WP-N1–N4 complete (PR #50–#53); WP-N5 plan sync in progress*
*Correction 4 (2026-03-12): WP-N5 merged (PR #54); WP-N6 in progress (PR #55 open); WP-N7 planned*
*Correction 5 (2026-03-12): WP-N6 merged (PR #55); WP-N7 in progress (roborev + Biome CI); WP-N8 planned (Obsidian — split from WP-N7)*
*Correction 6 (2026-03-12): WP-N7 merged (PR #56); WP-N8 in progress (Obsidian formatting guidelines + agent capability matrix)*
