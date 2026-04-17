# ADR-007: Memory System Structure Preserved

**Status:** Accepted  
**Date:** 2026-01-25  
**Deciders:** Steffen (pai-opencode maintainer)  
**Tags:** compatibility, learning-system, core

---

## Context

PAI v2.4 has a sophisticated memory system that enables learning loops and continuous improvement. The system uses a file-based directory structure under `MEMORY/`:

```
MEMORY/
├── RAW/           # Event logs (JSONL) - everything flows here first
├── WORK/          # Primary work tracking (work items, verification)
├── LEARNING/      # Algorithm phase learnings + SIGNALS/ (ratings)
├── RESEARCH/      # Agent output captures
├── SECURITY/      # Security events (filtered from RAW)
├── STATE/         # Runtime state (current work, progress, integrity)
└── SESSIONS/      # Session summaries and handoff prompts
```

**The Question:**
Should we preserve this exact structure, simplify it, or redesign for OpenCode?

---

## Decision

**Preserve exact memory directory structure from PAI v2.4, with no modifications.**

This means:
- Identical directory names and hierarchy
- Same file naming conventions
- Same JSONL/Markdown formats
- Same learning capture patterns

Only change: Path prefix (`.claude/MEMORY/` → `.opencode/MEMORY/`)

---

## Rationale

### 1. Memory Structure is Platform-Agnostic

The MEMORY system is purely file-based:
- No runtime dependencies on Claude Code
- No platform-specific APIs used
- Just files written by hooks/plugins
- Same patterns work on any platform

### 2. Enables Learning System (v1.0 Feature)

