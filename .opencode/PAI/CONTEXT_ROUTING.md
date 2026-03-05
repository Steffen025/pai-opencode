# Context Routing System

> Lazy-loading context routing for PAI-OpenCode v3.0+
> **CRITICAL:** The bootstrap contains a "Skill Discovery Index" - without it the system doesn't know which skills exist!

## Architecture Overview

**Before (WP1):** 233KB static context loaded at session start  
**After (WP2):** ~7KB bootstrap-only + on-demand skill loading (or ~12-17KB with User Identity + System Rules)

```text
┌─────────────────────────────────────────────────────────────┐
│                    SESSION START                              │
│                     (~7KB load)                               │
├─────────────────────────────────────────────────────────────┤
│  MINIMAL_BOOTSTRAP.md                                       │
│  ├── Algorithm Core (OBSERVE→LEARN)                         │
│  ├── System Steering Rules                                  │
│  ├── User Identity (if exists)                              │
│  └── SKILL DISCOVERY INDEX ⭐️ IMPORTANT!                     │
│      (List of all skills with triggers)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (on-demand via trigger detection)
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   ┌─────────┐          ┌─────────┐          ┌─────────┐
   │  Skill  │          │  Skill  │          │  Skill  │
   │Research │          │ Agents  │          │ Council │
   └─────────┘          └─────────┘          └─────────┘
        │                     │                     │
        ▼                     ▼                     ▼
   SKILL.md             SKILL.md             SKILL.md
```

## Why Skill Discovery Index in Bootstrap?

**Problem:** If the system doesn't know that e.g. "Research" or "Agents" exist, it cannot load these skills!

**Solution:** The bootstrap contains a compact registry of all available skills with:
- Skill name
- Trigger words (when to load)
- Path to SKILL.md

## Loading Strategies

### 1. Bootstrap Loading (Immediate)

Loaded at every session start:

| File | Size | Purpose |
|------|------|---------|
| `MINIMAL_BOOTSTRAP.md` | ~7KB | Algorithm **Essence** + Steering Rules + Skill Discovery |
| System AISTEERINGRULES.md | ~2KB | Behavior rules (if exists) |
| User Identity | ~3-8KB | ABOUTME, TELOS, DAIDENTITY (if exists) |
| **Total** | **~12-17KB** | Minimal Useful |

**Note:** The Algorithm essence covers 95% of use cases. For Extended/Advanced/Deep effort requiring detailed ISC decomposition, the full Algorithm v3.7.0 (383 lines) loads on-demand via `skill_find("Algorithm")` or by reading `.opencode/PAI/Algorithm/v3.7.0.md`.

### 2. Skill Discovery & Loading (On-Demand)

**Step 1: Trigger Detection**
```typescript
// User Input: "Research this topic for me"
// ↓
// Pattern-match against Skill Discovery Index
// ↓
// Trigger "Research" found → Load Research Skill
```

**Step 2: Load skill**
```typescript
// Find a skill by name (known from Discovery Index)
const skill = await skill_find("Research");

// Use the skill (loads its full SKILL.md)
// Note: skill_use expects the skill name, not ID
await skill_use(skill.name);
```

### 3. Lazy Loading Trigger Examples

| User says | Skill loaded | Trigger word |
|-----------|--------------|--------------|
| "Research this topic" | Research | "Research" |
| "Agents discuss this" | Agents | "Agents" |
| "Use Council" | Council | "Council" |
| "Build CLI tool" | CreateCLI | "CLI" |
| "Security scan" | WebAssessment | "Security" |

## Skill Discovery Index in Bootstrap

The bootstrap contains a compact table:

```markdown
| Skill | Trigger | Path |
|-------|---------|------|
| Research | "Research", "investigate" | skills/Research/SKILL.md |
| Agents | "Agents", "spawn agent" | skills/Agents/SKILL.md |
| Council | "Council", "debate" | skills/Council/SKILL.md |
| ... | ... | ... |
```

**Benefits:**
- ✅ System knows which skills exist
- ✅ Pattern-matching against user input possible
- ✅ Lazy loading works
- ✅ No 233KB static loading needed

## Migration from WP1

### What changed

| Before | After |
|--------|-------|
| 233KB everything loaded | ~7KB bootstrap + Lazy Loading |
| No discovery mechanism | Skill Discovery Index in bootstrap |
| Skills always there | Skills only loaded when needed |

### What stays in bootstrap (Minimal Useful)

1. **Algorithm Core** - How PAI works
2. **System Steering Rules** - Behavior rules
3. **User Identity** - Who the user is (if exists)
4. **Skill Discovery Index** - Which skills exist

### What gets Lazy-Loaded

- Individual skills (only when trigger recognized)
- System docs (MemorySystem, HookSystem, etc.)
- Project-specific contexts

---

## OpenCode Platform Notes

**CRITICAL: Bash workdir Parameter**

OpenCode's `bash()` tool spawns a **NEW shell process** for each call. The `cd` command has **NO persistent effect** across tool invocations.

```typescript
// WRONG — cd has no effect on next command
bash({ command: "cd /path/to/repo" })
bash({ command: "git status" })  // Runs in Instance.directory, NOT /path/to/repo!

// CORRECT — explicit workdir
bash({ 
  command: "git status", 
  workdir: "/path/to/repo" 
})
```

**The Rule:** When working OUTSIDE Instance.directory:
1. NEVER use `cd` expecting it to persist
2. ALWAYS use `workdir` parameter for the target directory
3. Each bash call is INDEPENDENT — no state carries over

**Full Platform Guide:** See `docs/PLATFORM-DIFFERENCES.md` for comprehensive Claude Code vs OpenCode differences.

---

*Part of PAI-OpenCode v3.0 Context Modernization (WP2)*
