# Memory System

**The unified system memory - what happened, what we learned, what we're working on.**

**Version:** 7.0 (Projects-native architecture, 2026-01-12)
**Location:** `~/.opencode/MEMORY/`

---

## Architecture

**OpenCode's `projects/` is the source of truth. Plugins capture domain-specific events directly. Harvesting tools extract learnings from session transcripts.**

```
User Request
    ↓
OpenCode projects/ (native session storage - SQLite database, 30-day retention)
    ↓
Plugin Events trigger domain-specific captures:
    ├── Algorithm (AI) → WORK/
    ├── RatingCapture → LEARNING/SIGNALS/
    ├── WorkCompletionLearning → LEARNING/
    └── SecurityValidator → SECURITY/
    ↓
Harvesting (periodic):
    ├── SessionHarvester → LEARNING/ (extracts corrections, errors, insights)
    └── LearningPatternSynthesis → LEARNING/SYNTHESIS/ (aggregates ratings)
```

**Key insight:** Plugins write directly to specialized directories. There is no intermediate "firehose" layer - OpenCode's `projects/` serves that purpose natively.

---

## Directory Structure

```
~/.opencode/MEMORY/
├── WORK/                   # PRIMARY work tracking
│   └── {timestamp}_{slug}/
│       └── PRD.md          # Single source of truth (metadata + ISC + decisions + changelog)
├── LEARNING/               # Learnings (includes signals)
│   ├── SYSTEM/             # PAI/tooling learnings
│   │   └── YYYY-MM/
│   ├── ALGORITHM/          # Task execution learnings
│   │   └── YYYY-MM/
│   ├── FAILURES/           # Full context dumps for low ratings (1-3)
│   │   └── YYYY-MM/
│   │       └── {timestamp}_{8-word-description}/
│   │           ├── CONTEXT.md      # Human-readable analysis
│   │           ├── transcript.jsonl # Raw conversation
│   │           ├── sentiment.json  # Sentiment metadata
│   │           └── tool-calls.json # Tool invocations
│   ├── SYNTHESIS/          # Aggregated pattern analysis
│   │   └── YYYY-MM/
│   │       └── weekly-patterns.md
│   ├── REFLECTIONS/        # Algorithm performance reflections
│   │   └── algorithm-reflections.jsonl
│   └── SIGNALS/            # User satisfaction ratings
│       └── ratings.jsonl
├── RESEARCH/               # Agent output captures
│   └── YYYY-MM/
├── SECURITY/               # Security audit events
│   └── security-events.jsonl
├── STATE/                  # Operational state
│   ├── algorithms/         # Per-session algorithm state (phase, criteria, effort level)
│   ├── kitty-sessions/     # Per-session Kitty terminal env (listenOn, windowId)
│   ├── tab-titles/         # Per-window tab state (title, color, phase)
│   ├── events.jsonl        # Unified event log (append-only, typed events from plugins)
│   ├── session-names.json  # Auto-generated session names (from SessionAutoName plugin)
│   ├── current-work.json
│   ├── format-streak.json
│   ├── algorithm-streak.json
│   ├── trending-cache.json
│   ├── progress/           # Multi-session project tracking
│   └── integrity/          # System health checks
├── PAISYSTEMUPDATES/         # Architecture change history
│   ├── index.json
│   ├── CHANGELOG.md
│   └── YYYY/MM/
└── README.md
```

---

## Directory Details

### OpenCode projects/ - Native Session Storage

**Location:** `~/.opencode/projects/` (SQLite database)
**What populates it:** OpenCode automatically (every conversation)
**Content:** Complete session transcripts in SQLite format
**Format:** Session data stored in SQLite database with structured tables
**Retention:** 30 days (OpenCode manages cleanup)
**Purpose:** Source of truth for all session data; harvesting tools read from here

This is the actual "firehose" - every message, tool call, and response. PAI leverages this native storage rather than duplicating it.

### WORK/ - Primary Work Tracking

**What populates it:**
- Algorithm (AI) creates work dir with PRD.md during execution
- `WorkCompletionLearning.plugin.ts` on Stop (updates PRD/THREAD)
- `SessionCleanup.plugin.ts` on SessionEnd (marks COMPLETED)

**Content:** Flat work directories with a single PRD.md as source of truth
**Format:** `WORK/{timestamp}_{slug}/PRD.md` — consolidated metadata + ISC + decisions + changelog
**Purpose:** Track all discrete work units with lineage, verification, and feedback