PAI's learning loop depends on this structure:
- **RAW/** contains all events → source of truth
- **LEARNING/** stores phase-specific insights → Algorithm improvement
- **SIGNALS/** captures ratings → quality feedback
- **STATE/** tracks current work → session continuity

Breaking structure = breaking learning system.

### 3. Tool Compatibility

PAI has analysis tools that:
- Parse MEMORY structure
- Generate learning reports
- Extract improvement signals
- Consolidate sessions

Preserving structure means these tools work on pai-opencode data.

### 4. Proven Architecture

PAI's MEMORY structure has:
- Evolved over multiple versions
- Handled thousands of sessions
- Scaled to large projects
- Clear organizational model

No need to redesign what works.

---

## Alternatives Considered

### 1. Simplify to flat structure (all files in one directory)
**Rejected** because:
- Loses organizational clarity
- Makes file proliferation worse
- Harder to find specific types of data
- No clear benefit (saving one level of dirs?)

### 2. Use database instead of files
**Rejected** because:
- Adds complexity (database setup, migrations)
- Loses transparency (can't `cat` a database)
- Harder to version control
- Breaks compatibility with PAI tools
- Files work well for this use case

### 3. Use JSON files instead of directory structure
**Rejected** because:
- Single file would be huge (sessions accumulate)
- Harder to grep/search
- No clear wins over directories
- Loses file-per-item benefits

### 4. Adapt structure for OpenCode features
**Rejected** because:
- No OpenCode features that require different structure
- Would create divergence from PAI
- Loses tool compatibility

---

## Consequences

### ✅ **Positive**

- **File-Based, Inspectable:** Human-readable without tools
  - `cat MEMORY/SESSIONS/latest.md` works
  - `grep "error" MEMORY/RAW/*.jsonl` works
  - Version controllable (git)

- **PAI Tool Compatible:** Analysis tools work on pai-opencode data
  - Learning extractors parse structure
  - Consolidation scripts work
  - Report generators function

- **Learning Loops Enabled (v1.0):** Core feature works immediately
  - Algorithm phase learnings captured
  - Ratings tracked in SIGNALS/
  - Work items in WORK/
  - Session continuity via STATE/

- **Clear Organization:** Easy to find what you need
  - Session summaries → SESSIONS/
  - Security events → SECURITY/
  - Current work → STATE/
  - Historical learnings → LEARNING/

### ❌ **Negative**

- **File Proliferation:** Many small files over time
  - *Mitigation:* Archive old sessions periodically
  - *Tool:* Cleanup scripts (future enhancement)
  - *Reality:* Disk space is cheap, files are manageable

- **No Built-in Query:** Can't SQL query the data
  - *Mitigation:* `grep`, `rg`, `find` work well
  - *Future:* Could add indexing layer on top
  - *Reality:* File searching is fast enough

- **Manual Cleanup Required:** No automatic archiving
  - *Mitigation:* Document cleanup procedures
  - *Future:* Add archive utility
  - *Current:* Users manage their own MEMORY/

---

## Directory Purposes

**Preserved from PAI v2.4:**

| Directory | Purpose | File Format | Example |
|-----------|---------|-------------|---------|
| **RAW/** | All events (source of truth) | JSONL | `2026-01-25-events.jsonl` |
| **WORK/** | Work item tracking | Directories | `20260125-143000_feature-name/` |
| **LEARNING/** | Algorithm phase learnings | Markdown | `OBSERVE/2026-01-25-context-loading.md` |
| **LEARNING/SIGNALS/** | Ratings and feedback | JSONL | `ratings.jsonl` |
| **RESEARCH/** | Agent research outputs | Markdown | `2026-01-25-market-research.md` |
| **SECURITY/** | Security events | JSONL/Markdown | `blocked-commands.jsonl` |
| **STATE/** | Runtime state | JSON | `current-work.json` |
| **SESSIONS/** | Session summaries, handoffs | Markdown | `2026-01-25-session.md` |

---

## File Naming Conventions

**Preserved from PAI v2.4:**

```
# Sessions
YYYY-MM-DD-HHMMSS_SESSION_description.md

# Work Items
YYYYMMDD-HHMMSS_description/
  ├── context.md
  ├── verification.md
  └── output.md

# Learnings
YYYY-MM-DD_learning-description.md

# Research
YYYY-MM-DD_research-topic.md
```

**Consistency across platforms = easier migrations.**

---

## Usage Patterns

### Capture Session Summary
```bash
# Plugin writes to SESSIONS/
echo "# Session: Feature X" > .opencode/MEMORY/SESSIONS/2026-01-25-feature-x.md
```

### Log Rating
```bash
# Append to ratings.jsonl
echo '{"timestamp":"2026-01-25T14:30:00Z","rating":9,"task":"bug-fix"}' \
  >> .opencode/MEMORY/LEARNING/SIGNALS/ratings.jsonl
```

### Track Current Work
```bash
# Update state
jq '.currentWork = "feature-x"' .opencode/MEMORY/STATE/current-work.json > tmp && mv tmp current-work.json
```

### Search Historical Sessions
```bash
# Find sessions about topic X
rg "topic X" .opencode/MEMORY/SESSIONS/
```

---

## Learning System Integration

**How MEMORY enables learning (v1.0):**

1. **Capture (Stop hook):** Session summary → `SESSIONS/`
2. **Extract (Background):** Parse LEARNING/ for insights
3. **Consolidate (Weekly):** Combine learnings into patterns
4. **Improve (Ongoing):** Update prompts/skills based on LEARNING/

**Flow:**
```
Event → RAW/ → Filter → LEARNING/phase/
                      → SECURITY/ (if security event)
                      → WORK/ (if work item)

Session End → Summary → SESSIONS/
Rating → SIGNALS/ratings.jsonl
```

---

## Verification

**Check MEMORY structure exists:**
```bash
cd /path/to/your/pai-opencode

# Verify all directories present
for dir in RAW WORK LEARNING RESEARCH SECURITY STATE SESSIONS; do
  [ -d ".opencode/MEMORY/$dir" ] && echo "✅ $dir" || echo "❌ $dir"
done

# Verify LEARNING subdirectories
ls .opencode/MEMORY/LEARNING/
# Should show: ALGORITHM OBSERVE THINK PLAN BUILD EXECUTE VERIFY SIGNALS SYSTEM
```

---

## Migration Path

**When upgrading from PAI v2.4:**

1. **Copy MEMORY/ directory:**
   ```bash
   cp -r ~/.claude/MEMORY ~/.opencode/MEMORY
   ```

2. **No format changes needed** - files transfer directly

3. **Path references update automatically** via `$PAI_DIR`

**That's it. Structure compatibility = easy migration.**

---

## Future Enhancements

**Potential additions (not in v1.0):**

1. **Automatic Archiving:** Move old sessions to `archive/` after 90 days
2. **Indexing Layer:** SQLite index over MEMORY/ for fast queries
3. **Visualization Dashboard:** Browse MEMORY/ via web UI
4. **Compression:** gzip old JSONL files to save space
5. **Sync Service:** Backup MEMORY/ to cloud storage

**Principle:** Preserve file-based foundation, add tooling on top.

---

## Documentation

**MEMORY system documented in:**
- `.opencode/MEMORY/README.md` - Structure explanation
- PAI documentation - Learning system guides
- Individual directory README files (future)

**Example README.md:**
```markdown
# MEMORY System

This directory contains all captured learnings, sessions, and state.

## Directories
- `RAW/` - Event logs (source of truth)
- `SESSIONS/` - Session summaries
- `LEARNING/` - Algorithm learnings by phase
- ... (see full docs)

## Do NOT commit to git
MEMORY/ contains personal data and should be gitignored.
```

---

## References

- **Structure:** `.opencode/MEMORY/` (all subdirectories)
- **PAI v2.4 Source:** `~/.claude/MEMORY/` (identical structure)
- **Documentation:** `.opencode/MEMORY/README.md`
- **Learning System:** PAI learning loop documentation

---

## Related ADRs

- ADR-003: Skills System Unchanged (same reasoning - preserve what works)
- ADR-001: Hooks → Plugins (plugins write to MEMORY/)

---

*This ADR establishes MEMORY/ as platform-agnostic, preserving learning system compatibility.*
