# PAI 2.4 to PAI-OpenCode Mapping Guide

**Version:** 1.0
**Created:** 2026-01-24
**Purpose:** Reference document for correctly importing PAI 2.4 components into PAI-OpenCode

---

## Executive Summary

PAI-OpenCode is a vanilla PAI 2.4 implementation adapted for OpenCode's architecture. This document defines the mapping rules between Daniel Miessler's PAI 2.4 structure and PAI-OpenCode's conventions.

---

## Architecture Comparison

| Aspect | PAI 2.4 (Claude Code) | PAI-OpenCode |
|--------|----------------------|--------------|
| **Root Directory** | `.claude/` | `.opencode/` |
| **Lifecycle Events** | `hooks/*.hook.ts` | `plugins/handlers/*.ts` |
| **Config Schema** | Claude Code settings.json | OpenCode settings.json |
| **Meta File** | `CLAUDE.md` | `OPENCODE.md` |
| **Path Variable** | `$PAI_DIR` → `~/.claude` | `$PAI_DIR` → `.opencode` |

---

## Component Mapping Rules

### 1. Skills (1:1 Mapping)

**Rule:** Direct copy, no structural changes.

```
PAI 2.4:        .claude/skills/{SkillName}/
PAI-OpenCode:   .opencode/skills/{SkillName}/

Structure preserved:
├── SKILL.md              # Required: Skill definition
├── Workflows/            # Optional: Markdown workflows
├── Tools/                # Optional: TypeScript tools
├── Data/                 # Optional: YAML/JSON data
└── README.md             # Optional: Documentation
```

**⚠️ CRITICAL:** Never create nested `SkillName/SkillName/` structures. That pattern is only for distribution Packs, not installed skills.

### 2. Agents (1:1 Mapping)

**Rule:** Direct copy, adjust color format for OpenCode.

```
PAI 2.4:        .claude/agents/*.md
PAI-OpenCode:   .opencode/agents/*.md
```

**OpenCode Requirement:** Colors must be hex format (`#00FFFF`), not names (`cyan`).

### 3. Hooks → Plugins (Architectural Adaptation)

**Rule:** Rewrite hooks as OpenCode plugin handlers.

| PAI 2.4 Hook | PAI-OpenCode Handler | Event |
|--------------|---------------------|-------|
| `LoadContext.hook.ts` | `context-loader.ts` | SessionStart |
| `SecurityValidator.hook.ts` | `security-validator.ts` | PreToolUse |
| `AgentOutputCapture.hook.ts` | `agent-capture.ts` | SubagentStop |
| `ExplicitRatingCapture.hook.ts` | `rating-capture.ts` | UserPromptSubmit |
| `WorkCompletionLearning.hook.ts` | `learning-capture.ts` | SessionEnd |
| `AutoWorkCreation.hook.ts` | `work-tracker.ts` | UserPromptSubmit |

**Plugin Structure:**
```
.opencode/plugins/
├── pai-unified.ts          # Main orchestrator
├── handlers/               # Event handlers
│   ├── context-loader.ts
│   ├── security-validator.ts
│   └── ...
└── lib/                    # Shared utilities
    ├── paths.ts
    ├── identity.ts
    └── ...
```

### 4. CORE Skill (Special Handling)

**Rule:** CORE skill has sub-structures that must be preserved.

```
.opencode/skills/CORE/
├── SKILL.md                # The Algorithm + Core Instructions
├── SYSTEM/                 # System documentation (updatable)
│   ├── PAISYSTEMARCHITECTURE.md
│   ├── SKILLSYSTEM.md
│   ├── THEHOOKSYSTEM.md → THEPLUGINSYSTEM.md (renamed)
│   └── ...
├── USER/                   # User customization (never overwrite)
│   ├── TELOS/
│   ├── SKILLCUSTOMIZATIONS/
│   └── ...
├── Tools/                  # TypeScript utilities
└── Workflows/              # Workflow guides
```

