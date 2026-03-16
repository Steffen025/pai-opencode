# AGENTS.md — PAI-OpenCode

> Coding agent constitution for CI/CD compliance and branch protection workflows

## Identity

You are an AI coding assistant working on **PAI-OpenCode** — the community port of Daniel Miessler's PAI Infrastructure for OpenCode.

**Your role:** Implement features, fix bugs, and maintain code quality while strictly adhering to CI/CD and branch protection workflows.

**Tech Stack:** TypeScript, Bun (never npm), Biome (never ESLint/Prettier), GitHub Actions

## OpenCode Bash Tool — CRITICAL Behavior

**OpenCode's Bash tool is STATELESS. Every call spawns a fresh shell process.**

| Behavior | OpenCode | Claude Code |
|----------|---------|------------|
| Working Directory | ❌ Does NOT persist | ✅ Persists |
| Environment Variables | ❌ Does NOT persist | ✅ Persists |
| `cd` commands | ❌ No effect on next call | ✅ Works |

**ALWAYS use `workdir` parameter instead of `cd`:**

```bash
# ❌ WRONG — cd has no effect on next call
Bash({ command: "cd /some/path && ls" })

# ✅ CORRECT — use workdir parameter
Bash({ command: "ls", workdir: "/some/path" })
```

---

## CI/CD & Branch Protection Rules

### Absolute Constraints (NEVER violate)

| Constraint | Rule | Why |
|------------|------|-----|
| **Package Manager** | `bun` only — NEVER `npm install`, `npm ci`, `yarn`, `pnpm` | Per TECHSTACKPREFERENCES.md |
| **Linter/Formatter** | `biome` only — NEVER `eslint`, `prettier` | Per TECHSTACKPREFERENCES.md |
| **Commits to main** | NEVER commit directly to `main` | Branch protection enforced |
| **Force pushes** | NEVER `git push --force` to protected branches | Git history integrity |
| **Secrets** | NEVER hardcode API keys, passwords, tokens | Secret scan will fail |

### Workflow: How to Make Changes

```bash
# 1. Always branch from dev (not main)
git checkout -b feature/short-description origin/dev

# 2. Make your changes
# ... edit files ...

# 3. Verify locally (Bun only!)
bun install      # Never npm install
bunx @biomejs/biome check .  # If biome.json exists
bunx tsc --noEmit              # If tsconfig.json exists

# 4. Commit with conventional format
git commit -m "feat(scope): Description

- Detail 1
- Detail 2

Refs: #issue-number"

# 5. Push to origin
git push origin feature/short-description

# 6. Create PR targeting dev (not main!)
# - CI will run automatically
# - CodeRabbit will review automatically
# - Wait for green checks before requesting merge
```

### Branch Strategy

| Branch | Purpose | Protection | Merge Policy |
|--------|---------|------------|--------------|
| `main` | Production releases | 1 approver required | PR from dev only |
| `dev` | Development/integration | CI must pass | PR from feature branches |
| `feature/*` | New features | No direct push | PR to dev |
| `fix/*` | Bug fixes | No direct push | PR to dev |

### Conventional Commits (Required)

```
feat(skills): Add new Cloudflare skill
fix(tools): Resolve path issue in MigrationValidator
docs(readme): Update installation instructions
refactor(agents): Simplify agent registry logic
test(ci): Add secret scan workflow
ci(workflows): Update upstream sync schedule
```

**Format:** `type(scope): Description`

**Types:** feat, fix, docs, refactor, test, ci, chore, perf

**Scopes:** skills, agents, tools, workflows, docs, tests, core

---

## CodeRabbit Integration

**CodeRabbit reviews every PR automatically.**

### When CodeRabbit Comments:

**[BLOCKING] comments:**
- MUST be resolved before merge
- Reply with fix or justification

**[SUGGESTION] comments:**
- Can be dismissed if you disagree
- But consider them — CodeRabbit catches real issues

### How to Trigger Re-review

```
@coderabbit review
```

Or push new commits — CodeRabbit reviews automatically.

---

## Secret Scanning

**The CI scans for hardcoded secrets. If found, the build fails.**

### Patterns that trigger failure:
- `sk-` followed by 20+ characters (OpenAI keys)
- `api_key` or `api-key` with values
- `client_secret`, `password`, `token` with values

### Safe patterns:
- Environment variables: `process.env.API_KEY`
- Config files with placeholders: `"apiKey": "YOUR_KEY_HERE"`
- Documentation examples marked clearly

**If you need to commit a secret pattern legitimately:**
Add comment: `# pragma: allowlist secret` on that line.

---

## PR Checklist (Complete before requesting review)

- [ ] Branched from `dev`, targeting `dev`
- [ ] Uses `bun` commands only (no npm)
- [ ] Follows conventional commit format
- [ ] No hardcoded secrets
- [ ] CodeRabbit review complete (no blocking issues)
- [ ] CI passes (green checkmark)
- [ ] Documentation updated if needed

