# Secret Scanning Workflow

## Purpose
Find exposed API keys and credentials before they leak.

## TruffleHog Integration

TruffleHog is the industry-standard tool for detecting secrets in code repositories and filesystems.

### Installation

```bash
brew install trufflehog
```

### Verification

```bash
trufflehog --version
```

## Workflow Steps

### 1. Check TruffleHog Installation

```bash
if ! command -v trufflehog &> /dev/null; then
    echo "TruffleHog not found. Install with: brew install trufflehog"
    exit 1
fi
```

### 2. Run Filesystem Scan

```bash
# Scan current directory
trufflehog filesystem --directory=. --only-verified --json

# Scan specific directory
trufflehog filesystem --directory=/path/to/scan --only-verified --json

# Scan without verification (more findings, higher false positive rate)
trufflehog filesystem --directory=. --json
```

### 3. Run Git Repository Scan

```bash
# Scan git history
trufflehog git file://. --only-verified --json

# Scan specific branch
trufflehog git file://. --branch=main --only-verified --json

# Scan commits since specific date
trufflehog git file://. --since-commit=HEAD~10 --only-verified --json
```

### 4. Parse and Categorize Results

TruffleHog outputs JSON. Parse for:
- `DetectorName`: Type of secret (AWS, GitHub, etc.)
- `Verified`: Whether secret is active
- `SourceMetadata.Data.Filesystem.file`: File path
- `SourceMetadata.Data.Filesystem.line`: Line number
- `Raw`: The actual secret (handle carefully)

Severity mapping:
- **HIGH**: Verified secrets (active credentials)
- **MEDIUM**: Unverified but high-confidence matches
- **LOW**: Potential secrets requiring manual review

### 5. Generate Report

Parse JSON output and format into readable table with:
- Severity level
- Secret type
- File location
- Line number
- Verification status

## Output Format

```markdown
## Secret Scan Results

**Directory:** /path/to/scan
**Tool:** TruffleHog v3.x
**Scan Date:** YYYY-MM-DD HH:MM:SS
**Scan Type:** Filesystem | Git History

### Findings

| Severity | Type | File | Line | Verified |
|----------|------|------|------|----------|
| HIGH | AWS Access Key | src/config.ts | 42 | Yes |
| HIGH | GitHub Token | .env | 3 | Yes |
| MEDIUM | Generic API Key | lib/api.ts | 128 | No |

### Summary
- **HIGH:** 2 findings (verified, active credentials)
- **MEDIUM:** 1 finding (unverified)
- **LOW:** 0 findings

### Recommended Actions

#### Immediate (HIGH Severity)
1. **AWS Access Key** (src/config.ts:42)
   - Rotate key immediately via AWS IAM Console
   - Remove from code and use environment variables
   - Review CloudTrail logs for unauthorized access

2. **GitHub Token** (.env:3)
   - Revoke token at https://github.com/settings/tokens
   - Generate new token with minimal required scopes
   - Add .env to .gitignore if not already present

#### Follow-up (MEDIUM Severity)
3. **Generic API Key** (lib/api.ts:128)
   - Manually verify if credential is active
   - If active, rotate immediately
   - Move to secure secret management (environment variables, vault)

### Prevention Measures
- Add pre-commit hook with TruffleHog
- Use environment variables for all secrets
- Review .gitignore coverage
- Enable secret scanning in GitHub repository settings
- Consider using secret management tools (AWS Secrets Manager, HashiCorp Vault)
```

## Safety Protocol

### Never Auto-Fix
- **NEVER** automatically delete or modify found secrets
- **NEVER** commit changes that "fix" secrets without user confirmation
- **ALWAYS** report findings and recommend manual rotation

### Secure Handling
- **DO NOT** log raw secret values to files
- **DO NOT** echo secrets to stdout
- **DO** redact secrets in reports (show first/last 4 chars only)
- **DO** save scan results to security log with redacted values

### Rotation Over Deletion
- **RECOMMEND** rotation via proper channels (AWS Console, GitHub Settings, etc.)
- **RECOMMEND** credential invalidation before code cleanup
- **RECOMMEND** reviewing access logs for compromise

## Security Log Integration

Save scan results to:
```
$PAI_DIR/MEMORY/security/YYYY-MM-DD_secret-scan.jsonl
```

Log format:
```jsonl
{"timestamp":"2026-01-19T10:30:00Z","type":"secret_scan","findings":5,"verified":2,"directory":"/path"}
```

## Common Secret Types

TruffleHog detects 700+ secret types including:

- **Cloud Providers:** AWS, Azure, GCP
- **Version Control:** GitHub, GitLab, Bitbucket
- **Communication:** Slack, Discord, Telegram
- **Databases:** MongoDB, PostgreSQL, MySQL
- **APIs:** Stripe, Twilio, SendGrid
- **Generic:** API keys, private keys, passwords

## Advanced Usage

### Custom Patterns

Create custom regex patterns for proprietary secrets:

```bash
trufflehog filesystem --directory=. \
  --config=/path/to/trufflehog-config.yaml
```

### Exclude Paths

```bash
trufflehog filesystem --directory=. \
  --exclude-paths=/path/to/exclude-list.txt
```

### CI/CD Integration

```bash
# Exit with error code if verified secrets found
trufflehog filesystem --directory=. --only-verified --fail
```

## Workflow Implementation

When executing secret scan:

1. **Verify Installation**
   ```bash
   command -v trufflehog || echo "Install TruffleHog first"
   ```

2. **Execute Scan**
   ```bash
   trufflehog filesystem --directory=$TARGET_DIR --only-verified --json > /tmp/scan-results.json
   ```

3. **Parse Results**
   - Read JSON output
   - Categorize by severity
   - Redact secret values
   - Format into table

4. **Generate Report**
   - Create markdown report
   - Include recommended actions
   - Save to security log

5. **Present to User**
   - Show formatted report
   - Highlight HIGH severity items
   - Provide specific rotation instructions

## Example Execution

```bash
#!/usr/bin/env bash

# Secret Scanning Workflow Execution
TARGET_DIR="${1:-.}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_FILE="/tmp/trufflehog_${TIMESTAMP}.json"

# Check installation
if ! command -v trufflehog &> /dev/null; then
    echo "ERROR: TruffleHog not installed"
    echo "Install with: brew install trufflehog"
    exit 1
fi

# Run scan
echo "Scanning: $TARGET_DIR"
trufflehog filesystem \
    --directory="$TARGET_DIR" \
    --only-verified \
    --json > "$RESULTS_FILE" 2>&1

# Check results
FINDINGS=$(wc -l < "$RESULTS_FILE" | tr -d ' ')

if [ "$FINDINGS" -eq 0 ]; then
    echo "No verified secrets found"
else
    echo "Found $FINDINGS verified secret(s)"
    echo "Results saved to: $RESULTS_FILE"
fi
```

## References

- TruffleHog Documentation: https://github.com/trufflesecurity/trufflehog
- Secret Types Database: https://github.com/trufflesecurity/trufflehog/tree/main/pkg/detectors
- Best Practices: https://trufflesecurity.com/blog/