**Path References:** Replace all `~/.claude/` with `.opencode/` in documentation.

### 5. MEMORY (1:1 Mapping)

**Rule:** Direct copy, same subdirectory structure.

```
.opencode/MEMORY/
├── LEARNING/
│   └── ALGORITHM/
├── SECURITY/
├── STATE/
├── VOICE/
└── WORK/
```

### 6. Fabric Patterns (1:1 Mapping)

**Rule:** Copy to `skills/Fabric/Patterns/` ONLY. Never duplicate elsewhere.

```
PAI 2.4:        .claude/skills/Fabric/Patterns/
PAI-OpenCode:   .opencode/skills/Fabric/Patterns/

⚠️ DO NOT copy to CORE/Tools/fabric/ - that creates duplicates!
```

---

## What NOT to Import

These PAI 2.4 components are not applicable to OpenCode:

| Component | Reason |
|-----------|--------|
| `Observability/` | Vue dashboard - not ported |
| `VoiceServer/` | macOS voice server - not ported |
| `lib/migration/` | PAI version migration tools |
| `PAIInstallWizard.ts` | Claude Code specific installer |
| `statusline-command.sh` | Terminal statusline integration |
| `settings.json` hooks section | Different plugin architecture |

---

## OpenCode-Specific Additions

These exist in PAI-OpenCode but not in PAI 2.4:

| Component | Purpose |
|-----------|---------|
| `plugins/` | OpenCode plugin system |
| `profiles/` | API provider profiles (anthropic, openai, local) |
| `PAISECURITYSYSTEM/` | Security documentation (moved from CORE/SYSTEM) |
| `package.json` | Bun dependencies |
| `tsconfig.json` | TypeScript configuration |

---

## Import Checklist

When importing a new PAI version:

### Pre-Import
- [ ] Read PAI release notes for structural changes
- [ ] Compare skill counts (should match)
- [ ] Check for new skills to add
- [ ] Check for removed/renamed skills

### During Import
- [ ] Copy skills maintaining flat structure (no nesting)
- [ ] Copy agents, convert color names to hex
- [ ] Review hook changes, update plugin handlers
- [ ] Update CORE/SYSTEM docs with new content
- [ ] Preserve CORE/USER (never overwrite)

### Post-Import
- [ ] Verify SKILL.md count matches
- [ ] Check for duplicate Fabric patterns
- [ ] Test OpenCode startup (no ConfigFrontmatterError)
- [ ] Run skill search to verify all skills load
- [ ] Update version in documentation

---

## Common Import Errors

### 1. Nested SKILL.md Files
**Error:** `ConfigFrontmatterError: Failed to parse YAML frontmatter`
**Cause:** Imported `SkillName/SkillName/SKILL.md` pattern from Packs
**Fix:** Delete inner nested directories, keep only `SkillName/SKILL.md`

### 2. Description Too Long
**Error:** `ConfigFrontmatterError` at high column number
**Cause:** YAML description exceeds ~300 characters
**Fix:** Shorten description to <220 characters

### 3. Invalid Color Format
**Error:** `Invalid hex color format color`
**Cause:** Using color names (`cyan`) instead of hex (`#00FFFF`)
**Fix:** Convert all agent colors to hex format

### 4. Duplicate Fabric Patterns
**Symptom:** Repo size unexpectedly large
**Cause:** Patterns copied to multiple locations
**Fix:** Keep only `skills/Fabric/Patterns/`, remove from `CORE/Tools/`

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-24 | 1.0 | Initial mapping guide created |

---

## References

- PAI 2.4 Source: `github.com/danielmiessler/Personal_AI_Infrastructure`
- PAI-OpenCode: `github.com/Steffen025/pai-opencode`
- OpenCode Plugin API: `@opencode-ai/plugin`

---

*This document should be updated whenever PAI releases a new version.*
