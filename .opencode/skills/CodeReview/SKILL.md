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
```
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

```
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
