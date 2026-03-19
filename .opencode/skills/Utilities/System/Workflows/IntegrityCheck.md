# IntegrityCheck Workflow

**Purpose:** Find and fix broken references across the PAI system. Launches 12 parallel agents to audit all components for broken file references, outdated patterns, and configuration issues.

**Triggers:** "integrity check", "audit system", "check references", "system health"

---

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running integrity check with 12 parallel agents"}' \
  > /dev/null 2>&1 &
```

Running the **IntegrityCheck** workflow from the **System** skill...

---

## When to Use

- After major refactoring
- Periodic system health checks
- Before releasing PAI updates
- When something "feels broken"
- At end of significant work sessions (before DocumentSession)

---

## Execution

### Step 1: Launch 12 Parallel Audit Agents

**CRITICAL: Use `subagent_type: "Intern"` for all agents.** OpenCode does not have native "Explore" or "Plan" agents like Claude Code.

Use the Task tool to launch agents in a SINGLE message (parallel execution). Each agent audits their assigned component.

**Agent Assignments:**

| # | Focus Area | Scope | Check For |
|---|------------|-------|-----------|
| 1 | PAI SKILL.md | `skills/PAI/SKILL.md` | Broken file references, outdated paths |
| 2 | Identity System | `plugins/lib/identity.ts`, `settings.json` | Config consistency |
| 3 | Plugin Scripts | `plugins/*.ts` | Imports, identity usage, TypeScript validity |
| 4 | System Docs | `skills/PAI/SYSTEM/*.md` | Cross-references, broken links |
| 5 | User Docs | `skills/PAI/USER/*.md` | Personal config references |
| 6 | Workflows | `skills/*/Workflows/*.md` | File paths, tool references |
| 7 | Tools | `skills/*/Tools/*.ts` | Imports, hardcoded paths |
| 8 | Settings | `settings.json` | Schema validity, env vars |
| 9 | Notifications | Voice/notification-related files | Config consistency |
| 10 | Memory System | `MEMORY/` structure | Path references, directory structure |
| 11 | Security | Security-related hooks and configs | Policy consistency |
| 12 | Cross-References | All `*.md` files | Non-existent file refs |

### Step 2: Agent Prompt Template

```
You are auditing the PAI system for integrity issues.

**Your Focus Area:** [FOCUS_AREA]
**Files to Check:** [SEARCH_SCOPE]

## Instructions

1. Search the specified files for issues
2. Look for:
   - References to files/paths that don't exist
   - Outdated patterns (e.g., old directory names)
   - Inconsistencies between docs and code
   - Broken cross-references
   - Missing required files

3. Return a structured report:

## Findings

### Critical Issues
- [Breaks functionality - file not found, path wrong]

### Warnings
- [Outdated but functional - naming inconsistency, deprecated pattern]

### Files Checked
- [List files examined]

Be thorough but concise. Focus on actionable issues.
```

### Step 3: Synthesize Results

After agents complete:
1. Collect all findings
2. Deduplicate issues found by multiple agents
3. Prioritize by severity (Critical > Warning > Info)
4. Optionally fix critical issues

### Step 4: Report Format

```markdown
# PAI Integrity Check Report

**Date:** [DATE]
**Audit Type:** Full System Integrity Check
**Scope:** ~/.opencode/ (PAI System)
**Method:** 12 Parallel Agent Audits
**Status:** [HEALTHY|WARNINGS|CRITICAL]

---

## Executive Summary

- Parallel Agents Deployed: 12
- Critical Issues Found: X
- Warnings Identified: Y
- Clean Components: Z

---

## Critical Issues (Must Fix)

### 1. [Issue Title]
**Component:** [file/path]
**Issue:** [description]
**Impact:** [what breaks]
**Fix Priority:** P0

---

## Warnings (Needs Attention)

### 1. [Warning Title]
**Component:** [file/path]
**Issue:** [description]
**Severity:** MEDIUM

---

## Clean Components

- Component A
- Component B
- ...

---

## Detailed Component Reports

### Agent 1: PAI SKILL.md Audit
- Files Checked: X
- Critical Issues: Y
- Warnings: Z
- Severity: [HIGH|MEDIUM|LOW]

[Repeat for all 12 agents]

---

## Recommendations

### P0 - Immediate
1. [action]

### P1 - Important
1. [action]

### P2 - Nice-to-Have
1. [action]

---

## Next Steps

IntegrityCheck (Complete)
  -> Fix Critical Issues (Pending)
  -> DocumentSession (Pending)
  -> GitPush (Pending)
```

### Step 5: Save Report

Save full report to user's home directory for easy access:
```
~/YYYY-MM-DD_PAI-System-Integrity-Audit.md
```

Also optionally save to MEMORY:
```
~/.opencode/MEMORY/State/integrity/YYYY-MM-DD.md
```

### Step 6: Completion

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Integrity check complete. [X] critical issues, [Y] warnings found."}' \
  > /dev/null 2>&1 &
```

---

## Agent Spawn Pattern

Launch ALL 12 agents in a SINGLE Task tool call block for true parallel execution:

```typescript
// In a single message, call Task 12 times:
// NOTE: OpenCode uses "Intern" instead of Claude Code's native "Explore"
// NOTE: Model names must include provider prefix for OpenCode
Task({ subagent_type: "Intern", prompt: "Agent 1: PAI SKILL.md..." })
Task({ subagent_type: "Intern", prompt: "Agent 2: Identity System..." })
Task({ subagent_type: "Intern", prompt: "Agent 3: Plugin Scripts..." })
// ... all 12 agents
```

**Model Selection:**
- Intern agents automatically use the cheapest available model (haiku for Anthropic, gpt-4o-mini for OpenAI)
- Model resolution is handled by `model-config.ts` based on the provider configured in `opencode.json`
- Total cost ~12x cheap model = still cheaper than 1x expensive model doing sequential work

---

## Next Steps After Integrity Check

If changes were made during the check:
```
IntegrityCheck (this) -> DocumentSession -> GitPush
```

---

## Related Workflows

- `DocumentSession.md` - Document what was done
- `SecretScanning.md` - Scan for credentials
- `CrossRepoValidation.md` - Check private/public separation
