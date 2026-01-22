# PAI to OpenCode Migration Guide

**Version:** 1.0.0
**Last Updated:** 2026-01-22

This guide explains how to migrate your existing PAI (Claude Code) installation to OpenCode.

---

## Prerequisites

1. **Fresh OpenCode 2.3 Installation** (for selective mode)
   - Clone or install OpenCode 2.3
   - Verify it works: `opencode --version`

2. **Bun Runtime**
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

3. **Your PAI Source Directory**
   - Usually `~/.claude` for Claude Code installations
   - Or your custom PAI directory path

---

## Migration Modes

### Mode 1: Selective Import (RECOMMENDED)

**Best for:** Upgrading to a fresh OpenCode 2.3 while preserving your personal content.

```bash
# 1. Start with a FRESH OpenCode 2.3 installation
# (This is your working foundation - architecture intact)

# 2. Run selective import
bun run Tools/pai-to-opencode-converter.ts \
  --source ~/.claude \
  --target .opencode \
  --mode selective

# 3. Validate
bun run Tools/MigrationValidator.ts --target .opencode
```

**What gets IMPORTED:**
| Category | Path Pattern | Why Import |
|----------|--------------|------------|
| USER content | `skills/CORE/USER/` | Your TELOS, Contacts, personal data |
| MEMORY | `MEMORY/` | All history, work, learning, projects |
| Custom skills | `skills/_*` or not in standard list | Your own skills |
| Secrets | `.env` | API keys |
| Profiles | `profiles/` | Tool configurations |
| Agents | `agents/` | Usually customized |
| MCP Servers | `mcp-servers/` | Custom integrations |

**What gets SKIPPED:**
| Category | Path Pattern | Why Skip |
|----------|--------------|----------|
| SYSTEM files | `skills/CORE/SYSTEM/` | Use fresh 2.3 version |
| Standard skills | `skills/Research/`, etc. | Use fresh 2.3 version |
| Hooks | `hooks/` | Use fresh plugins/ |
| Tools | `Tools/` | Use fresh 2.3 version |
| Packs | `Packs/` | Use fresh 2.3 version |

---

### Mode 2: Full Migration

**Best for:** Creating a complete copy of your PAI installation.

```bash
bun run Tools/pai-to-opencode-converter.ts \
  --source ~/.claude \
  --target .opencode \
  --mode full
```

**Note:** Full mode copies everything. Use this for archiving or when you need an exact copy.

---

## Step-by-Step Guide

### Step 1: Analyze Your Source

```bash
# Check your PAI version and migration support
bun run Tools/pai-to-opencode-converter.ts \
  --source ~/.claude \
  --dry-run \
  --verbose

# Look for:
# - PAI Version detected
# - Migration support level
# - Number of custom skills
# - Hooks that need manual migration
```

### Step 2: Prepare Fresh OpenCode 2.3

```bash
# Option A: Clone from repository
git clone https://github.com/anthropics/opencode.git
cd opencode

# Option B: Use existing installation
# Just make sure .opencode/ is fresh/clean
```

### Step 3: Run Migration

```bash
# Selective mode (recommended)
bun run Tools/pai-to-opencode-converter.ts \
  --source ~/.claude \
  --target .opencode \
  --mode selective

# The converter will:
# 1. Detect your PAI version
# 2. Classify all content (USER/SYSTEM/CUSTOM)
# 3. Import only what's needed
# 4. Skip system files (use fresh 2.3)
# 5. Generate migration report
```

### Step 4: Review Migration Report

```bash
# Check the report
cat .opencode/MIGRATION-REPORT.md

# Look for:
# - Files converted
# - Files skipped
# - Manual work required (hooks)
# - Validation results
```

### Step 5: Manual Hook Migration

If you have custom hooks, they need manual migration to plugins:

```markdown
PAI Hook (Claude Code):
  hooks/security-validator.ts
  - Uses exit code 2 to block

OpenCode Plugin:
  plugins/pai-unified.ts
  - Uses throw Error() to block
  - Args in output.args (not input.args)
```

See `docs/PLUGIN-ARCHITECTURE.md` for detailed guide.

### Step 6: Validate

```bash
# Run validation
bun run Tools/MigrationValidator.ts --target .opencode

# Test OpenCode
cd your-project
opencode
```

---

## Version Compatibility

| PAI Version | Selective Mode | Full Mode | Notes |
|-------------|----------------|-----------|-------|
| **2.3** | ✅ Full | ✅ Full | Best compatibility |
| **2.1-2.2** | ✅ Full | ✅ Full | Works well |
| **2.0** | ⚠️ Partial | ✅ Full | May need pre-migration |
| **1.x** | ❌ None | ❌ None | Start fresh |

### How Version is Detected

```
Has skills/ directory?
├── No → PAI 1.x (not supported)
└── Yes
    ├── Has history/ but no MEMORY/? → PAI 2.0
    └── Has MEMORY/?
        ├── Has USER/SYSTEM separation? → PAI 2.1+
        └── Has Packs/? → PAI 2.3
```

---

## Troubleshooting

### "PAI 1.x is not supported"

PAI 1.x has a completely different architecture. Options:
1. Start fresh with OpenCode 2.3
2. Manually copy relevant content

### "Partial support for PAI 2.0"

PAI 2.0 lacks USER/SYSTEM separation. Options:
1. Use `--mode full` and manually clean up
2. Run PAI 2.0 → 2.1 migrator first (if available)

### "Remaining .claude references"

Some files still reference `.claude` paths:
1. Check `MIGRATION-REPORT.md` for list
2. Manually update paths to `.opencode`
3. Re-run validation

### Hooks not working

Hooks need manual migration to plugins:
1. Read `docs/PLUGIN-ARCHITECTURE.md`
2. Create plugin handlers in `plugins/pai-unified.ts`
3. Key differences:
   - `output.args` not `input.args`
   - `throw Error()` not `exit(2)`
   - File logging, not console

---

## CLI Reference

```bash
bun run Tools/pai-to-opencode-converter.ts [OPTIONS]

OPTIONS:
  --source <path>       Source PAI directory (default: ~/.claude)
  --target <path>       Target OpenCode directory (default: .opencode)
  --mode <mode>         Migration mode: "full" or "selective" (default: full)
  --dry-run             Show what would be done without making changes
  --backup              Create backup before conversion (default: true)
  --no-backup           Skip backup creation
  --skip-validation     Skip MigrationValidator after conversion
  --skip-gates          Auto-approve all validation gates (no prompts)
  --verbose             Show detailed output
  --help                Show this help message
```

---

## Quick Reference

### For Upgrading (Most Common)

```bash
# You have: Existing PAI with personal content
# You want: Fresh OpenCode 2.3 + your content

bun run Tools/pai-to-opencode-converter.ts \
  --source ~/.claude \
  --target .opencode \
  --mode selective
```

### For Fresh Start

```bash
# You want: Copy everything as-is

bun run Tools/pai-to-opencode-converter.ts \
  --source ~/.claude \
  --target .opencode \
  --mode full
```

### For Preview Only

```bash
# You want: See what would happen

bun run Tools/pai-to-opencode-converter.ts \
  --source ~/.claude \
  --target .opencode \
  --mode selective \
  --dry-run \
  --verbose
```

---

## Support

- **Documentation:** `docs/`
- **Issues:** GitHub Issues
- **Plugin Guide:** `docs/PLUGIN-ARCHITECTURE.md`
- **Event Mapping:** `docs/EVENT-MAPPING.md`

---

*Generated by PAI-OpenCode Converter v1.0.0*
