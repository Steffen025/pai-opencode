# CrossRepoValidation Workflow

## Trigger
"cross-repo check", "validate repos", "check public repo", "repo separation", "validate isolation"

## Purpose
Ensure private PAI content stays separate from public repos by comparing jeremy-2.0-claudecode (private) with pai-opencode (public fork) to detect any sensitive data leakage.

## What It Does

Validates isolation between repositories:

1. **Sensitive File Detection** - Checks if private files leaked to public repo
2. **USER Directory Check** - Ensures no personal data in public repo
3. **Secret Scanning** - Validates no API keys, tokens, or credentials in public
4. **Personal Data Validation** - Checks for names, emails, personal info
5. **Configuration Drift** - Identifies intentional vs accidental differences

## Critical Security Rules

**NEVER in Public Repo:**
- USER/ directory or its contents
- API keys, tokens, credentials
- Personal emails, names, addresses
- Private project data
- Session transcripts with personal context
- Learning documents referencing private work
- Git commit history revealing private info

**ALLOWED in Public Repo:**
- SYSTEM/ architecture documentation (generic)
- Skills (if generalized, no personal references)
- Hooks (if no secrets embedded)
- Tools and utilities (generic implementations)
- Public-safe configuration templates
- Generic workflow documentation

## Execution Pattern

```typescript
// 1. Locate both repositories
const privateRepo = "/path/to/your/private-pai-repo"
const publicRepo = "/path/to/your/public-pai-repo"

// 2. Compare directory structures
// 3. Scan for sensitive patterns
// 4. Validate USER/ isolation
// 5. Check configuration files
// 6. Generate compliance report
```

## Implementation Steps

### 1. Repository Discovery

Verify both repositories exist and are accessible:

```bash
# Check private repo
test -d "$PRIVATE_REPO" && git -C "$PRIVATE_REPO" remote -v

# Check public repo
test -d "$PUBLIC_REPO" && git -C "$PUBLIC_REPO" remote -v

# Verify remotes point to correct locations
# Private: Steffen025/jeremy-2.0-claudecode
# Public: Steffen025/pai-opencode
```

If either repo not found, report error and STOP.

### 2. Directory Structure Comparison

```bash
# Generate tree structure for both repos (exclude .git)
cd "$PRIVATE_REPO" && find . -type d -not -path "./.git/*" | sort > /tmp/private-dirs.txt
cd "$PUBLIC_REPO" && find . -type d -not -path "./.git/*" | sort > /tmp/public-dirs.txt

# Compare structures
diff /tmp/private-dirs.txt /tmp/public-dirs.txt
```

**Validate:**
- `./USER/` directory does NOT exist in public repo
- `./.opencode/MEMORY/` should be different (public has minimal/no sessions)
- Private-specific directories are not in public

### 3. Sensitive File Pattern Detection

Scan public repo for files that should NEVER be public:

```typescript
const sensitivePatterns = [
  // USER directory
  "**/USER/**",

  // Credentials and secrets
  "**/*.env",
  "**/*.env.*",
  "**/credentials.json",
  "**/secrets.json",
  "**/.env.local",
  "**/config/api-keys.*",

  // Session data
  "**/MEMORY/sessions/**/*SESSION*.md",
  "**/MEMORY/Work/**",

  // Personal data
  "**/*steffen*",
  "**/*personal*",
  "**/*private*",

  // Git history markers
  "**/.git/config",

  // Backup files
  "**/*.backup",
  "**/*~",
  "**/*.swp"
];

// Search public repo for each pattern
for (const pattern of sensitivePatterns) {
  const found = glob(pattern, { cwd: publicRepo });
  if (found.length > 0) {
    violations.push({ pattern, files: found });
  }
}
```

### 4. Content Pattern Scanning

Scan file contents in public repo for sensitive patterns:

