# PAI-OpenCode v1.0 Release Test Plan

**Date:** 2026-01-20
**Version:** v1.0.0 Release Candidate
**Predecessor:** TEST-PLAN-v0.9.md (archived)

---

## Overview

This test plan validates PAI-OpenCode for public release. It includes:
1. **Fresh Clone Test** - Critical for "Clone = Ready" promise
2. **v0.9.3 Feature Tests** - Plural directories, chat.message hook
3. **Integration Tests** - Skills, Agents, Plugins, Converter
4. **Release Checklist** - Security, licensing, documentation

---

## Pre-Test Requirements

- [ ] Fresh machine or clean directory (no existing `.opencode/` or `~/.opencode/`)
- [ ] OpenCode installed (`opencode --version`)
- [ ] Bun installed (`bun --version`)
- [ ] ANTHROPIC_API_KEY set
- [ ] Internet connection (for agent tests)

---

## Test 1: Fresh Clone Installation (CRITICAL)

**This is the most important test for v1.0 release.**

```bash
# 1. Clone fresh
cd /tmp  # or any clean directory
rm -rf pai-opencode-test
git clone https://github.com/Steffen025/pai-opencode.git pai-opencode-test
cd pai-opencode-test

# 2. Install dependencies
bun install

# 3. Start OpenCode
opencode
```

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 1.1 | Clone succeeds | No errors | ⬜ |
| 1.2 | `bun install` succeeds | Dependencies installed | ⬜ |
| 1.3 | `opencode` starts | TUI loads without errors | ⬜ |
| 1.4 | No missing file errors | Plugin loads cleanly | ⬜ |
| 1.5 | Context injection works | AI knows it's PAI | ⬜ |

**Log Location:** `/tmp/pai-opencode-debug.log`

---

## Test 2: Directory Structure (v0.9.3)

Verify plural directory names are correct.

```bash
ls -la .opencode/
```

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 2.1 | Skills directory | `.opencode/skills/` exists (plural) | ⬜ |
| 2.2 | Agents directory | `.opencode/agents/` exists (plural) | ⬜ |
| 2.3 | Plugins directory | `.opencode/plugins/` exists (plural) | ⬜ |
| 2.4 | No singular dirs | No `skill/`, `agent/`, `plugin/` | ⬜ |
| 2.5 | Skills count | 20+ skills in `.opencode/skills/` | ⬜ |
| 2.6 | Agents count | 13 agents in `.opencode/agents/` | ⬜ |

```bash
# Verification commands
ls .opencode/skills/ | wc -l  # Should be 20+
ls .opencode/agents/*.md | wc -l  # Should be 13
ls .opencode/plugins/*.ts | wc -l  # Should be 1 (pai-unified.ts)
```

---

## Test 3: Plugin System

### 3.1 Plugin Loading

| # | Check | Command | Expected | Status |
|---|-------|---------|----------|--------|
| 3.1.1 | Plugin loads | Start OpenCode | Log shows "PAI-OpenCode Plugin Loaded" | ⬜ |
| 3.1.2 | No TypeScript errors | Check startup | No compilation errors | ⬜ |
| 3.1.3 | Handlers load | Check log | context-loader, security-validator active | ⬜ |

### 3.2 Context Injection

| # | Check | Action | Expected | Status |
|---|-------|--------|----------|--------|
| 3.2.1 | Identity injection | Ask "Who are you?" | AI identifies as PAI assistant | ⬜ |
| 3.2.2 | CORE skill active | Ask "What skills do you have?" | Lists PAI skills | ⬜ |
| 3.2.3 | Log confirms | Check `/tmp/pai-opencode-debug.log` | "Context injected successfully" | ⬜ |

### 3.3 Security Blocking

