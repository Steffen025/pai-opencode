# DocumentRecent Workflow

## Trigger
"document recent", "catch up docs", "what's undocumented", "recent changes", "document today"

## Purpose
Catch up on undocumented changes by scanning git history and creating update documents for recent work that hasn't been properly documented yet.

## What It Does

Scans recent git history to identify:

1. **Commits Without Updates** - Commits that lack corresponding update documents in MEMORY
2. **Session Work** - Recent session transcripts that need documentation
3. **Learning Artifacts** - New learnings that should be captured
4. **State Changes** - Updates to algorithm-state.json or current-work.json that need context

## Execution Pattern

```typescript
// 1. Scan recent git history (configurable time range)
const since = askUserForTimeRange() || "24 hours ago"

// 2. Get commit history with diffs
git log --since="${since}" --pretty=format:"%H|%s|%ai" --stat

// 3. Check for existing update documents
// 4. Identify undocumented work
// 5. Generate update documents for gaps
```

## Implementation Steps

### 1. Determine Time Range

Ask user using AskUserQuestion tool:

```
How far back should I scan for undocumented changes?

1. Last 24 hours (1 day)
2. Last 3 days
3. Last week (7 days)
4. Custom time range

Please enter 1-4:
```

If option 4, prompt for specific date/time.

### 2. Scan Git History

Run in parallel:

```bash
# Get commit history with details
git log --since="${timeRange}" --pretty=format:"%H|%s|%ai|%an" --numstat

# Get list of modified files per commit
git log --since="${timeRange}" --name-status --pretty=format:"COMMIT:%H"

# Check current branch activity
git reflog --since="${timeRange}"
```

### 3. Identify Existing Documentation

Search for update documents covering this period:

```bash
# Search MEMORY/sessions for recent session docs
find $PAI_DIR/MEMORY/sessions -type f -mtime -${days}

# Search MEMORY/projects for project updates
find $PAI_DIR/MEMORY/projects -type f -mtime -${days}

# Search MEMORY/Learning for recent learnings
find $PAI_DIR/MEMORY/Learning -type f -mtime -${days}
```

### 4. Analyze Gaps

For each commit:

1. **Extract commit metadata**
   - Hash, subject, date, author
   - Files changed (added, modified, deleted)
   - Commit message body

2. **Check for related documentation**
   - Search session docs for commit hash references
   - Check if update document exists for this date/work
   - Verify if changes are captured in project docs

3. **Categorize the work**
   - Feature development
   - Bug fixes
   - Refactoring
   - Documentation updates
   - Configuration changes
   - Infrastructure work

4. **Determine if documentation needed**
   - Skip trivial changes (typo fixes, formatting)
   - Skip commits with "chore:" or "docs:" that are self-documenting
   - Flag significant changes without documentation

### 5. Generate Update Documents

For each undocumented change, create appropriate documentation:

#### Session Document Format

```markdown
# Session: {Work Title}
Date: {ISO timestamp}
Type: {work|feature|bugfix|refactor}

## Context
{What was the goal/trigger for this work?}

## Work Performed

### Changes Made
{Bullet list of significant changes}

### Files Modified
- {file path} - {what changed}
- {file path} - {what changed}

### Key Decisions
{Any important technical or architectural decisions}

## Results
{What was accomplished, what works now}

## Follow-up
{Any remaining work, known issues, or next steps}

## Related
- Commits: {commit hashes}
- Files: {key files to review}

---
Generated via DocumentRecent workflow
```

Save to: `$PAI_DIR/MEMORY/sessions/{YYYY-MM}/{timestamp}_SESSION_{slug}.md`

#### Project Update Format

If changes relate to an existing project in `$PAI_DIR/MEMORY/projects/`:

```markdown
# Update: {Update Title}
Project: {project name}
Date: {ISO timestamp}

## Changes
{Summary of what changed in this update}

## Implementation Details
{Technical details, code snippets if relevant}

## Status Impact
- Previous: {status before}
- Current: {status after}

## Commits
- {hash}: {subject}

---
Auto-generated via DocumentRecent workflow
```

Save to: `$PAI_DIR/MEMORY/projects/{project}/Updates/{timestamp}_{slug}.md`

#### Learning Document Format

If changes represent new knowledge/patterns:

```markdown
# Learning: {Learning Title}
Date: {ISO timestamp}
Tags: {relevant tags}

## Context
{What triggered this learning}

## What I Learned
{The key insight, pattern, or knowledge gained}

## Application
{How this applies to PAI infrastructure or development}

## Evidence
- Commits: {hashes}
- Files: {relevant files}

---
Captured via DocumentRecent workflow
```

Save to: `$PAI_DIR/MEMORY/Learning/{category}/{timestamp}_{slug}.md`

### 6. Update Indexes

After generating documents:

1. **Update Learning README**
   - Add new learning entries to `$PAI_DIR/MEMORY/Learning/README.md`

2. **Update Project Status**
   - If project docs were created, update project README or status file

3. **Create Session Index Entry**
   - Add to any session index files

### 7. Generate Summary Report