```typescript
const contentPatterns = [
  // API Keys (common formats)
  /sk-[a-zA-Z0-9]{32,}/g,              // OpenAI-style keys
  /ghp_[a-zA-Z0-9]{36,}/g,              // GitHub tokens
  /AIza[a-zA-Z0-9_-]{35}/g,             // Google API keys

  // Personal identifiers
  /steffen@(?!example\.com)/gi,         // Real email
  /Steffen(?!ENGINEER_NAME)/g,          // Personal name (not var)

  // Private URLs
  /jeremy-2\.0-claudecode/g,            // Private repo refs

  // Local paths
  /\/Users\/steffen/g,                   // Hardcoded paths

  // Sensitive terms
  /CONFIDENTIAL/gi,
  /PRIVATE/gi,
  /DO NOT SHARE/gi
];

// Scan all text files in public repo
const textFiles = glob("**/*.{md,ts,js,json,yaml,yml,txt}", { cwd: publicRepo });

for (const file of textFiles) {
  const content = readFile(file);

  for (const pattern of contentPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      violations.push({
        file,
        pattern: pattern.source,
        matches,
        severity: determineSeverity(pattern)
      });
    }
  }
}
```

### 5. USER Directory Isolation Check

**Critical Check:** Ensure USER/ content is NEVER in public repo

```bash
# Check if USER directory exists in public repo
if [ -d "$PUBLIC_REPO/USER" ]; then
  echo "CRITICAL VIOLATION: USER directory found in public repo!"
  exit 1
fi

# Check for any references to USER/ in public repo files
cd "$PUBLIC_REPO"
grep -r "USER/" --include="*.md" --include="*.ts" --include="*.js" .

# If matches found, validate they are:
# 1. Documentation examples (generic)
# 2. Template references (not actual paths)
# 3. Code comments (not hardcoded)
```

### 6. MEMORY Structure Validation

Compare MEMORY directories between repos:

```bash
# Private repo MEMORY should have:
# - Learning/
# - Work/
# - sessions/
# - projects/ (with private project data)
# - research/ (with personal research)
# - State/ (with actual state)

# Public repo MEMORY should have:
# - Learning/ (generic only, no personal references)
# - MINIMAL sessions (example only)
# - NO Work/
# - projects/ (only public examples)
# - State/ (template only)

# Validate public MEMORY doesn't contain session transcripts
find "$PUBLIC_REPO/.opencode/MEMORY/sessions" -type f | wc -l
# Should be 0 or very small (examples only)
```

### 7. Git History Validation

Check if git history in public repo contains private commits:

```bash
# Get commit subjects from both repos
git -C "$PRIVATE_REPO" log --pretty=format:"%s" --all > /tmp/private-commits.txt
git -C "$PUBLIC_REPO" log --pretty=format:"%s" --all > /tmp/public-commits.txt

# Check for commits mentioning private work
grep -i "private\|personal\|steffen\|jeremy" /tmp/public-commits.txt

# Validate public commits are generic
# Should contain: "feat:", "fix:", "docs:", "chore:" with generic descriptions
# Should NOT contain: personal names, private projects, sensitive context
```

### 8. Configuration File Comparison

Compare configuration files to ensure secrets not leaked:

```typescript
const configFiles = [
  ".opencode/config/settings.json",
  ".opencode/config/mcp.json",
  ".opencode/plugins/lib/config.ts",
  "package.json"
];

for (const configFile of configFiles) {
  const privateConfig = readJSON(`${privateRepo}/${configFile}`);
  const publicConfig = readJSON(`${publicRepo}/${configFile}`);

  // Check for differences that might indicate secrets
  const diff = compareObjects(privateConfig, publicConfig);

  // Validate public version has placeholders, not real values
  validatePlaceholders(publicConfig);
}
```

## Validation Rules

### Severity Levels

**CRITICAL (Must Fix Immediately):**
- USER/ directory in public repo
- API keys or tokens in code
- Personal email addresses (not examples)
- Private repo URLs
- Session transcripts with personal data
- Hardcoded local paths with username