---

## File Structure Awareness

### Critical Paths

| Path | Purpose | Modification Rules |
|------|---------|-------------------|
| `.opencode/skills/**` | PAI Skills | Follow SKILL.md format, USE WHEN triggers |
| `.opencode/agents/**` | Agent definitions | Keep frontmatter valid, first-person voice |
| `.opencode/plugins/**` | Lifecycle plugins | No blocking operations in init hooks |
| `Tools/**` | CLI tools | Bun-only, pure execution (no LLM inside) |
| `docs/**` | Documentation | Obsidian format, ASCII + Mermaid diagrams |
| `.github/workflows/**` | CI/CD | NEVER use npm, ALWAYS use bun |

### Never Modify (Unless Explicitly Asked)

- `node_modules/**` — Auto-generated
- `bun.lock` — Auto-generated by bun install
- `.git/**` — Git internals
- `dist/**`, `coverage/**` — Build artifacts

---

## Upstream Sync Awareness

**PAI-OpenCode tracks two upstream repositories:**

1. **danielmiessler/Personal_AI_Infrastructure** — Daily sync at 08:00 UTC
2. **anomalyco/opencode** — Daily sync at 08:30 UTC

If an upstream sync Issue appears:
- Review the changes
- Assess impact on PAI-OpenCode
- Update code if necessary

**Do NOT:**
- Modify upstream sync workflows unless fixing bugs
- Ignore upstream sync issues (they indicate drift)

---

## OpenCode Action Commands

When triggered via `/opencode` or `/oc` in a PR comment:

1. Read the specific request
2. Check out the PR branch (not main/dev)
3. Make requested changes
4. Commit back to the PR branch
5. **NEVER merge — let humans decide**

### Example Commands

```
/opencode Fix the Biome linting errors in this PR
/oc Add error handling to the migration tool
/opencode Review this PR for PAI v3.0 compliance
```

---

## Emergency Protocols

### If CI fails on your PR:

1. Read the CI logs (GitHub Actions tab)
2. Identify failure reason:
   - **Secret scan:** Remove hardcoded secret or add `# pragma: allowlist secret`
   - **Biome check:** Run `bunx @biomejs/biome check --write .` to auto-fix
   - **Typecheck:** Fix TypeScript errors
   - **Missing bun:** Ensure `bun install` not `npm install`
3. Push fixes to the same branch
4. CI re-runs automatically

### If CodeRabbit flags something you disagree with:

1. Reply to the comment explaining your reasoning
2. If it's a [SUGGESTION], you can dismiss after replying
3. If it's [BLOCKING], you MUST address it or escalate to Steffen

### If you accidentally committed to main:

**STOP.** Do not force push. 

1. Notify Steffen immediately
2. Main is protected — the push might have failed anyway
3. If it succeeded, a revert PR will be needed

---

## OpenCode Session API

After context compaction, subagent results are **NOT lost**. They are stored in OpenCode's SQLite database and accessible via custom tools. Use these tools to recover session context after compaction or to resume subagent work.

### Custom Tools

**`session_registry`** — List all subagent sessions spawned in this session.

- **When to use:** After context compaction, or when you need to check what subagents were spawned
- **Returns:** Markdown table with session IDs, agent types, descriptions, and spawn times
- **Example output:**
  ```text
  ## Subagent Registry (2 sessions)

  | # | Agent Type | Session ID | Description | Spawned At |
  |---|-----------|-----------|-------------|------------|
  | 1 | Engineer | ses_abc123 | Refactor auth middleware | 2026-03-10T10:30:00Z |
  | 2 | Research | ses_def456 | Investigate OpenCode API | 2026-03-10T10:35:00Z |
  ```

**`session_results`** — Get registry metadata for a specific subagent session.

- **When to use:** When you need details about a specific subagent's work
- **Args:** `{ session_id: string }`
- **Returns:** Agent type, full description, model tier, status, and resume instructions
- **Note:** The full conversation history is in OpenCode's database. Use Task tool with `session_id` to retrieve it.

### Post-Compaction Recovery Pattern

When the Algorithm says "subagent results are lost after compaction":

1. **Call `session_registry`** to see what subagents exist
   ```json
   session_registry: {}
   ```

2. **Call `session_results`** for any sessions you need context on
   ```json
   session_results: { "session_id": "ses_abc123" }
   ```

3. **Resume the session** using Task tool if you need full conversation:
   ```javascript
   Task({ session_id: "ses_abc123", prompt: "Continue where you left off and summarize what you did" })
   ```

### Key Facts

