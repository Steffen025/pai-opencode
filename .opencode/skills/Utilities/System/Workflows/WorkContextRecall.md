# WorkContextRecall Workflow

## Trigger
"we just worked on", "remember when we", "what did we do for X", "recall work on", "find previous work", "past implementation"

## Purpose
Search past work when the user asks about previous fixes, implementations, or decisions by querying MEMORY artifacts, session documents, and the PAISYSTEMUPDATES index.

## What It Does

Retrieves context from past work by searching:

1. **Session Documents** - Recent session transcripts and work logs
2. **MEMORY Work Items** - Structured work artifacts in MEMORY/Work/
3. **Project Updates** - Changes documented in MEMORY/projects/
4. **Learning Documents** - Captured learnings and patterns
5. **System Updates Index** - Using UpdateSearch.ts tool for indexed searches
6. **Git History** - Commit messages and diffs for technical details

## Execution Pattern

```typescript
// 1. Parse user query to extract keywords and context
// 2. Search PAISYSTEMUPDATES index using UpdateSearch.ts
// 3. Query MEMORY/sessions for relevant session docs
// 4. Search MEMORY/Work for related work items
// 5. Scan git history for matching commits
// 6. Aggregate and rank results by relevance
// 7. Present consolidated context to user
```

## Implementation Steps

### 1. Query Analysis

Parse the user's question to extract search parameters:

```typescript
function analyzeRecallQuery(query: string) {
  const patterns = {
    timeframe: [
      /(?:last|past|recent)\s+(week|month|day|year)/gi,
      /(?:yesterday|today|this week)/gi,
      /in\s+(\w+\s+\d{4})/gi  // "in January 2026"
    ],

    workType: [
      /bug.*?fix/gi,
      /feature|feat/gi,
      /refactor/gi,
      /implement/gi,
      /add|creat/gi
    ],

    technology: [
      /typescript|ts/gi,
      /hook|skill|workflow/gi,
      /mcp.*?server/gi,
      /algorithm/gi
    ],

    specific: [
      /file.*?name/gi,
      /function.*?called/gi,
      /how.*?did.*?we/gi
    ]
  };

  return {
    timeframe: extractTimeframe(query),
    workType: extractWorkType(query),
    keywords: extractKeywords(query),
    specificArtifacts: extractArtifacts(query)
  };
}
```

**Example queries:**
- "remember when we added the security hook?" → security + hook + added
- "what did we do for garrett-ai integration?" → garrett-ai + integration
- "how did we fix that typescript error last week?" → typescript + error + fix + last week

### 2. UpdateSearch Integration

Use the UpdateSearch.ts tool to query PAISYSTEMUPDATES index:

```bash
# Search system updates index
bun run "$PAI_DIR/tools/UpdateSearch.ts" "security hook"

# With time filter
bun run "$PAI_DIR/tools/UpdateSearch.ts" "garrett-ai" --since "2026-01-15"

# Multiple keywords
bun run "$PAI_DIR/tools/UpdateSearch.ts" "typescript error fix"
```

Parse UpdateSearch results:

```typescript
interface UpdateSearchResult {
  file: string;
  title: string;
  date: string;
  excerpt: string;
  relevanceScore: number;
}

// UpdateSearch returns matching system updates
// Parse and rank by relevance
```

### 3. Session Document Search

Query MEMORY/sessions for relevant sessions:

```bash
# Find sessions in timeframe
find "$PAI_DIR/MEMORY/sessions" -name "*SESSION*.md" -mtime -${days}

# Grep for keywords in session files
grep -l "security.*hook" "$PAI_DIR/MEMORY/sessions"/**/*.md

# Get session titles and dates
grep "^# " "$PAI_DIR/MEMORY/sessions"/**/*.md
```

Rank sessions by relevance:

```typescript
function rankSessionRelevance(session: SessionDoc, query: ParsedQuery): number {
  let score = 0;

  // Keyword matches in title
  score += countMatches(session.title, query.keywords) * 10;

  // Keyword matches in content
  score += countMatches(session.content, query.keywords) * 2;

  // Recency bonus
  const daysAgo = daysSince(session.date);
  score += Math.max(0, 30 - daysAgo);  // Up to 30 points for recent

  // Work type match
  if (session.type === query.workType) {
    score += 15;
  }

  return score;
}
```

### 4. MEMORY Work Item Search

Search structured work artifacts:

```bash
# Find work items
find "$PAI_DIR/MEMORY/Work" -type f -name "*.yaml" -o -name "*.md"

# Search work item content
grep -r "${keyword}" "$PAI_DIR/MEMORY/Work" --include="*.yaml" --include="*.md"

# Get work item metadata
cat "$PAI_DIR/MEMORY/Work"/*/items/*.yaml | grep -E "title:|status:|date:"
```