**HIGH (Fix Before Next Push):**
- Personal names in comments (not variables)
- Private project references
- Non-generic learning documents
- Actual configuration values (not templates)

**MEDIUM (Review and Fix):**
- Generic references that could be more abstracted
- Example data that looks too specific
- Comments referencing private workflows

**LOW (Optional Cleanup):**
- Typos or formatting inconsistencies
- Overly specific examples (but not sensitive)
- Documentation that could be more generic

### Allowlist Patterns

Some patterns are OK if used correctly:

```typescript
const allowedPatterns = {
  // Environment variable references (not values)
  "$PAI_DIR",
  "${ENGINEER_NAME}",

  // Documentation placeholders
  "example.com",
  "user@example.com",
  "your-name-here",

  // Generic references
  "the engineer",
  "the assistant",
  "your PAI",

  // Code variables
  "ENGINEER_NAME", // as a variable name
  "USER_DIR",      // as a variable name
};
```

## Output Format

### Validation Report

```markdown
# Cross-Repository Validation Report
Generated: {timestamp}

## Repository Status

**Private Repository**
- Path: /path/to/your/private-pai-repo
- Remote: git@github.com:your-username/your-private-repo.git
- Branch: main
- Last Commit: {hash} - {subject}

**Public Repository**
- Path: /path/to/your/public-pai-repo
- Remote: git@github.com:your-username/your-public-repo.git
- Branch: main
- Last Commit: {hash} - {subject}

## Validation Results

### ✅ USER Directory Isolation
- USER/ not found in public repo
- No references to USER/ content in public files
- Status: PASS

### ✅ Secret Scanning
- Files scanned: 247
- API key patterns: 0 matches
- Token patterns: 0 matches
- Status: PASS

### ⚠️ Personal Data Check
- Files scanned: 247
- Potential issues: 2
  - .opencode/skills/PAI/SKILL.md:15 - Contains "Steffen" (approved - variable def)
  - docs/README.md:42 - Contains example with specific name (review)
- Status: WARNING

### ✅ MEMORY Structure
- Private MEMORY files: 1,247
- Public MEMORY files: 12 (templates only)
- Session transcripts in public: 0
- Status: PASS

### ✅ Configuration Files
- settings.json: Properly templated
- mcp.json: No secrets detected
- Hardcoded paths: 0
- Status: PASS

### ✅ Git History
- Public commits scanned: 127
- Private references: 0
- Sensitive commit messages: 0
- Status: PASS

## Summary

- **Overall Status**: ⚠️ PASS WITH WARNINGS
- **Critical Issues**: 0
- **High Priority**: 0
- **Medium Priority**: 2
- **Low Priority**: 0

## Issues Found

### Medium Priority

1. **File**: docs/README.md:42
   **Issue**: Example contains specific name instead of placeholder
   **Pattern**: "Steffen's AI assistant"
   **Recommendation**: Change to "The engineer's AI assistant"
   **Auto-fix**: Available

2. **File**: .opencode/plugins/handlers/example.ts:8
   **Issue**: Comment references private workflow
   **Pattern**: "Based on jeremy-2.0 implementation"
   **Recommendation**: Remove or genericize comment
   **Auto-fix**: Not available (manual review needed)

## Recommendations

1. ✅ Continue current separation practices
2. ⚠️ Review and update 2 files flagged above
3. ✅ MEMORY isolation is excellent
4. ✅ No secrets detected - good job!
5. 💡 Consider adding pre-push hook to public repo for automatic validation

## Differences (Intentional)

The following differences are expected and correct:

- Private has 1,247 MEMORY files; public has 12 (templates)
- Private has USER/ directory; public does not
- Private has personal projects; public has generic examples
- Private has Steffen-specific config; public has templates

## Next Steps

1. Run auto-fix for medium priority issues: `jeremy fix-repo-issues`
2. Manually review .opencode/plugins/handlers/example.ts:8
3. Re-run validation: `jeremy cross-repo-check`

---
Duration: 3.2s
Status: PASS WITH WARNINGS
```

