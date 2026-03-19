---
name: CodeReview
description: AI-powered code review via roborev. USE WHEN review code, check code quality, roborev, audit changes, review before commit, review before PR, code quality check, lint review, architecture review.
triggers:
  - review code
  - check code quality
  - roborev
  - audit changes
  - review before commit
  - review before PR
  - code quality check
  - lint review
  - architecture review
  - code review
  - review my changes
  - what's wrong with this code
---

# CodeReview Skill

Use this skill to run AI-powered code review via **roborev** — a local, MIT-licensed review
tool with explicit OpenCode support.

---

## USE WHEN

- Completing a BUILD phase and want to catch issues before committing
- Running VERIFY phase and need reproducible quality evidence
- Reviewing a PR diff before merging
- Auditing plugin handler code for pattern violations (no `console.log`, handler structure)
- You want AI-powered architectural review of your changes
- Trigger phrases: "review code", "check my changes", "roborev", "code quality check"

---

## MANDATORY

1. **roborev must be installed** — `brew install roborev-dev/tap/roborev`
2. **One-time init** — `roborev init` (installs post-commit git hook)
3. **`.roborev.toml` must exist** at repo root with `agent = "opencode"` and `review_guidelines`
4. **Invoke** via `code_review` tool (preferred) or `roborev review --dirty` in EXECUTE phase
5. **Cite exit code 0** as VERIFY evidence: `code_review tool returned exit 0 — no findings`

---

## OPTIONAL

- `roborev skills install` — installs the roborev OpenCode skill (adds roborev commands to agent)
- `mode: "last-commit"` — review the last git commit instead of dirty working tree
- `mode: "fix"` — feed findings to the agent for automatic fixes
- `mode: "refine"` — run auto-fix loop until review passes
- `path` argument — focus review on a specific file or glob

---

## What roborev Does

roborev analyzes your staged/uncommitted changes (or last commit) using an LLM and surfaces:
- Code quality issues
- Security concerns
- Architectural violations
- Style inconsistencies
- Bugs and edge cases

All review runs locally. No account or cloud service required.

---

## Quick Reference

```bash
# Review uncommitted changes (most common)
roborev review --dirty

# Review last commit
roborev review

# Feed findings to agent for fixes
roborev fix

# Auto-fix loop until review passes
roborev refine

# Install git post-commit hook (one-time)
roborev init

# Install OpenCode skill for roborev
roborev skills install
```

---

## Algorithm Integration

### When to invoke

The Algorithm invokes code review in two ways:

**1. Via `code_review` tool (plugin-provided)**

Call the `code_review` tool directly from any Algorithm phase:
```text
Use code_review tool with mode="dirty" to review uncommitted changes before commit.
```

**2. Via `roborev` CLI in EXECUTE/VERIFY phase**

```bash
# In EXECUTE: review before committing
roborev review --dirty

# In VERIFY: evidence that review passed
roborev review --dirty && echo "PASS" || echo "FINDINGS"
```

### Recommended Algorithm workflow

```text
BUILD → commit changes
EXECUTE: roborev review --dirty
  → If PASS: continue to VERIFY
  → If FINDINGS: address in next BUILD iteration
VERIFY: cite roborev exit code 0 as evidence
```

---

## Installation

### macOS / Linux (Homebrew)
```bash
brew install roborev-dev/tap/roborev
```

### Go
```bash
go install github.com/roborev-dev/roborev@latest
```

### Verify
```bash
roborev --version
```

---

## One-Time Setup

```bash
# 1. Install git post-commit hook (auto-reviews on every commit)
roborev init

# 2. Install OpenCode skill (adds roborev commands to agent)
roborev skills install

# 3. Verify config exists at repo root
cat .roborev.toml
```

---

## Configuration (`.roborev.toml`)

This repo's config is at `.roborev.toml` in the root. Key settings:

```toml
agent = "opencode"

review_guidelines = """
# PAI-OpenCode Review Guidelines
...
"""
```

The `review_guidelines` field gives roborev domain-specific rules for this project —
including the no-console.log constraint, file-logger pattern, and model routing rules.

---

## Troubleshooting

### roborev not found
```bash
# Install via Homebrew
brew install roborev-dev/tap/roborev

# Or check if it's in PATH
which roborev
echo $PATH
```

### Review times out
Default timeout is 2 minutes. For large changesets, focus the review:
```bash
roborev review --dirty -- src/specific/file.ts
```

### No changes found
Make sure you have uncommitted changes:
```bash
git diff
git diff --cached  # staged changes
```

### Post-commit hook not running
Re-run `roborev init` to reinstall the hook:
```bash
cat .git/hooks/post-commit  # verify hook exists
roborev init                # reinstall if missing
```

---

## PAI-OpenCode Specific Guidelines

When running code review on this project, roborev checks for:

1. **No console.log** — all plugin logging via `fileLog()` / `fileLogError()`
2. **Handler pattern** — new capabilities = new handler file + import + registration
3. **No hardcoded models** — model routing via `opencode.json` only
4. **TypeScript strict** — no implicit any, explicit return types on exports
5. **Biome formatting** — tabs, 100 char line width, double quotes

---

## Related

- `.roborev.toml` — project review configuration
- `ADR-018` — architectural decision for roborev integration
- `.opencode/plugins/handlers/roborev-trigger.ts` — plugin handler providing `code_review` tool
- `.github/workflows/code-quality.yml` — CI pipeline (Biome check on PRs)