- Subagent data survives compaction — it's stored in OpenCode's SQLite with indexed `parent_id`
- The registry file lives in `.opencode/MEMORY/STATE/subagent-registry-{parentSessionId}.json`
- Registry is human-readable JSON for debugging
- Session data persists across restarts, not just compaction

---

## Code Navigation (LSP Integration)

OpenCode has 35+ Language Server Protocol (LSP) servers built-in. When enabled, they provide **type-aware code navigation** that goes beyond simple text matching.

### Available LSP Tools

| Tool | What It Does | When to Use |
|------|-------------|-------------|
| `goToDefinition` | Jump to symbol definition (type-aware, follows imports) | Find where a function/type is defined |
| `findReferences` | All usages of a function (semantic, not text-match) | Understand impact before refactoring |
| `hover` | Show type info and docs for a symbol | Quickly inspect unfamiliar APIs |
| `callHierarchy` | Incoming/outgoing call chains | Trace execution paths |

### LSP vs. Grep — When to Use Which

| Use Case | LSP | Grep |
|----------|-----|------|
| Find all callers of `myFunction()` | ✅ `findReferences` — semantic, exact | ⚠️ Misses renamed imports, aliases |
| Jump to type definition across files | ✅ `goToDefinition` — follows imports | ❌ Can't follow re-exports |
| Check TypeScript type of a variable | ✅ `hover` — live type info | ❌ Not possible |
| Find all files containing "TODO" | ❌ LSP can't do text search | ✅ Grep is correct tool |
| Find all uses of a string literal | ❌ LSP is symbol-only | ✅ Grep is correct tool |
| Quick pattern match in one file | ❌ Overhead not worth it | ✅ Grep is faster |

**Rule of thumb:** Use LSP for **symbols** (functions, types, variables). Use Grep for **text** (strings, comments, patterns).

### Activation

LSP tools are **experimental** and must be explicitly enabled:

```bash
# Enable LSP tools for the current session
export OPENCODE_EXPERIMENTAL_LSP_TOOL=true
opencode
```

Or add to your shell profile for permanent activation:

```bash
echo 'export OPENCODE_EXPERIMENTAL_LSP_TOOL=true' >> ~/.zshrc
```

> [!NOTE]
> LSP tools are only available when `OPENCODE_EXPERIMENTAL_LSP_TOOL=true` is set. Without this flag, the tools are not registered and will not appear in the tool list.

---

## Safe Experiments (Session Fork)

> [!NOTE]
> Plan Mode is **not available** in OpenCode. Session Fork is the native equivalent — a checkpoint system for safe experimentation.

OpenCode's Session Fork creates an **exact copy** of the current session up to a specific message. The original session is untouched. If the experiment fails, discard the fork and return to the original.

### When to Fork

| Situation | Action |
|-----------|--------|
| About to do a risky refactoring | Fork first, then refactor in the fork |
| Exploring multiple solution approaches | Fork once per approach, compare results |
| About to run destructive operations (delete, overwrite) | Fork → verify in fork → apply to original |
| Algorithm needs to "try something" without commitment | Fork, try, decide |
| Pre-BUILD checkpoint in the PAI Algorithm | Fork at end of PLAN phase |

### API Reference

```http
POST /session/{sessionID}/fork
Content-Type: application/json

{
  "messageID": "msg_..."
}
```

**Response:** A new session ID pointing to an exact copy of the session at the specified message.

**How to get the current messageID:** Available via the OpenCode Session API (same endpoint used by `session_registry`).

### Fork Workflow

```text
PLAN phase complete → identify last messageID
                    → POST /session/{id}/fork
                    → get forked_session_id
                    → work in forked session (BUILD / EXECUTE)
                    → if success: apply changes to original
                    → if failure: discard fork, original is safe
```

### Key Properties

- **Atomic:** Fork creates a complete snapshot — no partial state
- **Non-destructive:** Original session is never modified by fork operations
- **Persistent:** Forked sessions survive restarts (stored in OpenCode SQLite)
- **Discardable:** Failed experiments leave no traces in the original session

---

## Quick Reference

### Commands

```bash
# Install dependencies (BUN ONLY!)
bun install

# Run Biome check
bunx @biomejs/biome check .

# Auto-fix Biome issues
bunx @biomejs/biome check --write .

# TypeScript check
bunx tsc --noEmit

# Run tests
bun test
```

### Git Workflow

```bash
# Start feature
git checkout -b feature/description origin/dev

# Work...

# Commit
git commit -m "feat(scope): Description"

# Push
git push origin feature/description

# Create PR via GitHub UI (target: dev)
```

### Links

- **CI Status:** https://github.com/Steffen025/pai-opencode/actions
- **CodeRabbit:** https://app.coderabbit.ai
- **Setup Guide:** docs/CI-CD-SETUP.md

---

**Remember:** Professionalism = following the workflow, not hacking around it. When in doubt, ask in the PR comments.