Parse work items:

```typescript
interface WorkItem {
  id: string;
  title: string;
  status: string;
  date: string;
  description: string;
  artifacts: string[];
  relatedFiles: string[];
}

// Extract relevant work items
function searchWorkItems(keywords: string[]): WorkItem[] {
  const workItemFiles = glob("$PAI_DIR/MEMORY/Work/**/items/*.yaml");

  return workItemFiles
    .map(file => parseWorkItem(file))
    .filter(item => matchesKeywords(item, keywords))
    .sort((a, b) => b.relevance - a.relevance);
}
```

### 5. Project Updates Search

Query project-specific updates:

```bash
# Search all project updates
find "$PAI_DIR/MEMORY/projects" -name "Updates" -type d

# Find updates matching keywords
grep -r "${keyword}" "$PAI_DIR/MEMORY/projects"/*/Updates/

# Get recent project activity
find "$PAI_DIR/MEMORY/projects" -name "*.md" -mtime -30
```

Match projects to query:

```typescript
function searchProjectUpdates(query: ParsedQuery): ProjectUpdate[] {
  const projects = listProjects();
  const results = [];

  for (const project of projects) {
    const updates = glob(`${project.path}/Updates/*.md`);

    for (const updateFile of updates) {
      const content = readFile(updateFile);
      const relevance = calculateRelevance(content, query);

      if (relevance > THRESHOLD) {
        results.push({
          project: project.name,
          file: updateFile,
          date: extractDate(updateFile),
          excerpt: extractRelevantExcerpt(content, query),
          relevance
        });
      }
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance);
}
```

### 6. Learning Documents Search

Search captured learnings:

```bash
# Search learning docs
grep -r "${keyword}" "$PAI_DIR/MEMORY/Learning" --include="*.md"

# List recent learnings
find "$PAI_DIR/MEMORY/Learning" -name "*.md" -mtime -30

# Search by tag/category
find "$PAI_DIR/MEMORY/Learning" -path "*/Security/*.md"
find "$PAI_DIR/MEMORY/Learning" -path "*/TypeScript/*.md"
```

Extract relevant learnings:

```typescript
function searchLearnings(keywords: string[]): Learning[] {
  const learningFiles = glob("$PAI_DIR/MEMORY/Learning/**/*.md");

  return learningFiles
    .map(file => {
      const content = readFile(file);
      const metadata = extractFrontmatter(content);

      return {
        file,
        title: metadata.title || extractTitle(content),
        tags: metadata.tags || [],
        date: metadata.date,
        category: getCategoryFromPath(file),
        excerpt: extractRelevantExcerpt(content, keywords),
        relevance: calculateRelevance(content, keywords)
      };
    })
    .filter(learning => learning.relevance > THRESHOLD)
    .sort((a, b) => b.relevance - a.relevance);
}
```

### 7. Git History Search

Search commit history for technical details:

```bash
# Search commit messages
git log --all --grep="${keyword}" --pretty=format:"%H|%s|%ai|%an"

# Search commit diffs
git log -S"${keyword}" --pretty=format:"%H|%s|%ai" --all

# Get file history
git log --follow --pretty=format:"%H|%s|%ai" -- "${file_path}"

# Search commit content
git log -p --all | grep -B5 -A5 "${keyword}"
```

Parse git results:

```typescript
interface CommitMatch {
  hash: string;
  subject: string;
  date: string;
  author: string;
  filesChanged: string[];
  relevantDiff?: string;
}

function searchGitHistory(keywords: string[]): CommitMatch[] {
  const results = [];

  // Search commit messages
  const messageMatches = execSync(
    `git log --all --grep="${keywords.join('\\|')}" --pretty=format:"%H|%s|%ai|%an"`
  );

  // Search code changes
  const codeMatches = execSync(
    `git log -S"${keywords[0]}" --pretty=format:"%H|%s|%ai"`
  );

  // Combine and deduplicate
  return combineAndRankGitResults(messageMatches, codeMatches);
}
```

### 8. Result Aggregation

Combine results from all sources:

```typescript
interface RecallResult {
  type: "session" | "work-item" | "project" | "learning" | "commit" | "update";
  title: string;
  date: string;
  file?: string;
  excerpt: string;
  relevance: number;
  metadata?: Record<string, any>;
}