```markdown
# DocumentRecent Summary
Generated: {timestamp}
Time Range: {range scanned}

## Scan Results
- Commits scanned: {count}
- Already documented: {count}
- Undocumented work found: {count}
- Documents generated: {count}

## Documents Created

### Session Documents
- {path to file} - {title}
- {path to file} - {title}

### Project Updates
- {path to file} - {project: title}

### Learning Documents
- {path to file} - {title}

## Commits Documented
1. {hash} - {subject} → {document path}
2. {hash} - {subject} → {document path}

## Already Documented (No Action)
1. {hash} - {subject} (found in {existing doc})
2. {hash} - {subject} (trivial change, skipped)

## Statistics
- Documentation coverage: {X}%
- Average time to document: {hours/days}
- Most active areas: {files/directories with most changes}

## Recommendations
{Suggestions based on patterns found}
- Consider documenting work more frequently
- High activity in {area} - may need dedicated project
- {X} commits lack descriptive messages
```

## Analysis Patterns

### Identifying Work Types

**Feature Development:**
- Multiple files changed in related directories
- Tests added/modified
- New files created
- Commit message starts with "feat:"

**Bug Fixes:**
- Focused changes in specific files
- May include test updates
- Commit message starts with "fix:"
- References to "error", "issue", "bug" in message

**Refactoring:**
- Many files touched with similar changes
- No new functionality added
- Improved structure/organization
- Commit message starts with "refactor:"

**Infrastructure:**
- Changes to config files
- Hook or skill modifications
- MEMORY structure changes
- Workflow additions

### Determining Documentation Priority

**High Priority (Always Document):**
- New features or capabilities
- Architectural changes
- Breaking changes
- Security updates
- New workflows or skills
- Complex bug fixes

**Medium Priority (Document if Significant):**
- Performance improvements
- Refactoring with lessons learned
- Configuration changes
- Dependency updates with impact

**Low Priority (Usually Skip):**
- Typo fixes
- Formatting changes
- Trivial updates
- Auto-generated changes

## Output Format

### Console Summary

```
## DocumentRecent Workflow

Scanning commits from: 2026-01-17 to 2026-01-19 (48 hours)

Commits found: 15
├─ Already documented: 8
├─ Trivial (skipped): 3
└─ Need documentation: 4

Generating documents...

✅ Session: "Hook development workflow"
   → $PAI_DIR/MEMORY/sessions/2026-01/20260118T225343_SESSION_hook-development.md

✅ Learning: "Git hook security patterns"
   → $PAI_DIR/MEMORY/Learning/Security/20260118_git-hook-security.md

✅ Project Update: PAI Upgrade - Session 2 completion
   → $PAI_DIR/MEMORY/projects/pai-upgrade/Updates/20260118_session-2-complete.md

✅ Session: "MEMORY structure consolidation"
   → $PAI_DIR/MEMORY/sessions/2026-01/20260118T230000_SESSION_memory-consolidation.md

Documentation coverage: 80% (12/15 commits)

Summary report:
$PAI_DIR/MEMORY/sessions/2026-01/20260119T120000_document-recent-summary.md
```

## Integration Points

- **Stop Hook**: Can suggest running DocumentRecent if session had significant work
- **System Skill**: Part of maintenance operations
- **Algorithm**: Can use this to catch up after extended development sessions
- **WorkContextRecall**: Uses the documents generated by this workflow

## Error Handling

- **No commits found**: Report clean, nothing to document
- **Git errors**: Report issue, skip git operations, use file system scan instead
- **Permission errors**: Report specific files/directories with issues
- **Malformed commit messages**: Parse best-effort, flag for review

## Advanced Features

### Smart Grouping

Group related commits into single document:

```typescript
// If multiple commits touch same files in short time span
// Consider them part of single work session
const sessionGroups = groupCommitsByProximity(commits, {
  timeWindow: "2 hours",
  fileOverlap: 0.5  // 50% file overlap
});
```

### Template Selection

Choose document template based on work type:

```typescript
const template = selectTemplate({
  commitPatterns: commit.subject,
  filesChanged: commit.files,
  existingDocs: relatedDocuments
});
```

### Cross-Reference Linking

Link new documents to existing work:

```typescript
// Find related project, link in both directions
// Reference previous sessions on similar topics
// Connect to relevant learnings
```

## Example Usage

```
User: "document recent"

Jeremy: I'll scan recent git history to find undocumented work. How far back should I look?

1. Last 24 hours
2. Last 3 days
3. Last week
4. Custom range

User: "2"

Jeremy: Scanning last 3 days of commits...

Found 15 commits:
- 8 already documented in session files
- 3 trivial changes (formatting, typos)
- 4 need documentation

Generating documents for undocumented work...

✅ Created 4 new documents:
- 2 session documents
- 1 learning document
- 1 project update

Documentation coverage is now 80%.

Full summary saved to:
$PAI_DIR/MEMORY/sessions/2026-01/20260119_document-recent-summary.md

Would you like me to review any of the generated documents?
```

## Configuration Options

Store in `$PAI_DIR/config/document-recent.json`:

```json
{
  "defaultTimeRange": "24h",
  "skipPatterns": [
    "^chore\\(deps\\):",
    "^docs:",
    "typo",
    "formatting"
  ],
  "autoGroupWindow": "2h",
  "minimumFilesForDoc": 1,
  "excludePaths": [
    "node_modules/",
    "dist/",
    "*.lock"
  ],
  "templatePreferences": {
    "session": "detailed",
    "learning": "concise",
    "project": "technical"
  }
}
```

---

**Workflow Type**: Retrospective Documentation
**Execution Time**: ~15-45 seconds (depends on time range)
**Destructive**: No (only creates new files)
**Requires User Input**: Yes (time range selection)
**Output**: Multiple markdown documents + summary report
