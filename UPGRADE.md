# Upgrading to PAI-OpenCode v3.0

> Migration guide for v2.x users

---

## Overview

PAI-OpenCode v3.0 introduces significant architectural improvements:

- **Plugin Event Bus** — replaces hooks with event-driven architecture
- **Hierarchical Skills** — Category/Skill structure (replaces flat)
- **Model Tiers** — dynamic routing (quick/standard/advanced)
- **Security Layer** — prompt injection protection
- **GUI Installer** — Electron-based visual installation
- **DB Archiving** — automated session management

---

## Before You Start

### 1. Backup Your Data

```bash
# Automatic backup created by migration script
bun Tools/migration-v2-to-v3.ts --dry-run

# Or manual backup
cp -r ~/.opencode ~/.opencode-backup-$(date +%Y%m%d)
```

### 2. Stop OpenCode

Exit all OpenCode sessions before migrating.

---

## Migration Steps

### Step 1: Run Migration Script

```bash
cd /path/to/pai-opencode
bun Tools/migration-v2-to-v3.ts
```

This will:
- Detect your current version (v2.x vs v3.x)
- Create timestamped backup
- Update skill structure (flat → hierarchical)
- Update MINIMAL_BOOTSTRAP.md paths

**Options:**
```bash
--dry-run          # Preview only, no changes
--force            # Skip version check
--backup-dir=/path # Custom backup location
```

### Step 2: Verify Skills

```bash
bun run skills:validate
```

Expected output: `✅ Validation passed!` (0 errors)

### Step 3: Update Configuration

v3.0 uses **dual-file configuration**:

| File | Purpose |
|------|---------|
| `~/.opencode/opencode.json` | OpenCode settings (model tiers, MCP) |
| `~/.opencode/settings.json` | PAI settings (identity, paths) |

The migration script preserves your settings. Verify:

```bash
cat ~/.opencode/opencode.json | grep model_tier
cat ~/.opencode/settings.json | grep daidentity
```

### Step 4: Test OpenCode

```bash
opencode
```

Check that:
- `/db-archive` command works
- Plugin events fire (see [DB-MAINTENANCE.md](/docs/DB-MAINTENANCE.md))
- Skills load correctly

---

## Breaking Changes

### Plugin System (WP-A)

| v2.x | v3.0 |
|------|------|
| Hooks (hook files) | Event bus (plugin handlers) |
| `hook.execute` | `bus.on('tool.execute.before')` |

**Impact:** If you had custom hooks, port them to plugin handlers:

```typescript
// v2.x style (hook)
export default {
  before: async (context) => { /* ... */ }
}

// v3.0 style (plugin handler)
import { bus } from '../lib/bus';
bus.on('tool.execute.before', async (event) => { /* ... */ });
```

### Skills Structure (WP-C)

| v2.x | v3.0 |
|------|------|
| Flat: `skills/SkillName/` | Hierarchical: `skills/Category/SkillName/` |

**Impact:** Skills are now organized by category. The migration script handles this automatically.

**Manual fix if needed:**
```bash
# Example: move flat skill to category
mkdir -p ~/.opencode/skills/CustomCategory/
mv ~/.opencode/skills/MySkill ~/.opencode/skills/CustomCategory/
```

### Configuration Files

| v2.x | v3.0 |
|------|------|
| `CLAUDE.md` | `AGENTS.md` |
| Single config file | Dual: `opencode.json` + `settings.json` |
| `~/.claude/` | `~/.opencode/` |

**Impact:** All paths updated automatically.

---

## Post-Migration Checklist

- [ ] `bun run skills:validate` passes
- [ ] `opencode` starts without errors
- [ ] `/db-archive` shows DB stats
- [ ] Plugin events logged (check `~/.opencode/logs/`)
- [ ] Custom skills still work
- [ ] No `.claude/` references in error messages

---

## Troubleshooting

### "Skills validation failed"

```bash
# Check for nested directories
ls ~/.opencode/skills/Telos/
# Should see: DashboardTemplate, ReportTemplate, SKILL.md
# Should NOT see: Telos/ (nested)

# Fix nested skills
mv ~/.opencode/skills/Telos/Telos/* ~/.opencode/skills/Telos/
rmdir ~/.opencode/skills/Telos/Telos/
```

### "Database locked during migration"

```bash
# 1. Stop all OpenCode processes
# 2. Retry migration
bun Tools/migration-v2-to-v3.ts --force
```

### "Custom skills not found"

Check skill structure:
```bash
# v3.0 requires frontmatter in SKILL.md
head -5 ~/.opencode/skills/CustomCategory/MySkill/SKILL.md
# Should show: --- name: ... description: ... ---
```

---

## Rollback

If migration fails:

```bash
# Restore from backup
cp -r ~/.opencode-backup-YYYYMMDD/* ~/.opencode/

# Or use git (if you track ~/.opencode/)
cd ~/.opencode && git checkout v2.x-branch
```

---

## What's New in v3.0

| Feature | Benefit |
|---------|---------|
| Plugin Event Bus | Cleaner code, better testability |
| Model Tiers | 60x cost optimization (quick/standard/advanced) |
| Prompt Injection Guard | Security against adversarial attacks |
| Electron GUI | Visual installer, no CLI needed |
| DB Archiving | Automated session cleanup |
| Hierarchical Skills | Better organization, lazy loading |

See [CHANGELOG.md](/CHANGELOG.md) for complete list.

---

## Support

- **Issues:** [GitHub Issues](https://github.com/Steffen025/pai-opencode/issues)
- **Documentation:** [docs/](/docs/)
- **DB Maintenance:** [docs/DB-MAINTENANCE.md](/docs/DB-MAINTENANCE.md)

---

*Migration complete? Run `opencode` and enjoy v3.0! 🎉*