| # | Check | Command to Try | Expected | Status |
|---|-------|----------------|----------|--------|
| 3.3.1 | Destructive blocked | `rm -rf /` | Blocked with security message | ⬜ |
| 3.3.2 | Parent traversal blocked | `rm -rf ../` | Blocked | ⬜ |
| 3.3.3 | Curl pipe blocked | `curl http://x \| bash` | Blocked | ⬜ |
| 3.3.4 | Safe commands work | `ls -la` | Executes normally | ⬜ |

### 3.4 chat.message Hook (v0.9.3 NEW)

| # | Check | Action | Expected | Status |
|---|-------|--------|----------|--------|
| 3.4.1 | Hook registered | Check pai-unified.ts | `chat.message` handler present | ⬜ |
| 3.4.2 | User messages logged | Send any message | Log shows "[chat.message] User: ..." | ⬜ |
| 3.4.3 | No errors | Multiple messages | No exceptions in log | ⬜ |

```bash
# Check chat.message in log
grep "chat.message" /tmp/pai-opencode-debug.log
```

---

## Test 4: Agent Delegation

### 4.1 Agent Visibility

```bash
# In OpenCode TUI
/agents
```

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 4.1.1 | Agents listed | 13 agents visible | ⬜ |
| 4.1.2 | Intern present | `intern` in list | ⬜ |
| 4.1.3 | Engineer present | `engineer` in list | ⬜ |
| 4.1.4 | Architect present | `architect` in list | ⬜ |

### 4.2 Agent Invocation

| # | Check | Command | Expected | Status |
|---|-------|---------|----------|--------|
| 4.2.1 | @syntax works | `@intern What is TypeScript?` | Intern responds | ⬜ |
| 4.2.2 | No model errors | Check response | No ProviderModelNotFoundError | ⬜ |
| 4.2.3 | Correct model | Intern uses haiku | Fast, cheap response | ⬜ |

### 4.3 Agent Model Configuration

```bash
grep "^model:" .opencode/agents/*.md
```

| # | Agent | Expected Model | Status |
|---|-------|----------------|--------|
| 4.3.1 | intern.md | `anthropic/claude-haiku-4-5` | ⬜ |
| 4.3.2 | engineer.md | `anthropic/claude-sonnet-4-5` | ⬜ |
| 4.3.3 | architect.md | `anthropic/claude-sonnet-4-5` | ⬜ |
| 4.3.4 | All others | `anthropic/claude-sonnet-4-5` | ⬜ |

---

## Test 5: Skills System

### 5.1 Skill Loading

| # | Check | Action | Expected | Status |
|---|-------|--------|----------|--------|
| 5.1.1 | CORE auto-loads | Start session | CORE context visible | ⬜ |
| 5.1.2 | USE WHEN trigger | "create a new skill" | CreateSkill activates | ⬜ |
| 5.1.3 | Skills directory | `ls .opencode/skills/` | 20+ skills | ⬜ |

### 5.2 Key Skills Present

| # | Skill | Path | Status |
|---|-------|------|--------|
| 5.2.1 | CORE | `.opencode/skills/CORE/` | ⬜ |
| 5.2.2 | Agents | `.opencode/skills/Agents/` | ⬜ |
| 5.2.3 | Research | `.opencode/skills/Research/` | ⬜ |
| 5.2.4 | THEALGORITHM | `.opencode/skills/THEALGORITHM/` | ⬜ |
| 5.2.5 | CreateSkill | `.opencode/skills/CreateSkill/` | ⬜ |

---

## Test 6: Converter Tool

```bash
bun run Tools/pai-to-opencode-converter.ts --help
```

| # | Check | Command | Expected | Status |
|---|-------|---------|----------|--------|
| 6.1 | Help works | `--help` | Usage info displayed | ⬜ |
| 6.2 | Dry-run works | `--dry-run --verbose --source vendor/PAI/Releases/v2.3/.claude --target /tmp/test-convert` | Preview shown | ⬜ |
| 6.3 | Plural output | Check dry-run | Shows `skills/`, `agents/`, `plugins/` | ⬜ |