function aggregateResults(
  sessions: SessionDoc[],
  workItems: WorkItem[],
  projectUpdates: ProjectUpdate[],
  learnings: Learning[],
  commits: CommitMatch[],
  systemUpdates: UpdateSearchResult[]
): RecallResult[] {

  const allResults = [
    ...sessions.map(s => toRecallResult(s, "session")),
    ...workItems.map(w => toRecallResult(w, "work-item")),
    ...projectUpdates.map(p => toRecallResult(p, "project")),
    ...learnings.map(l => toRecallResult(l, "learning")),
    ...commits.map(c => toRecallResult(c, "commit")),
    ...systemUpdates.map(u => toRecallResult(u, "update"))
  ];

  // Sort by relevance
  return allResults.sort((a, b) => b.relevance - a.relevance);
}
```

### 9. Context Synthesis

Synthesize results into coherent narrative:

```typescript
function synthesizeContext(results: RecallResult[], query: string): string {
  // Group by related work
  const relatedGroups = groupRelatedResults(results);

  // Create narrative sections
  const sections = [];

  // Timeline
  sections.push(createTimeline(results));

  // Key findings
  sections.push(createKeyFindings(results, query));

  // Technical details
  sections.push(createTechnicalDetails(results));

  // Related artifacts
  sections.push(createArtifactLinks(results));

  return sections.join("\n\n");
}
```

## Output Format

### Recall Summary

```markdown
# Work Context Recall: {query}
Search performed: {timestamp}

## Query Analysis
- Keywords: {extracted keywords}
- Timeframe: {detected timeframe}
- Work type: {detected type}

## Results Summary
Found {total} relevant artifacts:
- Sessions: {count}
- Work Items: {count}
- Project Updates: {count}
- Learnings: {count}
- Commits: {count}
- System Updates: {count}

## Timeline

**2026-01-18 23:57** - Session: Hook development workflow
- Implemented security-validator hook
- Added pre-tool-use validation
- Files: `.opencode/plugins/handlers/security-validator.ts`
- Session: [link]

**2026-01-18 22:30** - Learning: Git hook security patterns
- Learned about exit code conventions
- Pattern: Exit 2 = blocked command
- Learning: [link]

**2026-01-18 20:15** - Project Update: PAI Upgrade - Session 2
- Completed hook system refactoring
- Added capture-all-events hook
- Project: [link]

## Key Findings

### 1. Security Hook Implementation
**When:** 2026-01-18 23:57
**What:** Created security-validator hook to block dangerous commands
**How:**
- Hook intercepts Bash tool calls via PreToolUse event
- Pattern matching for destructive commands
- Exit code 2 signals blocked command

**Files Modified:**
- `.opencode/plugins/handlers/security-validator.ts` (created)
- `.opencode/config/settings.json` (hook registration)

**Key Decisions:**
- Used exit code 2 for blocked commands (vs throwing errors)
- Regex patterns for reverse shell detection
- Allow-list for safe rm operations

**Related Commit:** 3de3b79 - "feat(hooks): Add security-validator hook"

### 2. Hook System Architecture
**When:** 2026-01-18 22:00 - 23:30
**What:** Refactored hook lifecycle and event system
**Learning:** Hooks execute in specific order, can modify context

**Session Context:**
- Discussed hook execution order
- Implemented parallel event capture
- Added observability integration

### 3. Testing & Validation
**When:** 2026-01-18 23:45
**What:** Tested security patterns with malicious command examples
**Results:** Successfully blocked all test cases

## Technical Details

### Implementation Pattern
```typescript
// Security validator hook
export default function securityValidator(context: HookContext) {
  const { toolName, parameters } = context;

  if (toolName === "Bash") {
    const dangerous = checkDangerousPatterns(parameters.command);
    if (dangerous) {
      process.exit(2);  // Block command
    }
  }
}
```

### Files Involved
- `.opencode/plugins/handlers/security-validator.ts` (98 lines)
- `.opencode/plugins/handlers/event-capture.ts` (modified)
- `.opencode/config/settings.json` (hook registration)

### Tests Run
- ✅ Blocked `rm -rf /`
- ✅ Blocked reverse shell attempts
- ✅ Blocked data exfiltration
- ✅ Allowed safe commands

## Related Artifacts

### Session Documents
- [Hook development workflow]($PAI_DIR/MEMORY/sessions/2026-01/20260118T225343_SESSION_hook-development.md)

### Learning Documents
- [Git hook security patterns]($PAI_DIR/MEMORY/Learning/Security/20260118_git-hook-security.md)

### Project Updates
- [PAI Upgrade - Session 2]($PAI_DIR/MEMORY/projects/pai-upgrade/Updates/20260118_session-2-complete.md)

### Commits
- 3de3b79 - feat(hooks): Add security-validator hook
- 4d6631a - feat(hooks): Add capture-all-events hook

