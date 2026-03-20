# PrivacyCheck Workflow

## Trigger
"privacy check", "data isolation", "validate privacy", "check data boundaries", "privacy audit"

## Purpose
Validate data isolation between USER/ (personal data), SYSTEM/ (architecture docs), and MEMORY/ (execution history) to ensure no cross-contamination or sensitive data exposure within the PAI infrastructure.

## What It Does

Validates internal PAI data boundaries:

1. **USER Directory Isolation** - Personal data stays in USER/, not leaked elsewhere
2. **SYSTEM Documentation Purity** - Architecture docs remain generic, no personal examples
3. **MEMORY Sanitization** - Execution history properly anonymizes or isolates sensitive data
4. **Cross-Boundary References** - Validates references between directories are intentional
5. **Personal Identifier Detection** - Finds and validates personal data placement

## Privacy Principles

**USER/ Directory:**
- Contains: Personal projects, private notes, sensitive data
- Privacy Level: PRIVATE
- Should NEVER be referenced directly from SYSTEM/ or shared skills
- Can be referenced from MEMORY/ (execution history is private)

**SYSTEM/ Directory:**
- Contains: Architecture documentation, design decisions, technical specs
- Privacy Level: SEMI-PUBLIC (could be sanitized and shared)
- Should contain NO personal identifiers
- Should use placeholders: ${ENGINEER_NAME}, ${DA}, example.com

**MEMORY/ Directory:**
- Contains: Execution history, session logs, work artifacts
- Privacy Level: PRIVATE (but structured for potential sanitization)
- Can reference USER/ (private context)
- Should separate personal from technical learnings

## Execution Pattern

```typescript
// 1. Scan each directory for privacy boundaries
// 2. Detect personal identifiers (names, emails, paths, etc.)
// 3. Validate cross-directory references
// 4. Check for data leakage patterns
// 5. Generate privacy compliance report
```

## Implementation Steps

### 1. Directory Structure Validation

Verify expected privacy boundaries exist:

```bash
# Check directory structure
test -d "$PAI_DIR/USER" || echo "WARNING: USER directory missing"
test -d "$PAI_DIR/SYSTEM" || echo "WARNING: SYSTEM directory missing"
test -d "$PAI_DIR/MEMORY" || echo "WARNING: MEMORY directory missing"

# List top-level structure
ls -la "$PAI_DIR" | grep -E "USER|SYSTEM|MEMORY"
```

### 2. Personal Identifier Detection

Scan for personal data across directories:

```typescript
const personalIdentifiers = {
  // Names (real ones, not variables)
  names: [
    /\bSteffen\b(?!ENGINEER_NAME|_)/g,  // Real name, not variable
    /\bSteffens\b/g,                     // Possessive form
  ],

  // Email addresses
  emails: [
    /steffen\.025@gmail\.com/gi,
    /[a-z0-9._%+-]+@(?!example\.com|placeholder\.)[a-z0-9.-]+\.[a-z]{2,}/gi
  ],

  // Local paths with username
  paths: [
    /\/Users\/steffen\//g,
    /C:\\Users\\steffen\\/gi,
  ],

  // Phone numbers (various formats)
  phones: [
    /\+?[1-9]\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g
  ],

  // Addresses
  addresses: [
    /\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln)/gi
  ],

  // IP addresses (if personal/home)
  ips: [
    /\b(?:192\.168|10\.0|172\.16)\.\d{1,3}\.\d{1,3}\b/g
  ],

  // API keys patterns
  apiKeys: [
    /sk-[a-zA-Z0-9]{32,}/g,
    /ghp_[a-zA-Z0-9]{36,}/g,
    /AIza[a-zA-Z0-9_-]{35}/g
  ]
};

// Scan each directory with different expectations
const results = {
  USER: scanDirectory("USER", personalIdentifiers, { allowed: true }),
  SYSTEM: scanDirectory("SYSTEM", personalIdentifiers, { allowed: false }),
  MEMORY: scanDirectory("MEMORY", personalIdentifiers, { allowed: "conditional" })
};
```