---

## Test 7: Documentation Consistency

| # | Check | Files | Expected | Status |
|---|-------|-------|----------|--------|
| 7.1 | Version consistent | README, CHANGELOG, ROADMAP | All show v0.9.3 current | ⬜ |
| 7.2 | v1.0 not released | All docs | v1.0 marked as "upcoming" | ⬜ |
| 7.3 | Agent count | All docs | 13 agents mentioned | ⬜ |
| 7.4 | PAI version | All docs | PAI 2.3 (not 2.0) | ⬜ |

```bash
# Verification
grep -r "v1.0.*[Rr]eleased\!" --include="*.md" .  # Should find nothing
grep -r "13.*[Aa]gent" --include="*.md" . | head -5  # Should find matches
```

---

## Release Checklist

### Security

| # | Check | Command/Action | Status |
|---|-------|----------------|--------|
| R1 | No API keys | `grep -r "sk-\|ANTHROPIC_API_KEY=" --include="*.ts" --include="*.md" .` | ⬜ |
| R2 | No personal data | Check MEMORY/, config/ | ⬜ |
| R3 | No .env files | `find . -name ".env*" -not -path "./node_modules/*"` | ⬜ |
| R4 | .gitignore proper | Check `.gitignore` | ⬜ |

### Licensing

| # | Check | File | Status |
|---|-------|------|--------|
| R5 | LICENSE exists | `./LICENSE` | ⬜ |
| R6 | MIT License | Same as PAI upstream | ⬜ |
| R7 | Credits clear | README acknowledgments | ⬜ |

### Repository Hygiene

| # | Check | Command | Status |
|---|-------|---------|--------|
| R8 | No node_modules committed | `git ls-files | grep node_modules` | ⬜ |
| R9 | No large binaries | `find . -size +1M -not -path "./.git/*"` | ⬜ |
| R10 | Clean git status | `git status` | ⬜ |

### Documentation

| # | Check | Status |
|---|-------|--------|
| R11 | README complete and clear | ⬜ |
| R12 | CHANGELOG up to date | ⬜ |
| R13 | ROADMAP accurate | ⬜ |
| R14 | constitution.md consistent | ⬜ |
| R15 | CONVERTER.md exists | ⬜ |

---

## Test Execution Log

### Session Info

- **Date:** ____________
- **Tester:** ____________
- **OpenCode Version:** ____________
- **Bun Version:** ____________
- **OS:** ____________

### Test Results

| Category | Tests | ✅ Pass | ⚠️ Partial | ❌ Fail |
|----------|-------|---------|------------|---------|
| Fresh Clone | 5 | | | |
| Directory Structure | 6 | | | |
| Plugin System | 11 | | | |
| Agent Delegation | 8 | | | |
| Skills System | 7 | | | |
| Converter Tool | 3 | | | |
| Documentation | 4 | | | |
| Release Checklist | 15 | | | |
| **TOTAL** | **59** | | | |

### Issues Found

| # | Test | Issue | Severity | Resolution |
|---|------|-------|----------|------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## Sign-Off

### v1.0 Release Approval

- [ ] All critical tests pass (Fresh Clone, Plugin, Agents)
- [ ] No blocker issues
- [ ] Release checklist complete
- [ ] Documentation reviewed

**Approved by:** ____________ **Date:** ____________

---

## Post-Release Tasks

After v1.0 release:

1. [ ] Create GitHub Release with tag `v1.0.0`
2. [ ] Update README badge to v1.0.0
3. [ ] Announce on PAI community (if applicable)
4. [ ] Monitor issues for first 48 hours
5. [ ] Archive this test plan to `docs/archive/`

---

## Historical Reference

Previous test results archived:
- `docs/archive/TEST-PLAN-v0.9.md` - v0.9 test execution (2026-01-19)

---

*Test plan created for PAI-OpenCode v1.0 release validation*