**PRD.md Structure (v4.0 — consolidated single file):**
- **YAML frontmatter** — session metadata (id, title, session_id, status, effort_level, completed_at, iteration count, verification_summary)
- **STATUS** — progress table (criteria passing, phase, next action, blockers)
- **APPETITE** — time budget, circuit breaker, ISC target count
- **CONTEXT** — problem space from user prompt, key files
- **RISKS & RABBIT HOLES** — populated during THINK phase
- **PLAN** — populated during PLAN phase
- **IDEAL STATE CRITERIA** — checkbox markdown (`- [x]`/`- [ ]`) as system of record
- **DECISIONS** — non-obvious technical decisions logged during BUILD/EXECUTE
- **CHANGELOG** — timestamped entries replacing THREAD.md

**Work Directory Lifecycle:**
1. Algorithm execution → AI creates work dir with PRD.md (frontmatter includes session metadata)
2. `PostToolUse` → PRDSync syncs PRD frontmatter to work.json on Write/Edit
3. `SessionEnd` → SessionCleanup marks PRD status COMPLETED, clears state

**Note:** Legacy work directories (pre-2026-02-22) may have META.yaml, ISC.json, THREAD.md alongside PRD.md. All consumers check PRD.md frontmatter first, fall back to legacy files.

### LEARNING/ - Categorized Learnings

**What populates it:**
- `RatingCapture.plugin.ts` (explicit ratings + implicit sentiment + low-rating learnings)
- `WorkCompletionLearning.plugin.ts` (significant work session completions)
- `SessionHarvester.ts` (periodic extraction from projects/ transcripts)
- `LearningPatternSynthesis.ts` (aggregates ratings into pattern reports)

**Structure:**
- `LEARNING/SYSTEM/YYYY-MM/` - PAI/tooling learnings (infrastructure issues)
- `LEARNING/ALGORITHM/YYYY-MM/` - Task execution learnings (approach errors)
- `LEARNING/SYNTHESIS/YYYY-MM/` - Aggregated pattern analysis (weekly/monthly reports)
- `LEARNING/REFLECTIONS/algorithm-reflections.jsonl` - Algorithm performance reflections (Q1/Q2/Q3 from LEARN phase)
- `LEARNING/SIGNALS/ratings.jsonl` - All user satisfaction ratings

**Categorization logic:**
| Directory | When Used | Example Triggers |
|-----------|-----------|------------------|
| `SYSTEM/` | Tooling/infrastructure failures | plugin crash, config error, deploy failure |
| `ALGORITHM/` | Task execution issues | wrong approach, over-engineered, missed the point |
| `FAILURES/` | Full context for low ratings (1-3) | severe frustration, repeated errors |
| `REFLECTIONS/` | Algorithm performance analysis | per-session 3-question reflection from LEARN phase |
| `SYNTHESIS/` | Pattern aggregation | weekly analysis, recurring issues |

### LEARNING/FAILURES/ - Full Context Failure Analysis

**What populates it:**
- `RatingCapture.plugin.ts` via `FailureCapture.ts` (for ratings 1-3)
- Manual migration via `bun FailureCapture.ts --migrate`

**Content:** Complete context dumps for low-sentiment events
**Format:** `FAILURES/YYYY-MM/{timestamp}_{8-word-description}/`
**Purpose:** Enable retroactive learning system analysis by preserving full context

**Each failure directory contains:**
| File | Description |
|------|-------------|
| `CONTEXT.md` | Human-readable analysis with metadata, root cause notes |
| `transcript.jsonl` | Full raw conversation up to the failure point |
| `sentiment.json` | Sentiment analysis output (rating, confidence, detailed analysis) |
| `tool-calls.json` | Extracted tool calls with inputs and outputs |

**Directory naming:** `YYYY-MM-DD-HHMMSS_eight-word-description-from-inference`
- Timestamp in PST
- 8-word description generated by fast inference to capture failure essence

**Rating thresholds:**
| Rating | Capture Level |
|--------|--------------|
| 1 | Full failure capture + learning file |
| 2 | Full failure capture + learning file |
| 3 | Full failure capture + learning file |
| 4-5 | Learning file only (if warranted) |
| 6-10 | No capture (positive/neutral) |

**Why this exists:** When significant frustration occurs (1-3), a brief summary isn't enough. Full context enables:
1. Root cause identification - what sequence led to the failure?
2. Pattern detection - do similar failures share characteristics?
3. Systemic improvement - what changes would prevent this class of failure?

### RESEARCH/ - Agent Outputs

**What populates it:** Agent tasks write directly to this directory
**Content:** Agent completion outputs (researchers, architects, engineers, etc.)
**Format:** `RESEARCH/YYYY-MM/YYYY-MM-DD-HHMMSS_AGENT-type_description.md`
**Purpose:** Archive of all spawned agent work

### SECURITY/ - Security Events

**What populates it:** `SecurityValidator.plugin.ts` on tool validation
**Content:** Security audit events (blocks, confirmations, alerts)
**Format:** `SECURITY/security-events.jsonl`
**Purpose:** Security decision audit trail