### 3. USER Directory Isolation Check

**Validate USER/ data stays contained:**

```bash
# Find any references TO USER/ from outside USER/
cd "$PAI_DIR"

# Check SYSTEM/ for USER/ references
grep -r "USER/" SYSTEM/ --include="*.md" --include="*.ts" 2>/dev/null

# Allowed patterns (generic references):
# - Documentation: "store in USER/ directory"
# - Examples: "e.g., USER/projects/example"
# Not allowed:
# - Direct paths: "see USER/steffen/project.md"
# - Specific content: "as configured in USER/config.json"

# Check skills (outside PAI) for USER/ references
grep -r "USER/" .opencode/skills/*/SKILL.md | grep -v "PAI/SKILL.md"
```

**Validation rules:**

```typescript
function validateUserReference(file: string, match: string): Issue | null {
  // Allow generic documentation
  if (isGenericDocumentation(match)) {
    return null;
  }

  // Allow PAI skill (it's private context loader)
  if (file.includes("skills/PAI/")) {
    return null;
  }

  // Allow MEMORY (execution history can reference USER/)
  if (file.includes("MEMORY/")) {
    return null;
  }

  // Everything else is a violation
  return {
    file,
    type: "USER_REFERENCE_FROM_PUBLIC",
    severity: "HIGH",
    match,
    message: "Public/shared file references USER/ directory"
  };
}
```

### 4. SYSTEM Directory Sanitization Check

**Ensure SYSTEM/ docs are generic:**

```typescript
// SYSTEM/ should use placeholders, not real values
const systemFiles = glob("SYSTEM/**/*.md");

for (const file of systemFiles) {
  const content = readFile(file);

  // Check for personal identifiers
  const personalData = scanForPersonalData(content);

  if (personalData.length > 0) {
    violations.push({
      file,
      type: "PERSONAL_DATA_IN_SYSTEM",
      severity: "CRITICAL",
      matches: personalData,
      message: "SYSTEM docs should be generic, found personal data"
    });
  }

  // Check for proper placeholder usage
  const placeholders = [
    "${ENGINEER_NAME}",
    "${DA}",
    "$PAI_DIR",
    "example.com",
    "user@example.com"
  ];

  // Suggest replacements for hardcoded values
  suggestPlaceholders(file, content, placeholders);
}
```

### 5. MEMORY Privacy Stratification

**Validate MEMORY/ data is appropriately categorized:**

```typescript
const memoryPrivacyLevels = {
  // High privacy - personal context
  "MEMORY/Work/": "PRIVATE",
  "MEMORY/sessions/": "PRIVATE",
  "MEMORY/projects/*/private/": "PRIVATE",

  // Medium privacy - could be sanitized
  "MEMORY/Learning/": "SEMI-PRIVATE",
  "MEMORY/research/": "SEMI-PRIVATE",

  // Low privacy - technical only
  "MEMORY/State/": "TECHNICAL",

  // Structured data
  "MEMORY/raw-outputs/": "STRUCTURED",
  "MEMORY/security/": "AUDIT_LOG"
};

// Scan each area for privacy compliance
for (const [path, expectedLevel] of Object.entries(memoryPrivacyLevels)) {
  const files = glob(`${path}/**/*.{md,json,jsonl}`);

  for (const file of files) {
    const content = readFile(file);
    const detectedLevel = classifyPrivacyLevel(content);

    if (detectedLevel > expectedLevel) {
      violations.push({
        file,
        type: "PRIVACY_LEVEL_MISMATCH",
        expected: expectedLevel,
        detected: detectedLevel,
        message: `File contains ${detectedLevel} data in ${expectedLevel} area`
      });
    }
  }
}
```

### 6. Cross-Boundary Reference Validation

**Map and validate all cross-directory references:**

