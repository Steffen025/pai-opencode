# GitPush Workflow

## Purpose

Safe git commit and push workflow with mandatory repository selection, security scanning, and clean commit message generation.

## Critical Requirements

1. **ALWAYS ask user which repository** before any git operations
2. **NEVER push to public repo** without security check
3. **ALWAYS verify git remote** before pushing
4. **WARN if pushing to main/master** branch

## Workflow Steps

### 1. Repository Selection

Use AskUserQuestion tool to ask:

```
Which repository do you want to push to?

1. Your private PAI infrastructure repository
2. pai-opencode (public fork - security scan required)

Please enter 1 or 2:
```

Store the user's choice and validate it's either 1 or 2.

### 2. Verify Git Repository

Run in parallel:
- `git status` - See current state
- `git remote -v` - Verify remote URLs
- `git branch --show-current` - Get current branch

Validate the remote matches the selected repository:
- Option 1: Should contain `Steffen025/jeremy-2.0-claudecode`
- Option 2: Should contain `Steffen025/pai-opencode`

If mismatch detected, STOP and warn user.

### 3. Branch Safety Check

If current branch is `main` or `master`:
- Display warning: "⚠️ You are about to push to the main/master branch"
- Ask for confirmation before proceeding

### 4. Security Scanning (Public Repo Only)

If repository selection was Option 2 (pai-opencode):
1. Run SecretScanning workflow before any commit
2. If secrets detected, STOP and require user to fix
3. Only proceed if scan passes clean

For Option 1 (jeremy-2.0-claudecode):
- Skip security scan (private repo)
- Still check for common patterns (.env, credentials.json) and warn

### 5. Review Changes

Display:
- Files to be committed (from git status)
- Diff summary (from git diff --stat)
- Recent commit messages (git log -3 --oneline) for style reference

### 6. Generate Commit Message

Analyze all changes and create a commit message following this format:

```
<type>(<scope>): <subject>

<body>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

Guidelines:
- Subject: Imperative mood, no period, max 50 chars
- Body: Explain WHY, not WHAT (optional, 1-2 sentences)
- Focus on user-facing impact

### 7. Execute Git Operations

Run sequentially:

```bash
git add . && \
git commit -m "$(cat <<'EOF'
<generated commit message>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)" && \
git push
```

If any command fails:
- Display the error
- STOP the workflow
- Ask user how to proceed

### 8. Verify Success

After successful push:
- Run `git status` to confirm clean state
- Display success message with commit hash

## Output Format

```
## GitPush Workflow Results

Repository: jeremy-2.0-claudecode
Remote: git@github.com:Steffen025/jeremy-2.0-claudecode.git
Branch: main

Files Changed: 5
- M .opencode/plugins/handlers/context-loader.ts
- M .opencode/MEMORY/State/algorithm-state.json
- A .opencode/skills/System/Workflows/GitPush.md
+ 2 more...

Security Scan: ✅ Passed (private repo - skipped)

Commit Message:
feat(workflows): Add GitPush workflow with repository selection

Adds safe git push workflow requiring user to select target repository
before any operations. Includes security scanning for public repos.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>

Commit: abc1234
Push: ✅ Success to main

Status: Clean working directory
```

## Error Handling

### Repository Mismatch
```
❌ ERROR: Repository Mismatch

Selected: pai-opencode (public)
Current Remote: git@github.com:Steffen025/jeremy-2.0-claudecode.git

Action Required:
- Change to correct directory, OR
- Select correct repository option

Workflow STOPPED.
```

### Security Scan Failed
```
❌ ERROR: Security Scan Failed

Detected secrets in:
- .env (API keys)
- config/credentials.json (tokens)

Action Required:
1. Remove secrets from files
2. Add files to .gitignore
3. Re-run GitPush workflow

Workflow STOPPED. NO COMMITS MADE.
```

### Push Failed
```
❌ ERROR: Push Failed

Error: ! [rejected] main -> main (fetch first)

This usually means the remote has changes you don't have locally.

Suggested Actions:
1. git pull --rebase
2. Resolve any conflicts
3. Re-run GitPush workflow

Workflow STOPPED. Commit made locally but NOT pushed.
```

## Integration with Other Workflows

- **SecretScanning**: Called automatically for public repos
- **SpecFirst Phase 7 (RELEASE)**: GitPush can be invoked as final step
- **Algorithm**: Can use GitPush for committing work artifacts

## Notes

- This workflow NEVER uses `--force` or `--no-verify` flags
- This workflow NEVER amends commits unless explicitly requested
- This workflow ALWAYS creates new commits
- Repository selection is MANDATORY - no defaults or assumptions
- Security is priority one for public repository pushes
