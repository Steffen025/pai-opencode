# PAI-OpenCode v2.0.0 — Algorithm v1.8.0

**The biggest upgrade since PAI-OpenCode's inception.** This release ports 14 upstream commits from Daniel Miessler's PAI system, upgrading the core Algorithm from v0.2.25 to v1.8.0 and bringing full parity with PAI v3.0. The result: dramatically improved quality gates, mechanical verification that prevents hallucinated completion, and a wisdom accumulation system that makes the Algorithm learn across sessions.

While the Algorithm evolved dramatically, **stability remains**: all 39 skills, 16 agents, 3 provider presets, and the plugin system continue to work unchanged. Upgrade with confidence.

---

## Highlights

- **Verify Completion Gate (v1.6.0)** — The single most important quality improvement. Prevents the model from claiming "PASS" in prose without actually calling `TaskUpdate`. Every passing criterion must show `[completed]` status before LEARN phase. No more false verification.

- **Constraint Extraction System (v1.3.0)** — Mechanical `[EX-N]` extraction during OBSERVE prevents the abstraction gap where "don't exceed 15 damage" becomes "don't be overwhelming." Specific constraints stay specific through ISC creation, BUILD, and VERIFY.

- **Wisdom Frames (v1.8.0)** — Domain knowledge accumulates across sessions. The Algorithm now reads from 5 seed wisdom domains (development, deployment, security, architecture, communication) during OBSERVE and writes learnings back during LEARN. Compounding intelligence over time.

- **Zero-Delay Output (v1.6.0)** — The Algorithm emits visible output within 10 seconds. No more silent stalls where the model thinks for minutes before showing the first token. Header and task description stream immediately.

- **8 Effort Levels** — Replaces simple FULL/ITERATION/MINIMAL with granular control: Instant (<10s), Fast (<1min), Standard (<2min), Extended (<8min), Advanced (<16min), Deep (<32min), Comprehensive (<120min), Loop (unbounded). Features scale appropriately to budget.

- **25-Capability Full Scan** — Every task evaluates all 25 capabilities (Foundation, Thinking, Agents, Collaboration, Execution, Verification). The audit format scales by effort level: one-line summary at Fast, full matrix at Extended+. No more defaulting to DIRECT without considering alternatives.

- **Build Drift Prevention** — ISC Adherence Check before creating artifacts + Constraint Checkpoint after each artifact. The model re-reads `[CRITICAL]` criteria before building and checks anti-criteria immediately after. Catches violations at creation time, not verification time.

---

## What's New

### Algorithm v1.8.0 (from v0.2.25)

**Quality Gates & Verification:**
- **Verify Completion Gate (v1.6.0)**: Reconciles TaskList vs. prose claims. Every "PASS" must be backed by `TaskUpdate(completed)`.
- **Mechanical Verification (v1.3.0)**: No rubber-stamping. Numeric criteria require computed values. Anti-criteria require specific checks performed.
- **7 Quality Gates (QG1-QG7)**: Count, Structure, Length, State, Testable, Anti-criteria, Coverage (Extended+), Specificity (Extended+).
- **Verification Rehearsal (v1.3.0, Extended+)**: Simulate violations for `[CRITICAL]` criteria during THINK phase.

**Constraint Fidelity:**
- **Constraint Extraction (v1.3.0, Output 1.5)**: Four-category scan (Quantitative, Prohibitions, Requirements, Implicit) with numbered `[EX-N]` labels.
- **Specificity Preservation (ISC Step 6)**: Prevents abstraction of specific values into vague qualifiers.
- **Constraint→ISC Coverage Map (ISC Step 8)**: Every `[EX-N]` must map to at least one ISC criterion. Unmapped constraints block Quality Gate.
- **Priority Classification**: `[CRITICAL]`/`[IMPORTANT]`/`[NICE]` tags on ISC criteria drive enhanced verification.

**Build Discipline:**
- **ISC Adherence Check (BUILD)**: Re-read all `[CRITICAL]` criteria before creating each artifact.
- **Constraint Checkpoint (BUILD)**: After creating each artifact, immediately check all `[CRITICAL]` anti-criteria.
- **Phase Separation Enforcement**: "STOP" markers prevent phase merging. BUILD ≠ EXECUTE. 7 discrete phases always.

**Knowledge Systems:**
- **Wisdom Frames (v1.8.0)**: Domain-specific knowledge files in `MEMORY/WISDOM/`. OBSERVE reads applicable frames → LEARN writes observations back. 5 seed domains shipped.
- **WisdomFrameUpdater.ts**: CLI tool for wisdom frame management (`bun WisdomFrameUpdater.ts --domain X --observation "Y" --type Z`).
- **Algorithm Reflection JSONL**: Structured Q1/Q2/Q3 learning capture to `MEMORY/LEARNING/REFLECTIONS/algorithm-reflections.jsonl` (Standard+ effort level).
- **Reflection Readback (OBSERVE)**: When CONTEXT RECOVERY finds past reflections for similar work, apply past Q2/Q3 answers to improve current session's ISC.