```typescript
// Build reference map
const referenceMap = {
  "USER -> SYSTEM": [],     // Should be NONE
  "USER -> MEMORY": [],     // OK (user work creates memory)
  "SYSTEM -> USER": [],     // Should be generic only
  "SYSTEM -> MEMORY": [],   // OK (docs reference examples)
  "MEMORY -> USER": [],     // OK (execution refers to user work)
  "MEMORY -> SYSTEM": []    // OK (references architecture)
};

// Scan all files for cross-references
const allFiles = glob("**/*.{md,ts,js,json}", {
  cwd: PAI_DIR,
  ignore: ["node_modules", ".git"]
});

for (const file of allFiles) {
  const content = readFile(file);
  const sourceDir = getTopLevelDir(file); // USER, SYSTEM, or MEMORY

  // Find references to other directories
  const refs = findDirectoryReferences(content);

  for (const ref of refs) {
    const targetDir = getTopLevelDir(ref);
    const refType = `${sourceDir} -> ${targetDir}`;

    referenceMap[refType].push({
      file,
      reference: ref,
      context: getContext(content, ref)
    });
  }
}

// Validate each reference type
validateReferences(referenceMap);
```

### 7. Sensitive Pattern Detection

**Scan for patterns that indicate privacy issues:**

```typescript
const sensitivePatterns = {
  // Credentials
  passwords: /password\s*[:=]\s*['"]\w+['"]/gi,
  tokens: /token\s*[:=]\s*['"]\w+['"]/gi,
  secrets: /secret\s*[:=]\s*['"]\w+['"]/gi,

  // Personal identifiers
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,

  // Private notes markers
  privateMarkers: /\b(PRIVATE|CONFIDENTIAL|DO NOT SHARE|PERSONAL)\b/gi,

  // Financial data
  salary: /\$\d{1,3}(,\d{3})*(\.\d{2})?/g,  // Dollar amounts (context-dependent)

  // Health info
  medical: /\b(diagnosis|prescription|medical|health insurance)\b/gi
};

// Scan with context awareness
function scanForSensitiveData(content: string, directory: string) {
  const findings = [];

  for (const [type, pattern] of Object.entries(sensitivePatterns)) {
    const matches = content.match(pattern);

    if (matches) {
      // Check if this is expected for the directory
      const severity = getSeverityForLocation(type, directory);

      if (severity !== "OK") {
        findings.push({ type, matches, severity });
      }
    }
  }

  return findings;
}
```

### 8. Privacy Score Calculation

**Generate privacy compliance score:**

```typescript
function calculatePrivacyScore(results) {
  const weights = {
    userIsolation: 0.30,        // 30% - USER/ not leaked
    systemSanitization: 0.25,   // 25% - SYSTEM/ is generic
    memoryCategorization: 0.20, // 20% - MEMORY/ properly stratified
    crossReferences: 0.15,      // 15% - Valid cross-refs only
    sensitiveData: 0.10         // 10% - No unexpected sensitive data
  };

  const scores = {
    userIsolation: calculateUserIsolationScore(results),
    systemSanitization: calculateSystemSanitizationScore(results),
    memoryCategorization: calculateMemoryScore(results),
    crossReferences: calculateCrossRefScore(results),
    sensitiveData: calculateSensitiveDataScore(results)
  };

  // Weighted average
  let totalScore = 0;
  for (const [category, weight] of Object.entries(weights)) {
    totalScore += scores[category] * weight;
  }

  return {
    overall: Math.round(totalScore),
    breakdown: scores
  };
}
```

## Output Format

### Privacy Compliance Report

