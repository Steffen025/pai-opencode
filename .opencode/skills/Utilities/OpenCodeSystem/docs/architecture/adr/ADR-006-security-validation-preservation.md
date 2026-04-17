# ADR-006: Security Validation Pattern Preservation

**Status:** Accepted  
**Date:** 2026-01-25  
**Deciders:** Steffen (pai-opencode maintainer)  
**Tags:** security, compatibility, core

---

## Context

PAI v2.4 includes sophisticated pattern-based security validation that prevents dangerous commands from executing. This happens in the `PreToolUse` hook (now `tool.execute.before` plugin).

**Security Patterns Protected Against:**

| Category | Examples |
|----------|----------|
| **Destructive Commands** | `rm -rf /`, `mkfs.*`, filesystem formatting |
| **Reverse Shells** | `bash -i >&`, `nc -e`, netcat backdoors |
| **Credential Theft** | `cat ~/.ssh/id_*`, key extraction |
| **Remote Code Exec** | `curl \| bash`, download-and-execute |
| **Force Operations** | `git push --force`, `git reset --hard` (warnings) |

**The Question:**
When porting to OpenCode, should we simplify security rules, enhance them, or preserve them exactly?

---

## Decision

**Preserve security validation logic 1:1 from PAI v2.4, with identical patterns and behaviors.**

