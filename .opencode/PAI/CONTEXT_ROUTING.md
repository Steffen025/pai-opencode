# Context Routing System

> Lazy-loading context routing for PAI-OpenCode v3.0+
> **CRITICAL:** Das Bootstrap enthält einen "Skill Discovery Index" - ohne diesen weiß das System nicht, welche Skills existieren!

## Architecture Overview

**Before (WP1):** 233KB static context loaded at session start
**After (WP2):** ~20KB bootstrap + on-demand skill loading

```
┌─────────────────────────────────────────────────────────────┐
│                    SESSION START                              │
│                     (~20KB load)                              │
├─────────────────────────────────────────────────────────────┤
│  MINIMAL_BOOTSTRAP.md                                       │
│  ├── Algorithm Core (OBSERVE→LEARN)                         │
│  ├── System Steering Rules                                  │
│  ├── User Identity (if exists)                              │
│  └── SKILL DISCOVERY INDEX ⬅️ Wichtig!                       │
│      (Liste aller Skills mit Triggern)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (on-demand via Trigger-Erkennung)
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

## Warum Skill Discovery Index im Bootstrap?

**Problem:** Wenn das System nicht weiß, dass es z.B. "Research" oder "Agents" gibt, kann es diese Skills nicht nachladen!

**Lösung:** Der Bootstrap enthält eine kompakte Registry aller verfügbaren Skills mit:
- Skill-Name
- Trigger-Wörter (wann laden)
- Pfad zur SKILL.md

## Loading Strategies

### 1. Bootstrap Loading (Immediate)

Loaded at every session start:

| File | Size | Purpose |
|------|------|---------|
| `MINIMAL_BOOTSTRAP.md` | ~5KB | Algorithm + Steering Rules + Skill Discovery |
| System AISTEERINGRULES.md | ~2KB | Verhaltensregeln (wenn vorhanden) |
| User Identity | ~3-8KB | ABOUTME, TELOS, DAIDENTITY (wenn vorhanden) |
| **Total** | **~10-15KB** | Minimal Nützlich |

### 2. Skill Discovery & Loading (On-Demand)

**Schritt 1: Trigger-Erkennung**
```typescript
// User Input: "Research this topic for me"
// ↓
// Pattern-Match gegen Skill Discovery Index
// ↓
// Trigger "Research" gefunden → Lade Research Skill
```

**Schritt 2: Skill nachladen**
```typescript
// Find a skill by name (aus Discovery Index bekannt)
const skill = await skill_find("Research");

// Use the skill (loads its full SKILL.md)
await skill_use(skill.id);
```

### 3. Lazy Loading Trigger-Beispiele

| User sagt | Skill geladen | Trigger-Wort |
|-----------|--------------|--------------|
| "Research this topic" | Research | "Research" |
| "Agents discuss this" | Agents | "Agents" |
| "Use Council" | Council | "Council" |
| "Build CLI tool" | CreateCLI | "CLI" |
| "Security scan" | WebAssessment | "Security" |

## Skill Discovery Index im Bootstrap

Der Bootstrap enthält eine kompakte Tabelle:

```markdown
| Skill | Trigger | Pfad |
|-------|---------|------|
| Research | "Research", "investigate" | skills/Research/SKILL.md |
| Agents | "Agents", "spawn agent" | skills/Agents/SKILL.md |
| Council | "Council", "debate" | skills/Council/SKILL.md |
| ... | ... | ... |
```

**Vorteile:**
- ✅ System weiß, welche Skills existieren
- ✅ Pattern-Matching gegen User-Input möglich
- ✅ Lazy Loading funktioniert
- ✅ Keine 233KB statische Loading nötig

## Migration from WP1

### Was sich geändert hat

| Vorher | Nachher |
|--------|---------|
| 233KB alles geladen | ~15KB Bootstrap + Lazy Loading |
| Kein Discovery-Mechanismus | Skill Discovery Index im Bootstrap |
| Skills immer da | Skills nur bei Bedarf geladen |

### Was im Bootstrap bleibt (Minimal Nützlich)

1. **Algorithm Core** - Wie PAI funktioniert
2. **System Steering Rules** - Verhaltensregeln
3. **User Identity** - Wer der User ist (wenn vorhanden)
4. **Skill Discovery Index** - Welche Skills gibt es

### Was Lazy-Loaded wird

- Einzelne Skills (nur wenn Trigger erkannt)
- System-Dokumente (MemorySystem, HookSystem, etc.)
- Projekt-spezifische Kontexte
const researchSkill = await skill_find("Research");

// Use the skill (loads its context)
await skill_use(researchSkill.id);
```

Skills are discovered from `.opencode/skills/<name>/SKILL.md`.

### 3. User Context Loading (On-Demand)

User personal context loads when referenced:

| Context Type | Trigger | Source |
|--------------|---------|--------|
| TELOS (goals, mission) | "My goals", "life purpose" | `PAI/USER/TELOS/TELOS.md` |
| ABOUTME (background) | "As you know about me..." | `PAI/USER/ABOUTME.md` |
| DAIDENTITY (AI config) | "Jeremy", "your name" | `PAI/USER/DAIDENTITY.md` |

## Migration from WP1

### What Changed

| Component | WP1 | WP2 |
|-----------|-----|-----|
| context-loader.ts | ✅ Existed | ❌ Removed |
| Static 233KB load | ✅ Loaded | ❌ No longer loaded |
| skill_find/skill_use | ❌ Not used | ✅ Primary method |
| Bootstrap size | ~214KB | ~20KB |

### Files Deleted

- `.opencode/plugins/handlers/context-loader.ts`
- Related bulk loading utilities

### Files Created

- `.opencode/PAI/MINIMAL_BOOTSTRAP.md`
- `.opencode/PAI/CONTEXT_ROUTING.md` (this file)

## Skill Discovery

OpenCode automatically discovers skills:

```
.opencode/skills/
├── Research/
│   └── SKILL.md
├── Agents/
│   └── SKILL.md
└── CreateCLI/
    └── SKILL.md
```

Each skill's `SKILL.md` contains its full documentation and triggers.

## Caching

Loaded skills are cached for the session duration:

```typescript
// First call loads from disk
await skill_use("Research");  // Loads SKILL.md

// Second call uses cached version
await skill_use("Research");  // Uses cache
```

## Error Handling

When a skill is not found:

```typescript
try {
  const skill = await skill_find("NonExistent");
  if (!skill) {
    // Skill not found - provide helpful error
    log("Skill 'NonExistent' not found. Available skills:");
    // List available skills
  }
} catch (error) {
  // Handle error gracefully
}
```

## Best Practices

1. **Don't preload**: Let skills load on-demand
2. **Reference bootstrap**: Use MINIMAL_BOOTSTRAP.md as the foundation
3. **Skill triggers**: Each skill defines its USE WHEN triggers
4. **Lazy user context**: Load personal context only when referenced
5. **Session cache**: Already-loaded skills persist for the session

## Verification

Check lazy loading is working:

```bash
# 1. Bootstrap should be <25KB
wc -c .opencode/PAI/MINIMAL_BOOTSTRAP.md

# 2. No context-loader.ts
ls .opencode/plugins/handlers/context-loader.ts  # Should fail

# 3. Skill tool available
# (Verified by OpenCode environment)
```

---

*Part of PAI-OpenCode v3.0 Context Modernization (WP2)*