### Console Output

```
## CrossRepoValidation

Locating repositories...
✅ Private: jeremy-2.0-claudecode
✅ Public: pai-opencode

Running validation checks...

✅ USER Directory Isolation (0.2s)
✅ Secret Scanning (1.1s)
⚠️ Personal Data Check - 2 warnings (0.8s)
✅ MEMORY Structure (0.4s)
✅ Configuration Files (0.3s)
✅ Git History (0.4s)

Overall Status: ⚠️ PASS WITH WARNINGS

Critical Issues: 0
Issues to Fix: 2 (medium priority)

Full report:
$PAI_DIR/MEMORY/sessions/{date}/cross-repo-validation-report.md

Fix issues automatically? [y/N]:
```

## Auto-Fix Capability

For certain violations, offer automatic fixes:

```typescript
const autoFixPatterns = [
  {
    pattern: /Steffen(?!'s PAI)/g,
    replacement: "${ENGINEER_NAME}",
    description: "Replace hardcoded name with variable"
  },
  {
    pattern: /\/Users\/steffen/g,
    replacement: "${HOME}",
    description: "Replace hardcoded path with variable"
  },
  {
    pattern: /steffen@(?!example\.com)/gi,
    replacement: "user@example.com",
    description: "Replace real email with placeholder"
  }
];

async function applyAutoFixes(violations) {
  for (const violation of violations.filter(v => v.autoFixable)) {
    const file = readFile(violation.file);
    const fixed = applyFix(file, violation.fix);

    // Show diff
    showDiff(file, fixed);

    // Ask for confirmation
    if (await confirm("Apply this fix?")) {
      writeFile(violation.file, fixed);
    }
  }
}
```

## Integration Points

- **GitPush Workflow**: Automatically run before pushing to public repo
- **SecretScanning**: Uses similar patterns, can share logic
- **IntegrityCheck**: Can include cross-repo validation as one check
- **CI/CD**: Can be run as pre-push git hook for public repo

## Error Handling

- **Repository not found**: Report missing repo, provide setup instructions
- **Git errors**: Fall back to file system comparison
- **Permission errors**: Report specific access issues
- **Network issues**: Skip remote validation, focus on local checks

## Advanced Features

### Differential Sync Detection

Identify which files SHOULD be synced between repos:

```typescript
// Files that should be identical (generic infrastructure)
const shouldMatch = [
  ".opencode/tools/SkillSearch.ts",
  ".opencode/skills/Media/Art/SKILL.md",
  // ... other generic files
];

// Verify they match, report if diverged
```

### Privacy Score

Generate privacy score for public repo:

```typescript
const score = {
  userIsolation: 100,      // USER/ completely isolated
  secretSafety: 100,       // No secrets detected
  personalDataSafety: 95,  // 2 minor issues
  configSafety: 100,       // All configs templated
  historySafety: 100,      // No private commits

  overall: 99              // Weighted average
};
```

## Example Usage

```
User: "cross-repo check"

Jeremy: I'll validate isolation between your private and public repositories.

Locating repos...
✅ Found jeremy-2.0-claudecode (private)
✅ Found pai-opencode (public)

Running comprehensive validation...

[Progress indicators for each check]

Validation complete!

✅ USER Directory: Fully isolated
✅ Secrets: None detected
⚠️ Personal Data: 2 minor issues found
✅ MEMORY: Properly separated
✅ Configuration: All safe
✅ Git History: Clean

Overall: PASS WITH WARNINGS (99/100 privacy score)

2 issues need attention:
1. docs/README.md - contains specific name instead of placeholder
2. .opencode/plugins/handlers/example.ts - references private workflow

I can auto-fix issue #1. Would you like me to apply fixes?
```

---

**Workflow Type**: Security Validation
**Execution Time**: ~3-5 seconds
**Destructive**: No (read-only by default, auto-fix requires confirmation)
**Requires User Input**: Only for auto-fix confirmation
**Output**: Detailed compliance report + console summary