**Effort Level System:**
- **8 Effort Levels**: Instant, Fast, Standard, Extended, Advanced, Deep, Comprehensive, Loop (replaces simple depth system).
- **Per-phase time budgets**: Fast = 1min total (10s OBSERVE, 20s BUILD, etc.), Standard = 2min, Extended = 8min, etc.
- **Auto-compression**: If elapsed > 150% of phase budget → drop to next-lower tier for remaining phases.
- **Loop Mode Effort Decay**: Iterations 1-3 use original tier. 4+ drop to Standard if >50% passing. 8+ drop to Fast if >80% passing.

**Capability Selection:**
- **25-Capability Registry**: Full scan mandatory. Organized by 6 sections (Foundation, Thinking, Agents, Collaboration, Execution, Verification).
- **ISC-First Selection**: "Which capabilities from B/C/D improve my Ideal State Criteria?" asked before execution capabilities.
- **Audit Format Scaling**: Instant/Fast = one-line, Standard = compact, Extended+ = full matrix with ISC improvement analysis.
- **Skill Index Scan**: Active scanning of `skill-index.json` against task triggers. Bare "Skills — N/A" without evidence = critical error.

**PRD System:**
- **Every Algorithm Run Creates a PRD**: Simple task = minimal PRD (4-8 criteria). Complex task = full PRD with child decomposition.
- **Dual-Tracking**: Working memory (TaskCreate/TaskList/TaskUpdate dies with session) + Persistent memory (PRD survives, readable by any agent).
- **PRD Status Progression**: DRAFT → CRITERIA_DEFINED → PLANNED → IN_PROGRESS → VERIFYING → COMPLETE/FAILED/BLOCKED.
- **Loop Mode Integration**: `bun algorithm.ts -m loop -p PRD-{id}.md -n 128` reads PRD → spawns workers → reconciles → repeats until all criteria pass.

**Operational Improvements:**
- **Zero-Delay Output (v1.6.0)**: Emit header + task description as FIRST tokens.
- **Time Check at Every Phase**: Shows elapsed, budget, remaining. Triggers auto-compression if over 150%.
- **Self-Interrogation Scaling**: Instant/Fast skip, Standard answers Q1+Q4 only, Extended+ answers all 5 questions.
- **Discrete Phase Enforcement**: Zero tolerance for combined headers ("4-5/7") or merged phases.
- **No Agents for Instant Operations**: If Grep/Glob/Read can do it in <2s, NEVER spawn agent.

### Infrastructure Improvements

**Tooling:**
- **WisdomFrameUpdater.ts**: CLI for wisdom frame management with validation and append-only mode.
- **GenerateSkillIndex.ts**: Now supports symlinks (resolves real path before processing).
- **SessionHarvester.ts**: Renamed `CLAUDE_DIR` to `PAI_DIR` for provider-agnostic clarity.

**Quality & Validation:**
- **Security validator fix**: Strips `VITE_` and `PUBLIC_` env var prefixes before `.env` scanning (upstream sst/ion#620).
- **Rating capture filter**: 5/10 scores (ambiguous — neither good nor bad) skip learning file writes to reduce noise.

### Breaking Changes

**Start Symbol**: Changed from `🤖 PAI ALGORITHM` to `♻︎ Entering the PAI ALGORITHM…` (v1.8.0 format header).

**ISC Naming Convention**: 
- Flat lists (≤16 criteria): `ISC-C{N}` (criterion), `ISC-A{N}` (anti-criterion)
- Grouped (17-32): `ISC-{Domain}-{N}`, `ISC-A-{Domain}-{N}`
- Child PRDs (33+): Domain-specific child PRDs with own flat/grouped structure

**Effort Level System**: FULL/ITERATION/MINIMAL depth replaced by 8-tier effort level system.

---

## Upgrade Path

**From v1.3.x to v2.0.0:**

1. **Backup your USER/ directory** (settings, projects, custom content)
2. **Pull latest**: `git pull origin main`
3. **Reinstall dependencies**: `bun install`
4. **Verify skills**: `bun GenerateSkillIndex.ts` (regenerate index with symlink support)
5. **Test with simple prompt**: Verify effort level assignment and phase progression work

**New users**: Follow the [Quick Start](README.md#quick-start) — the wizard handles everything.

---

## Stats

- **Upstream commits ported**: 14 (Algorithm v0.2.25 → v1.8.0)
- **PAI version sync**: v2.5 → v3.0 (full parity)
- **New systems**: Wisdom Frames, PRD, Constraint Extraction
- **Quality gates**: 7 (QG1-QG7 with Extended+ gating)
- **Capability registry**: 25 capabilities across 6 sections
- **Effort levels**: 8 (from 3)

---

## Credits

**PAI System**: [Daniel Miessler](https://github.com/danielmiessler) — original Personal AI Infrastructure design and Algorithm architecture.

**OpenCode Platform**: [Anomaly (SST)](https://github.com/anomalyco/opencode) — provider-agnostic AI orchestration runtime.

**PAI-OpenCode**: [Steffen025](https://github.com/Steffen025) — PAI port to OpenCode with dynamic model routing and provider flexibility.

---

**Full Changelog**: https://github.com/Steffen025/pai-opencode/compare/v1.3.2...v2.0.0