### STATE/ - Fast Runtime Data

**What populates it:** Various tools and plugins
**Content:** High-frequency read/write JSON files for runtime state
**Key Property:** Ephemeral - can be rebuilt from RAW or other sources. Optimized for speed, not permanence.

**Key contents:**
- `algorithms/` - Per-session algorithm state files (`{sessionId}.json` — phase, criteria, effort level, active flag)
- `kitty-sessions/` - Per-session Kitty terminal env (`{sessionId}.json` — listenOn, windowId for tab control and voice gating)
- `tab-titles/` - Per-window tab state (`{windowId}.json` — title, color, phase for daemon recovery)
- `session-names.json` - Auto-generated session names from SessionAutoName plugin
- `current-work.json` - Active work directory pointer
- `format-streak.json`, `algorithm-streak.json` - Performance metrics
- `progress/` - Multi-session project tracking
- `integrity/` - System health check results

This is mutable state that changes during execution - not historical records. If deleted, system recovers gracefully.

**`events.jsonl` - Unified Event Log:**

An append-only JSONL file where plugins emit structured, typed events alongside their normal state writes. Each line is a JSON object with `timestamp`, `session_id`, `source`, `type`, and type-specific fields. The type field uses a dot-separated topic hierarchy (e.g., `algorithm.phase`, `work.created`, `rating.captured`, `voice.sent`). This file is an observability layer -- it does NOT replace any of the mutable state files listed above. Events are written by `${PAI_DIR}/plugins/lib/event-emitter.ts` using synchronous append, and errors are silently swallowed so the event log never disrupts plugin execution. Consumers can tail or `fs.watch` this file for real-time visibility into PAI activity.

### PAISYSTEMUPDATES/ - Change History

**What populates it:** Manual via CreateUpdate.ts tool
**Content:** Canonical tracking of all system changes
**Purpose:** Track architectural decisions and system changes over time

---

## Plugin Integration

| Plugin | Trigger | Writes To |
|--------|---------|-----------|
| Algorithm (AI) | During execution | WORK/PRD.md, STATE/current-work-{sessionId}.json |
| PRDSync.plugin.ts | PostToolUse (Write/Edit) | STATE/work.json (syncs PRD frontmatter) |
| WorkCompletionLearning.plugin.ts | SessionEnd | LEARNING/ (significant work) |
| SessionCleanup.plugin.ts | SessionEnd | WORK/PRD.md (status→COMPLETED), clears STATE |
| RatingCapture.plugin.ts | UserPromptSubmit | LEARNING/SIGNALS/, LEARNING/, FAILURES/ (1-3) |
| SecurityValidator.plugin.ts | PreToolUse | SECURITY/ |

> **Note:** All plugins listed above also emit typed events to `STATE/events.jsonl` via `appendEvent()`. See [THEPLUGINSYSTEM.md § Unified Event System](THEPLUGINSYSTEM.md) for event types and consumer details.

## Harvesting Tools

| Tool | Purpose | Reads From | Writes To |
|------|---------|------------|-----------|
| SessionHarvester.ts | Extract learnings from transcripts | projects/ | LEARNING/ |
| LearningPatternSynthesis.ts | Aggregate ratings into patterns | LEARNING/SIGNALS/ | LEARNING/SYNTHESIS/ |
| FailureCapture.ts | Full context dumps for low ratings | projects/, SIGNALS/ | LEARNING/FAILURES/ |
| ActivityParser.ts | Parse recent file changes | projects/ | (analysis only) |

---

## Data Flow

```
User Request
    ↓
OpenCode → projects/ (SQLite session storage)
    ↓
Algorithm (AI) → WORK/{timestamp}_{slug}/PRD.md + STATE/current-work-{sessionId}.json
    ↓
[Work happens - AI writes PRD directly, PRDSync keeps work.json in sync]
    ↓
RatingCapture → LEARNING/SIGNALS/ + LEARNING/
    ↓
WorkCompletionLearning → LEARNING/ (for significant work, reads PRD.md frontmatter)
    ↓
SessionSummary → WORK/PRD.md (status→COMPLETED), clears STATE/current-work-{sessionId}.json

[Periodic harvesting]
    ↓
SessionHarvester → scans projects/ → writes LEARNING/
LearningPatternSynthesis → analyzes SIGNALS/ → writes SYNTHESIS/
```

---

## Quick Reference

### Check current work
```bash
cat ~/.opencode/MEMORY/STATE/current-work.json
ls ~/.opencode/MEMORY/WORK/ | tail -5
```

### Check ratings
```bash
tail ~/.opencode/MEMORY/LEARNING/SIGNALS/ratings.jsonl
```

