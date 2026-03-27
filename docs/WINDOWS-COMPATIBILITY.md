# Windows Multi-Platform Support

**Branch:** `feature/windows-multiplatform-support`
**Issue:** [#5 - Bug: Windows Clone Fails - Colons in File Paths](https://github.com/Steffen025/pai-opencode/issues/5)
**Created:** 2026-01-25
**Status:** RESEARCH COMPLETE - Implementation Pending

---

## Executive Summary

PAI-OpenCode is currently NOT Windows-compatible. This document tracks all identified issues and the implementation plan to achieve multi-platform support.

**Key Finding:** OpenCode itself has known Windows issues (GitHub Issue #631 tracks 23 problems with only 10 resolved). Our approach must account for upstream limitations.

---

## Issue Severity Matrix

| # | Issue | Severity | Windows Native | WSL | Fix Complexity |
|---|-------|----------|----------------|-----|----------------|
| 1 | Colons in filenames (URL cache) | **BLOCKER** | ❌ Clone fails | ⚠️ Must clone in WSL fs | HIGH (git history) |
| 2 | `/tmp` paths hardcoded | HIGH | ❌ Path not found | ✅ Works | LOW |
| 3 | `process.env.HOME` | HIGH | ❌ Undefined | ✅ Works | LOW |
| 4 | Symlink requirement | HIGH | ⚠️ Needs Admin | ✅ Works | MEDIUM |
| 5 | `.zshrc`/`.bashrc` config | MEDIUM | ❌ Not applicable | ✅ Works | MEDIUM |
| 6 | `process.env.SHELL` detection | MEDIUM | ❌ Undefined | ✅ Works | LOW |
| 7 | Bash scripts | MEDIUM | ❌ Can't run | ✅ Works | MEDIUM |
| 8 | `~` tilde expansion | MEDIUM | ⚠️ Unreliable | ✅ Works | LOW |

---

## BLOCKER: URL-Based Cache Files

### Problem

4 files in `.opencode/skills/Browser/` use URLs as filenames, which contain colons:

```
.opencode/skills/Browser/Tools/https:/danielmiessler.com/blog/introducing-amazon-curate-i-wish
.opencode/skills/Browser/Browser/Tools/https:/danielmiessler.com/blog/introducing-amazon-curate-i-wish
.opencode/skills/Browser/Browser/http:/localhost:5173/ideas
.opencode/skills/Browser/Browser/http:/localhost:5173/ideas#the-full-archive
```

Windows filesystem forbids these characters: `< > : " / \ | ? *`

### Root Cause

The Browser skill automatically caches screenshots/pages using the URL as the path. These caches were accidentally committed to git.

### Fix Options

**Option A: Remove from git history (Recommended)**
```bash
# Using git-filter-repo (safer than filter-branch)
pip install git-filter-repo

git filter-repo --path '.opencode/skills/Browser/Tools/https:' --invert-paths
git filter-repo --path '.opencode/skills/Browser/Browser/Tools/https:' --invert-paths
git filter-repo --path '.opencode/skills/Browser/Browser/Tools/http:' --invert-paths
git filter-repo --path '.opencode/skills/Browser/Browser/http:' --invert-paths

# Force push (destructive!)
git push origin --force --all
```

**Option B: Sparse checkout workaround (for users)**
```bash
git clone --no-checkout https://github.com/Steffen025/pai-opencode.git
cd pai-opencode
git sparse-checkout init
git sparse-checkout set "/*" "!*/Browser/Browser/Tools/https:*" "!*/Browser/Browser/http:*" "!*/Browser/Tools/https:*"
git checkout
```

### Prevention

Add to `.gitignore`:
```gitignore
# Browser skill caches (contain URLs with colons)
.opencode/skills/Browser/**/https:*
.opencode/skills/Browser/**/http:*
.opencode/skills/Browser/**/*#*
```

---

## HIGH: Hardcoded Unix Paths

### Affected Files

| File | Line(s) | Current | Fix |
|------|---------|---------|-----|
| `Browser/Tools/BrowserSession.ts` | 38 | `/tmp/browser-session.json` | `os.tmpdir()` |
| `Browser/Tools/Browse.ts` | 23, 321, 427 | `/tmp/...` | `os.tmpdir()` |
| `Browser/Browser/Tools/*` | (duplicates) | Same | Same |
| `CORE/Tools/SplitAndTranscribe.ts` | - | `/tmp/transcript-...` | `os.tmpdir()` |

### Fix Pattern

```typescript
// Before (Unix only):
const STATE_FILE = '/tmp/browser-session.json'

// After (cross-platform):
import { tmpdir } from 'os'
import path from 'path'
const STATE_FILE = path.join(tmpdir(), 'browser-session.json')
```

---

## HIGH: Home Directory Detection

### Affected Files

  - Installer engine: `PAI-Install/engine/actions.ts`, `PAI-Install/engine/steps-fresh.ts`, `PAI-Install/engine/steps-migrate.ts`
  - CLI entrypoint: `PAI-Install/cli/quick-install.ts`
- `Telos/Tools/UpdateTelos.ts`
- `CORE/Tools/Banner*.ts`
- `CORE/Tools/FeatureRegistry.ts`
- `CORE/Tools/LearningPatternSynthesis.ts`

### Fix Pattern

```typescript
// Before (Unix only):
const HOME = process.env.HOME!

// After (cross-platform):
import { homedir } from 'os'
const HOME = homedir()
```

---

## MEDIUM: Shell Configuration

### Problem

Installer code assumes `process.env.SHELL` is set and may modify `.bashrc`/`.zshrc`.

### Fix Pattern

```typescript
import { homedir } from 'os'
import path from 'path'

const platform = process.platform

function getShellConfig(): string | null {
  const HOME = homedir()

  if (platform === 'win32') {
    // Windows: Return null, use environment variables instead
    // Or target PowerShell profile:
    // return path.join(HOME, 'Documents', 'PowerShell', 'profile.ps1')
    return null
  } else if (platform === 'darwin') {
    return path.join(HOME, '.zshrc')
  } else {
    // Linux: Check SHELL env
    const shell = process.env.SHELL || ''
    return path.join(HOME, shell.includes('zsh') ? '.zshrc' : '.bashrc')
  }
}
```

---

## MEDIUM: Symlink Alternative

### Problem

`INSTALL.md` uses `ln -s` which requires admin/Developer Mode on Windows.

### Fix

Provide copy-based alternative:
```bash
# Unix:
ln -s $(pwd)/.opencode ~/.opencode

# Windows (PowerShell):
Copy-Item -Recurse -Force .\.opencode $env:USERPROFILE\.opencode

# Or create junction (no admin required):
cmd /c mklink /J %USERPROFILE%\.opencode .\.opencode
```

---

## WSL Compatibility

### Status: WORKS (with caveats)

PAI-OpenCode works in WSL2 because it provides full Linux filesystem semantics.

### Important Caveat

**Clone INSIDE WSL filesystem, NOT in /mnt/c/**

```bash
# WRONG (will fail due to Windows filesystem):
cd /mnt/c/Users/YourName/Projects
git clone https://github.com/Steffen025/pai-opencode.git

# CORRECT:
cd ~
git clone https://github.com/Steffen025/pai-opencode.git
```

### WSL Installation Guide

```bash
# 1. Open WSL
wsl

# 2. Navigate to WSL home (NOT /mnt/c/)
cd ~

# 3. Clone repository
git clone https://github.com/Steffen025/pai-opencode.git
cd pai-opencode

# 4. Install Bun if not present
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# 5. Run installer
bash PAI-Install/install.sh --preset zen --name "Your Name" --ai-name "Jeremy"
```

---

## OpenCode Upstream Status

**Reference:** [OpenCode Windows Support Issue #631](https://github.com/anomalyco/opencode/issues/631)

OpenCode (the base tool) has known Windows issues:
- 23 tracked problems, only 10 resolved
- Text input issues in PowerShell
- Bun macro crashes
- Missing tool dependencies

**Implication:** Some issues may be upstream and outside our control. WSL remains the recommended path for Windows users until OpenCode improves native Windows support.

---

## Implementation Checklist

### Phase 1: BLOCKER Fix
- [ ] Remove URL cache files from git history
- [ ] Add `.gitignore` rules for Browser caches
- [ ] Test clone on Windows

### Phase 2: Path Fixes
- [ ] Replace `/tmp` with `os.tmpdir()` in all files
- [ ] Replace `process.env.HOME` with `os.homedir()` in all files
- [ ] Update tilde (`~`) expansions

### Phase 3: Platform Detection
- [ ] Ensure installer + tools avoid hardcoded Unix-only paths
- [ ] Create Windows-specific shell configuration logic
- [ ] Add symlink alternative for Windows

### Phase 4: Documentation
- [ ] Update `INSTALL.md` with Windows/WSL sections
- [ ] Create troubleshooting guide for Windows users
- [ ] Add platform badges to README

### Phase 5: Testing
- [ ] Test clone on Windows 10/11
- [ ] Test full installation in WSL2
- [ ] Test core functionality on each platform

---

## Testing Matrix

| Test | Windows Native | WSL2 | macOS | Linux |
|------|----------------|------|-------|-------|
| git clone | ❌ BLOCKED | ⏳ | ✅ | ✅ |
| Installer (CLI) | ⏳ | ⏳ | ✅ | ✅ |
| Browser skill | ⏳ | ⏳ | ✅ | ✅ |
| CORE skill | ⏳ | ⏳ | ✅ | ✅ |
| Art skill | ⏳ | ⏳ | ✅ | ✅ |

---

## References

- [GitHub Issue #5](https://github.com/Steffen025/pai-opencode/issues/5) - Original bug report
- [OpenCode Windows Issue #631](https://github.com/anomalyco/opencode/issues/631) - Upstream tracking
- [Bun Windows Support](https://bun.sh/docs/installation) - Runtime compatibility
- [Node.js path module](https://nodejs.org/api/path.html) - Cross-platform path handling
- [Node.js os module](https://nodejs.org/api/os.html) - Cross-platform OS utilities

---

*Document created: 2026-01-25*
*Branch: feature/windows-multiplatform-support*