```markdown
# Privacy Compliance Report
Generated: {timestamp}

## Executive Summary

**Privacy Score: 94/100** ⚠️ PASS WITH WARNINGS

### Score Breakdown
- USER Isolation: 100/100 ✅
- SYSTEM Sanitization: 88/100 ⚠️
- MEMORY Categorization: 95/100 ✅
- Cross-References: 100/100 ✅
- Sensitive Data Handling: 90/100 ⚠️

## Directory Analysis

### USER/ Directory
- Files scanned: 127
- Personal data found: 247 instances (EXPECTED)
- Leaked to other directories: 0 ✅
- Status: COMPLIANT

**Personal Data Inventory:**
- Names: 89 occurrences
- Email addresses: 23 occurrences
- Local paths: 135 occurrences
- API keys: 0 (good - should use env vars)

### SYSTEM/ Directory
- Files scanned: 43
- Personal data found: 3 instances ⚠️
- Placeholder usage: 87% (good)
- Status: MINOR ISSUES

**Issues Found:**

1. **SYSTEM/architecture/decisions/ADR-003.md:45**
   - Contains: "Steffen prefers Bun over npm"
   - Should be: "${ENGINEER_NAME} prefers Bun over npm"
   - Severity: LOW
   - Auto-fix: Available

2. **SYSTEM/docs/setup.md:12**
   - Contains: "/Users/username/.opencode"
   - Should be: "$PAI_DIR" or "$HOME/.opencode"
   - Severity: MEDIUM
   - Auto-fix: Available

3. **SYSTEM/workflows/example.md:78**
   - Contains: "steffen@gmail.com"
   - Should be: "user@example.com"
   - Severity: MEDIUM
   - Auto-fix: Available

### MEMORY/ Directory
- Files scanned: 1,247
- Privacy stratification: 95% correct
- Categorization issues: 12
- Status: MOSTLY COMPLIANT

**Privacy Stratification:**
- Private: 89% (1,110 files) ✅
- Semi-private: 8% (100 files) ✅
- Technical: 3% (37 files) ✅

**Issues Found:**

1. **MEMORY/Learning/Generic/typescript-patterns.md**
   - Contains personal project reference
   - Should be moved to: MEMORY/Learning/Personal/
   - Severity: LOW

2. **MEMORY/research/2026-01/api-comparison.md**
   - Contains API key in example code
   - Should be: placeholder value
   - Severity: MEDIUM

## Cross-Directory References

### USER → SYSTEM
- Total references: 0 ✅
- Status: PERFECT ISOLATION

### USER → MEMORY
- Total references: 453 ✅
- Status: EXPECTED (user work creates memory)

### SYSTEM → USER
- Total references: 5
- Generic references: 5 ✅
- Specific references: 0 ✅
- Status: COMPLIANT

### SYSTEM → MEMORY
- Total references: 23 ✅
- Status: EXPECTED (docs reference execution examples)

### MEMORY → USER
- Total references: 127 ✅
- Status: EXPECTED (execution history refers to user work)

### MEMORY → SYSTEM
- Total references: 45 ✅
- Status: EXPECTED (references architecture docs)

## Sensitive Data Detection

### Credentials
- Passwords: 0 ✅
- API keys: 1 ⚠️ (in MEMORY/research/api-comparison.md)
- Tokens: 0 ✅
- Status: MINOR ISSUE

### Personal Identifiers
- SSN: 0 ✅
- Credit cards: 0 ✅
- Phone numbers: 0 ✅
- Status: COMPLIANT

### Financial Data
- Salary information: 0 ✅
- Payment details: 0 ✅
- Status: COMPLIANT

### Health Information
- Medical data: 0 ✅
- Status: COMPLIANT

## Violations Summary

### Critical (0)
None found ✅

### High (0)
None found ✅

### Medium (3)
1. SYSTEM/docs/setup.md - hardcoded path
2. SYSTEM/workflows/example.md - real email
3. MEMORY/research/2026-01/api-comparison.md - API key in example

### Low (2)
1. SYSTEM/architecture/decisions/ADR-003.md - personal name
2. MEMORY/Learning/Generic/typescript-patterns.md - wrong category

## Recommendations

1. ✅ USER isolation is excellent - maintain current practices
2. ⚠️ Apply auto-fixes to 3 SYSTEM files to improve sanitization
3. 💡 Consider automated placeholder replacement in SYSTEM docs
4. ⚠️ Review API key in research document - replace with placeholder
5. 📁 Move 1 learning doc to correct privacy category

## Auto-Fix Summary

Available auto-fixes: 3
- Replace "Steffen" with "${ENGINEER_NAME}" (1 file)
- Replace hardcoded paths with variables (1 file)
- Replace real email with placeholder (1 file)

Apply auto-fixes? Run: `jeremy privacy-fix`

## Privacy Best Practices

✅ **Currently Following:**
- USER/ directory properly isolated
- Cross-references are intentional and validated
- No credentials in code
- MEMORY properly categorizes execution history

⚠️ **Room for Improvement:**
- Increase placeholder usage in SYSTEM docs to 95%+
- Review all API keys/tokens, even in examples
- Regularly audit MEMORY categorization

## Next Steps

1. Apply auto-fixes for medium-priority issues
2. Manually review API key in research doc
3. Recategorize typescript-patterns.md learning
4. Re-run privacy check to validate fixes
5. Consider scheduling weekly privacy audits

---
Duration: 2.8s
Overall Status: PASS WITH WARNINGS (94/100)
```

