# DocumentSession Workflow

## Purpose
Capture and document the current session's work to MEMORY for historical tracking and knowledge preservation.

## Triggers
- User says "document session"
- User says "document today"
- User says "document this session"
- System skill invoked with `document-session` operation

## What It Does

1. **Analyze Current Session**
   - Review conversation transcript
   - Identify key topics and themes
   - Extract decisions made
   - Note learnings and insights
   - List files modified

2. **Categorize Significance**
   - **minor**: Routine questions, small fixes, clarifications
   - **standard**: Feature work, bug fixes, normal development
   - **major**: Architecture changes, significant features, important decisions

3. **Create Session Document**
   - Generate timestamp-based filename
   - Write structured markdown to PAISYSTEMUPDATES
   - Include all relevant metadata

4. **Update Index**
   - Add entry to index.json
   - Maintain chronological order
   - Tag appropriately

## Output Location

```
$PAI_DIR/MEMORY/PAISYSTEMUPDATES/YYYY/MM/YYYYMMDDTHHMMSS_SESSION_summary.md
```

Example: `$PAI_DIR/MEMORY/PAISYSTEMUPDATES/2026/01/20260119T143022_SESSION_document-session-workflow.md`

## Document Format

```yaml
---
type: session
created: YYYY-MM-DD
tags: [session, topic1, topic2]
significance: minor|standard|major
---

# Session: Brief Title

## Summary
Concise description of what was accomplished in this session. Focus on the main objectives and outcomes.

## Key Decisions
- Decision 1: Rationale
- Decision 2: Rationale
- Decision 3: Rationale

## Learnings
- Learning 1: What was discovered
- Learning 2: What was understood
- Learning 3: What patterns emerged

## Files Changed
- /absolute/path/to/file1.ts
- /absolute/path/to/file2.md
- /absolute/path/to/file3.json

## Technical Details
Any implementation specifics, configuration changes, or technical context worth preserving.

## Next Steps
- Follow-up item 1
- Follow-up item 2
- Future consideration
```

## Implementation Steps

### 1. Analyze Session Content

```typescript
// Review conversation history
const sessionContent = getCurrentSessionTranscript();
const topics = extractTopics(sessionContent);
const decisions = extractDecisions(sessionContent);
const learnings = extractLearnings(sessionContent);
```

### 2. Determine Significance

**Criteria:**
- **minor**: < 5 exchanges, no code changes, informational only
- **standard**: Normal development work, typical session length
- **major**: > 20 exchanges, architectural changes, multiple systems affected

### 3. Generate Document

```bash
# Use CreateUpdate.ts tool
bun run $PAI_DIR/tools/CreateUpdate.ts \
  --type session \
  --title "Brief session summary" \
  --content "Generated markdown content" \
  --tags "session,topic1,topic2" \
  --significance "standard"
```

### 4. Update Index

```bash
# Use UpdateIndex.ts tool
bun run $PAI_DIR/tools/UpdateIndex.ts \
  --file "$PAI_DIR/MEMORY/PAISYSTEMUPDATES/2026/01/20260119T143022_SESSION_summary.md" \
  --type session
```

## Integration with System Skill

The System skill invokes this workflow when handling:
- `document session` operation
- `document today` operation (documents current session)

## Best Practices

1. **Be Concise**: Focus on what matters, not minutiae
2. **Use Tags Wisely**: Include skill names, domains, operation types
3. **Absolute Paths**: Always use full paths in "Files Changed"
4. **Actionable Next Steps**: Make follow-ups clear and actionable
5. **Context for Future**: Write as if reading 6 months later

## Example Tags

```yaml
tags: [session, system, hooks, typescript, bugfix]
tags: [session, algorithm, specfirst, implementation]
tags: [session, security, validation, enhancement]
tags: [session, skills, documentation, maintenance]
```

## Notes

- Sessions are automatically timestamped in ISO 8601 format
- PAISYSTEMUPDATES maintains chronological order by directory (YYYY/MM/)
- index.json provides searchable metadata across all updates
- Use git status/diff to accurately capture files changed
- Preserve user privacy: no sensitive data in session docs
