# KanbanRunner

Executes validated GitHub Project items and posts activity reports in issue tickets.

## Purpose

- Watch a Project v2 workflow field (default: `Workflow State`)
- Pick items in `Todo`
- Execute runbook commands from issue body
- Comment execution report in the issue
- Move item to `Done` or `Blocked`

## Requirements

- `gh` authenticated with scopes: `repo`, `project`, `read:project`
- Project uses single-select field `Workflow State`
- Ticket must be an **Issue** (not a DraftIssue) to support comments

## Runbook Format in Issue

Use this in the issue body:

```md
## Runbook
```bash
# command to execute
```
```

If missing, runner marks item `Blocked` and comments guidance.

## Usage

```bash
bun ~/.opencode/skills/System/Tools/KanbanRunner.ts \
  --owner BunniChrist \
  --project 1 \
  --once
```

## Key Options

- `--workflow-field "Workflow State"`
- `--todo "Todo"`
- `--in-progress "In Progress"`
- `--done "Done"`
- `--blocked "Blocked"`
- `--timeout 1800`
- `--dry-run`
- `--once`
- `--interval 120`

## Draft Migration (Optional)

To convert DraftIssue cards into real issues before processing:

```bash
bun ~/.opencode/skills/System/Tools/KanbanRunner.ts \
  --owner BunniChrist \
  --project 1 \
  --migrate-drafts \
  --repo BunniChrist/<repo> \
  --once
```

This creates issues, adds them to the project, carries workflow state, and removes old drafts.