### View session transcripts
```bash
# OpenCode stores sessions in SQLite database
# Use opencode CLI to list recent sessions
opencode sessions list --recent 5

# Or query the database directly
sqlite3 ~/.opencode/projects/sessions.db "SELECT id, created_at FROM sessions ORDER BY created_at DESC LIMIT 5"
```

### Check learnings
```bash
ls ~/.opencode/MEMORY/LEARNING/SYSTEM/
ls ~/.opencode/MEMORY/LEARNING/ALGORITHM/
ls ~/.opencode/MEMORY/LEARNING/SYNTHESIS/
```

### Check failures
```bash
# List recent failure captures
ls -lt ~/.opencode/MEMORY/LEARNING/FAILURES/$(date +%Y-%m)/ 2>/dev/null | head -10

# View a specific failure
cat ~/.opencode/MEMORY/LEARNING/FAILURES/2026-01/*/CONTEXT.md | head -100

# Migrate historical low ratings to FAILURES
bun run ~/.opencode/PAI/Tools/FailureCapture.ts --migrate
```

### Check multi-session progress
```bash
ls ~/.opencode/MEMORY/STATE/progress/
```

### Run harvesting tools
```bash
# Harvest learnings from recent sessions
bun run ~/.opencode/PAI/Tools/SessionHarvester.ts --recent 10

# Generate pattern synthesis
bun run ~/.opencode/PAI/Tools/LearningPatternSynthesis.ts --week
```

---

## Migration History

**2026-02-22:** v7.2 - PRD Consolidation (v4.0 work directories)
- Consolidated META.yaml, ISC.json, THREAD.md into single PRD.md per work directory
- PRD.md frontmatter now holds session metadata (title, session_id, status, completed_at)
- ISC section in PRD (checkbox markdown) is the system of record for criteria
- CHANGELOG section in PRD replaces THREAD.md
- All plugins updated: SessionCleanup, WorkCompletionLearning, LoadContext
- Legacy fallback preserved: consumers check PRD.md first, fall back to META.yaml/ISC.json
- Dropped never-populated sections: NON-SCOPE, ASSUMPTIONS, OPEN QUESTIONS

**2026-01-17:** v7.1 - Full Context Failure Analysis
- Added LEARNING/FAILURES/ directory for comprehensive failure captures
- Created FailureCapture.ts tool for generating context dumps
- Updated RatingCapture.plugin.ts to create failure captures for ratings 1-3
- Each failure gets its own directory with transcript, sentiment, tool-calls, and context
- Directory names use 8-word descriptions generated by fast inference
- Added migration capability via `bun FailureCapture.ts --migrate`

**2026-01-12:** v7.0 - Projects-native architecture
- Eliminated RAW/ directory entirely - OpenCode's `projects/` is the source of truth
- Removed EventLogger.plugin.ts (was duplicating what projects/ already captures)
- Created SessionHarvester.ts to extract learnings from projects/ transcripts
- Created WorkCompletionLearning.plugin.ts for session-end learning capture
- Created LearningPatternSynthesis.ts for rating pattern aggregation
- Added LEARNING/SYNTHESIS/ for pattern reports
- Updated ActivityParser.ts to use projects/ as data source
- Removed archive functionality from pai.ts (OpenCode handles 30-day cleanup)

**2026-01-11:** v6.1 - Removed RECOVERY system
- Deleted RECOVERY/ directory (5GB of redundant snapshots)
- Removed RecoveryJournal.plugin.ts, recovery-engine.ts, snapshot-manager.ts
- Git provides all necessary rollback capability

**2026-01-11:** v6.0 - Major consolidation
- WORK is now the PRIMARY work tracking system (not SESSIONS)
- Deleted SESSIONS/ directory entirely
- Merged SIGNALS/ into LEARNING/SIGNALS/
- Merged PROGRESS/ into STATE/progress/
- Merged integrity-checks/ into STATE/integrity/
- Fixed AutoWorkCreation plugin (prompt vs user_prompt field)
- Updated all plugins to use correct paths

**2026-01-10:** v5.0 - Documentation consolidation
- Consolidated WORKSYSTEM.md into MEMORYSYSTEM.md

**2026-01-09:** v4.0 - Major restructure
- Moved BACKUPS to `~/.opencode/BACKUPS/` (outside MEMORY)
- Renamed RAW-OUTPUTS to RAW
- All directories now ALL CAPS

**2026-01-05:** v1.0 - Unified Memory System migration
- Previous: `~/.opencode/history/`, `~/.opencode/context/`, `~/.opencode/progress/`
- Current: `~/.opencode/MEMORY/`
- Files migrated: 8,415+

---

## Related Documentation

- **Plugin System:** `THEPLUGINSYSTEM.md`
- **Architecture:** `PAISYSTEMARCHITECTURE.md`