The security patterns transfer to OpenCode plugin with:
- Same pattern definitions (`DANGEROUS_PATTERNS`, `WARNING_PATTERNS`)
- Same blocking mechanism (now `throw Error()` instead of `exit(2)`)
- Same fail-open behavior (errors don't hang OpenCode)
- Same pattern matching logic

**Implementation:** `.opencode/plugins/handlers/security-validator.ts`

---

## Rationale

### 1. Security is Non-Negotiable

PAI's security patterns have been:
- Battle-tested in production PAI installations
- Reviewed and refined over multiple versions
- Proven to catch real dangerous commands
- Documented in security incident reports

**Risk:** Any changes introduce potential vulnerabilities.

### 2. Patterns Are Platform-Agnostic

Security threats don't change based on platform:
- `rm -rf /` is dangerous on Claude Code and OpenCode
- Reverse shells work the same everywhere
- Credential theft patterns are universal

No need to adapt for OpenCode.

### 3. Community Trust

Users migrating from PAI expect:
- Same security guarantees
- No regression in safety
- Familiar warning messages

Changing security behavior = breaking trust.

### 4. Clear Documentation

PAI's security patterns are:
- Well-documented in code comments
- Explained in SECURITY.md
- Tested in security audit sessions

Preserving patterns means preserving this knowledge.

---

## Alternatives Considered

### 1. Simplify security rules for "cleaner" code
**Rejected** because:
- Reduces safety for minor code simplicity
- Each pattern exists for a reason (documented incidents)
- "Simpler" often means "less secure"
- Not worth the risk

### 2. Delegate security to OpenCode platform
**Rejected** because:
- OpenCode has minimal built-in security features
- Platform focuses on tool execution, not command validation
- Would lose all PAI security protections
- Users would be less safe

### 3. Enhance patterns with OpenCode-specific threats
**Considered** but **deferred** because:
- No OpenCode-specific threats identified yet
- Can add later without breaking existing patterns
- Preservation first, enhancement later

### 4. Make security opt-in instead of default
**Rejected** because:
- Security should be default, not optional
- Users might forget to enable
- Reduces protection for new users
- Goes against security best practices

---

## Consequences

### ✅ **Positive**

- **Same Safety Guarantees:** Users get identical protection as PAI v2.4
  - Dangerous commands blocked
  - Clear error messages
  - Familiar warnings

- **Battle-Tested Patterns:** No need to re-validate security rules
  - Patterns proven in production
  - Edge cases already discovered and handled
  - Documented incident history

- **Clear Security Documentation:** Existing docs transfer directly
  - SECURITY.md references work
  - Pattern explanations accurate
  - No documentation rewrite needed

- **Trust Transfer:** PAI users switching to OpenCode
  - Same security they relied on
  - No learning curve for security behavior
  - Confidence in platform

### ❌ **Negative**

- **Must Maintain Pattern Sync:** When Miessler updates security patterns
  - Need to pull updates from upstream PAI
  - Pattern additions must be ported
  - *Mitigation:* Security patterns change infrequently
  - *Process:* Documented in PAI-TO-OPENCODE-MAPPING.md

- **Platform-Specific Considerations Not Addressed:** OpenCode may have unique threats
  - Currently none identified
  - *Mitigation:* Can add OpenCode-specific patterns later
  - *Enhancement:* Track OpenCode security issues separately

- **No Simplification:** Code remains complex
  - Large pattern definition file
  - Complex regex patterns
  - *Justification:* Complexity serves security
  - *Trade-off:* Safety > simplicity

---

## Implementation Details

### Pattern Preservation Example

**PAI v2.4 (Hook):**
```typescript
const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//,
  /mkfs\./,
  /bash\s+-i\s+>&/,
  // ... 30+ patterns
];

if (DANGEROUS_PATTERNS.some(p => p.test(command))) {
  process.exit(2); // Block
}
```

**pai-opencode (Plugin):**
```typescript
const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//,
  /mkfs\./,
  /bash\s+-i\s+>&/,
  // ... 30+ patterns (IDENTICAL)
];

if (DANGEROUS_PATTERNS.some(p => p.test(command))) {
  throw new Error(`Blocked dangerous command: ${reason}`);
}
```

**Key Point:** Pattern arrays are IDENTICAL, only blocking mechanism differs.

### Fail-Open Behavior

Both PAI and pai-opencode:
- Fail-open on validator errors (don't hang system)
- Log errors to debug log
- Allow command if validation crashes

**Reasoning:** Better to allow one command than hang entire system.

---

## Security Pattern Categories

**Preserved from PAI v2.4:**

| Category | Pattern Count | Examples |
|----------|---------------|----------|
| **Filesystem Destruction** | 8 | `rm -rf /`, `mkfs.*`, `dd if=/dev/zero` |
| **Network Backdoors** | 6 | `nc -e`, `bash -i >&`, reverse shells |
| **Credential Theft** | 5 | `cat ~/.ssh/id_*`, `grep -r password` |
| **Remote Code Execution** | 7 | `curl \| bash`, `wget \| sh` |
| **Git Force Operations** | 4 | `push --force`, `reset --hard` (warnings only) |

**Total Patterns:** 30+ dangerous, 15+ warning

---

## Testing Strategy

**Inherited from PAI v2.4:**
```bash
# Test dangerous command blocking
echo "rm -rf /" | # Should be blocked

# Test warning patterns
echo "git push --force" | # Should warn but allow

# Test safe commands
echo "ls -la" | # Should pass through
```

**Additional OpenCode Testing:**
- Verify `throw Error()` blocks execution
- Verify error messages display correctly in OpenCode
- Verify fail-open behavior on validator crash

---

## Documentation References

**Security Patterns Documented:**
- Pattern definitions with explanations (inline comments)
- Incident history (why each pattern exists)
- False positive handling
- Override mechanisms (if needed)

**Files:**
- Implementation: `.opencode/plugins/handlers/security-validator.ts`
- Patterns: `DANGEROUS_PATTERNS`, `WARNING_PATTERNS` arrays
- Tests: (Future) `.opencode/plugins/handlers/security-validator.test.ts`

---

## Future Enhancements

**Potential additions (not in v1.0):**

1. **OpenCode-Specific Patterns:** If unique threats identified
2. **User-Configurable Patterns:** Allow additions via settings.json
3. **Pattern Explanations in UI:** Show WHY command was blocked
4. **Security Audit Log:** Track all blocked commands
5. **Pattern Testing Tool:** CLI to test patterns against commands

**Principle:** Preserve foundation, enhance carefully.

---

## References

- **Implementation:** `.opencode/plugins/handlers/security-validator.ts`
- **PAI v2.4 Source:** Hooks/PreToolUse security validation
- **Documentation:** pai-opencode SECURITY.md
- **Pattern Source:** Miessler's PAI security patterns

---

## Related ADRs

- ADR-001: Hooks → Plugins Architecture (explains blocking mechanism change)
- ADR-004: Plugin Logging (explains error logging)

---

*This ADR establishes that security is preserved 1:1 from PAI - no compromises for convenience.*