### System Updates
- [Security Hook Implementation](found via UpdateSearch)
- [Hook Lifecycle Documentation](found via UpdateSearch)

## Follow-up Questions

Based on this context, you might also be interested in:
1. How does the hook registration work in settings.json?
2. What other security patterns were considered?
3. How does this integrate with the observability system?

---
Search completed in 1.2s
Results ranked by relevance to query
```

### Console Output

```
## WorkContextRecall: "security hook"

Searching past work...

✓ UpdateSearch index (0.2s) - 3 results
✓ Session documents (0.3s) - 2 results
✓ Work items (0.1s) - 1 result
✓ Project updates (0.2s) - 1 result
✓ Learning docs (0.2s) - 1 result
✓ Git history (0.2s) - 2 commits

Found 10 relevant artifacts

## Most Relevant

**Session: Hook development workflow** (2026-01-18 23:57)
Created security-validator hook to block dangerous commands. Implemented
pattern matching for reverse shells, data exfiltration, and destructive ops.

**Learning: Git hook security patterns** (2026-01-18 22:30)
Learned exit code conventions for hooks. Exit 2 = blocked command allows
Claude Code to handle gracefully without throwing errors.

**Commit: 3de3b79** (2026-01-18 23:58)
feat(hooks): Add security-validator hook
Added pre-tool-use validation with dangerous pattern detection.

## Timeline
2026-01-18 22:00 - Started hook system work
2026-01-18 22:30 - Captured learning about hook patterns
2026-01-18 23:57 - Completed security hook implementation
2026-01-18 23:58 - Committed changes

Full context report:
$PAI_DIR/MEMORY/sessions/{date}/work-recall_{slug}.md

Need more details on any of these?
```

## Advanced Features

### Smart Query Expansion

Expand user query with related terms:

```typescript
const queryExpansion = {
  "security": ["security", "safe", "validate", "block", "danger"],
  "hook": ["hook", "lifecycle", "event", "intercept"],
  "bug fix": ["fix", "bug", "error", "issue", "solve"],
  "feature": ["feat", "feature", "add", "implement", "create"]
};
```

### Related Work Detection

Find related work even if not directly matching:

```typescript
// If user searches for "security hook"
// Also find: sessions mentioning hooks, security patterns, validation

function findRelatedWork(primaryResults: RecallResult[]): RecallResult[] {
  const relatedKeywords = extractRelatedKeywords(primaryResults);
  return searchWithExpandedKeywords(relatedKeywords);
}
```

### Temporal Clustering

Group work by time proximity:

```typescript
// If multiple results within 2 hours, likely same work session
function clusterByTime(results: RecallResult[]): Cluster[] {
  const clusters = [];
  const sorted = results.sort((a, b) => a.date - b.date);

  let currentCluster = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const timeDiff = sorted[i].date - sorted[i-1].date;

    if (timeDiff < 2 * 60 * 60 * 1000) {  // 2 hours
      currentCluster.push(sorted[i]);
    } else {
      clusters.push(currentCluster);
      currentCluster = [sorted[i]];
    }
  }

  return clusters;
}
```

## Integration Points

- **UpdateSearch Tool**: Primary index search mechanism
- **DocumentRecent**: Creates artifacts that this workflow searches
- **PAI Skill**: Can use recall to load relevant context
- **Algorithm**: Can recall previous solutions to similar problems

## Example Usage

```
User: "remember when we added the garrett-ai MCP server?"

Jeremy: Searching past work for "garrett-ai MCP server"...

Found 8 relevant artifacts from January 2026.

Most Relevant:

**Session: MCP Server Development** (2026-01-15)
Implemented garrett-ai MCP server with voice support. Added 5 functions:
chat_with_garrett, list_conversations, create_conversation,
get_conversation_history, and chat_with_garrett_voice.

**Commit: 5a3d891** (2026-01-15 14:23)
feat(mcp): Add garrett-ai server with voice response

**Learning: MCP Function Naming** (2026-01-15)
Learned convention: mcp__{server-name}__{function-name}

Key technical details:
- Used Delphi.AI API for backend
- Implemented audio playback via macOS 'say' command
- Conversation state managed server-side

Files created:
- .opencode/mcp-servers/garrett-ai/index.ts
- .opencode/mcp-servers/garrett-ai/README.md

Want me to show you the implementation details or related work?
```

---

**Workflow Type**: Context Retrieval
**Execution Time**: ~1-2 seconds
**Destructive**: No (read-only)
**Requires User Input**: No (query comes from user message)
**Output**: Consolidated context summary + links to artifacts