### Console Output

```
## PrivacyCheck

Scanning privacy boundaries...

✅ USER/ Isolation (0.4s)
   Personal data: 247 instances (contained)
   Leaks: 0

⚠️ SYSTEM/ Sanitization (0.6s)
   Files: 43
   Personal data: 3 instances found
   Placeholder usage: 87%

✅ MEMORY/ Categorization (1.2s)
   Files: 1,247
   Stratification: 95% correct

✅ Cross-References (0.4s)
   Total checked: 653
   Violations: 0

⚠️ Sensitive Data (0.2s)
   Credentials: 1 issue found
   Personal IDs: 0 issues

Privacy Score: 94/100 ⚠️ PASS WITH WARNINGS

Issues to fix: 5 (3 medium, 2 low)
Auto-fixes available: 3

Full report:
$PAI_DIR/MEMORY/sessions/{date}/privacy-compliance-report.md

Apply auto-fixes? [y/N]:
```

## Auto-Fix Capability

```typescript
const autoFixes = [
  {
    file: "SYSTEM/architecture/decisions/ADR-003.md",
    line: 45,
    original: "Steffen prefers",
    replacement: "${ENGINEER_NAME} prefers",
    description: "Replace personal name with placeholder"
  },
  {
    file: "SYSTEM/docs/setup.md",
    line: 12,
    original: "/Users/username/.opencode",
    replacement: "$PAI_DIR",
    description: "Replace hardcoded path with variable"
  },
  {
    file: "SYSTEM/workflows/example.md",
    line: 78,
    original: "steffen@gmail.com",
    replacement: "user@example.com",
    description: "Replace real email with placeholder"
  }
];

// Apply each fix with confirmation
for (const fix of autoFixes) {
  console.log(`\nFix #${index + 1}:`);
  console.log(`File: ${fix.file}:${fix.line}`);
  console.log(`Change: ${fix.original} → ${fix.replacement}`);

  if (await confirm("Apply this fix?")) {
    applyFix(fix);
    console.log("✅ Applied");
  } else {
    console.log("⏭️ Skipped");
  }
}
```

## Integration Points

- **CrossRepoValidation**: Uses similar detection patterns
- **IntegrityCheck**: Can include privacy check as component
- **GitPush**: Run before committing to validate no privacy leaks
- **PAI Skill**: Privacy-aware context loading

## Example Usage

```
User: "privacy check"

Jeremy: I'll audit data isolation across USER/, SYSTEM/, and MEMORY/ directories.

Scanning privacy boundaries...

[Progress for each check]

Privacy audit complete!

Score: 94/100 ⚠️ PASS WITH WARNINGS

✅ USER isolation: Perfect - no leaks detected
⚠️ SYSTEM sanitization: 3 files contain personal data
✅ MEMORY categorization: 95% correct
✅ Cross-references: All valid
⚠️ Sensitive data: 1 API key found in example

5 issues found (3 medium, 2 low)

I can auto-fix 3 of them:
1. Replace personal name with ${ENGINEER_NAME}
2. Replace hardcoded path with $PAI_DIR
3. Replace real email with placeholder

Apply auto-fixes? [y/N]:
```

---

**Workflow Type**: Privacy Audit
**Execution Time**: ~3-4 seconds
**Destructive**: No (read-only by default, auto-fix requires confirmation)
**Requires User Input**: Only for auto-fix confirmation
**Output**: Detailed privacy compliance report + privacy score
