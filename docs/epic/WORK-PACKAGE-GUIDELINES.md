# PAI-OpenCode Work Package Guidelines

**Version:** 1.0  
**Date:** 2026-03-05  
**Based on:** WP3 Implementation Experience  
**Applies to:** All future Work Packages (WP4+)

---

## 1. Skill Architecture Philosophy

### Core Principle: Hybrid Discovery System

PAI-OpenCode uses a **hybrid approach** that combines:

1. **Category-Level Skills** - For broad capability areas (e.g., Security/, Media/)
2. **Sub-Skill Access** - For direct access to specific capabilities (e.g., OSINT/, Art/)
3. **Flat Skills** - For standalone capabilities (e.g., Research/, Council/)

### Why This Approach?

**Upstream PAI 4.0.3** uses **pure category structure** - only categories exist at the root level, and the category SKILL.md routes to sub-skills via "Workflow Routing" tables.

**PAI-OpenCode Enhancement:** We maintain **both patterns**:
- ✅ Category routing (PAI 4.0.3 compatible)
- ✅ Direct sub-skill access (flexible discovery)
- ✅ Backward compatibility (existing paths still work)

---

## 2. MINIMAL_BOOTSTRAP.md Strategy

### Discovery Registry Requirements

The `MINIMAL_BOOTSTRAP.md` file MUST include:

| Entry Type | Purpose | Example |
|------------|---------|---------|
| **Categories** | Route to category-level SKILL.md | `ContentAnalysis/`, `Security/` |
| **Sub-Skills** | Direct access to nested skills | `Investigation/OSINT/`, `Media/Art/` |
| **Flat Skills** | Standalone skills at root | `Research/`, `Council/`, `Fabric/` |

### Why Both Categories AND Sub-Skills?

```
User says: "OSINT"
→ MINIMAL_BOOTSTRAP routes to: skills/Investigation/OSINT/SKILL.md
→ Direct access, no indirection

User says: "Security"  
→ MINIMAL_BOOTSTRAP routes to: skills/Security/SKILL.md
→ Category routes to: Recon/, WebAssessment/, etc.
```

**Benefits:**
- ✅ Users can access skills directly by name
- ✅ Users can discover via categories
- ✅ No skills become "undiscoverable"
- ✅ Backward compatible with existing workflows

---

## 3. Category Structure Template

### Category SKILL.md Format

```markdown
---
name: CategoryName
description: What this category does. USE WHEN triggers, keywords, use cases.
---

# CategoryName - Brief Description

**Category for skills that...**

## Skills in This Category

| Skill | Purpose | Trigger |
|-------|---------|---------|
| **Skill1** | What it does | "trigger1", "trigger2" |
| **Skill2** | What it does | "trigger3", "trigger4" |

## When to Use

- Use case 1
- Use case 2

## Category Philosophy

Why these skills are grouped together.

## Customization

**Before executing, check for user customizations at:**
`~/.opencode/skills/PAI/USER/SKILLCUSTOMIZATIONS/CategoryName/`
```

### Key Differences from PAI 4.0.3

| Element | PAI 4.0.3 (Upstream) | PAI-OpenCode (Our Style) |
|---------|---------------------|--------------------------|
| Routing | "Workflow Routing" table | "Skills in This Category" table |
| Philosophy | Not present | Present (explains grouping) |
| Customization | Not at category level | Present at category level |
| Triggers | Extensive list in description | Balanced list |

**Both are valid** - our style adds context for maintainers.

---

## 4. Work Package Implementation Checklist

### Pre-Implementation

- [ ] **Identify scope:** Which categories/skills from PAI 4.0.3 reference?
- [ ] **Check current state:** `ls .opencode/skills/` to see what exists
- [ ] **Verify upstream structure:** Check PAI 4.0.3 for reference pattern
- [ ] **Decide on hybrid approach:** Which sub-skills need direct access?

### Implementation

- [ ] **Create category directories** using `mkdir -p`
- [ ] **Move skills** using `mv` (preserves files, then git tracks as rename)
- [ ] **Create category SKILL.md** with frontmatter and routing table
- [ ] **Update MINIMAL_BOOTSTRAP.md:**
  - Add category entry
  - Add sub-skill entries (for direct access)
  - Keep flat skills that aren't being categorized
- [ ] **Update internal references:** Search for old paths, update to new

### Post-Implementation

- [ ] **Verify git tracking:** `git status` should show renames, not delete/add
- [ ] **Test skill discovery:** `grep -r "name: SkillName" .opencode/skills/`
- [ ] **Commit with descriptive message:** Include stats (categories, skills, files)
- [ ] **Wait for CodeRabbit review:** Address real issues, question hallucinations

---

## 5. Path Reference Update Strategy

### Files That Typically Need Updates

When moving skills, check these files for path references:

1. **MINIMAL_BOOTSTRAP.md** - Discovery registry (ALWAYS update)
2. **Skill internal references** - Tools, workflows within moved skills
3. **Cross-skill references** - Other skills referencing the moved skill
4. **Documentation** - Any .md files mentioning paths

### Search Pattern

```bash
# Find references to old paths
grep -r "skills/OldSkillName/" .opencode/ --include="*.md" --include="*.ts"

# Update all occurrences systematically
# Use sed or manual edit with replaceAll
```

### Common Patterns to Update

| Old Path | New Path |
|----------|----------|
| `skills/Recon/` | `skills/Security/Recon/` |
| `skills/Apify/` | `skills/Scraping/Apify/` |
| `skills/Art/` | `skills/Media/Art/` |

---

## 6. CodeRabbit Review Strategy

### Real Issues vs Hallucinations

**Real Issues (Fix These):**
- ✅ Typos in files counts or statistics
- ✅ Grammar errors ("Open source" → "Open-source")
- ✅ Missing path updates (broken references)
- ✅ Code fence annotations (MD040)
- ✅ PII in documentation (local paths)
- ✅ Duplicate content blocks

**Likely Hallucinations (Verify Against PAI 4.0.3):**
- ⚠️ "MANDATORY/OPTIONAL sections required" - Verify in PAI 4.0.3 first
- ⚠️ "YAML frontmatter required" - Verify in PAI 4.0.3 first  
- ⚠️ "Mermaid diagrams required" - Verify if required or nice-to-have
- ⚠️ "Strict formatting requirements" - Always check reference first

### Response Protocol

1. **Verify against PAI 4.0.3** - Does the reference have it?
2. **If reference doesn't have it** - Verify if it's a legitimate requirement or PAI-OpenCode specific
3. **If legitimate for PAI-OpenCode** - Consider implementing
4. **If not in reference and not needed** - Document why not fixing
4. **If unsure** - Document in commit message, proceed cautiously

---

## 7. WP3 Learnings Applied

### What Worked Well

✅ **Hybrid approach** - Categories + sub-skill access  
✅ **Incremental implementation** - WP3-A, then WP3-B, then review  
✅ **Git rename tracking** - All moves tracked as renames (history preserved)  
✅ **Comprehensive MINIMAL_BOOTSTRAP.md** - Both categories and sub-skills listed  

### What to Improve

⚠️ **Update paths more thoroughly** - Some internal references still had old paths  
⚠️ **Document scope decisions** - Why Research/ was skipped (single skill)  
⚠️ **Validate against reference earlier** - Prevents unnecessary rework  

### Metrics to Track

| Metric | WP3 Target | WP3 Actual |
|--------|------------|------------|
| Categories | 11 (all) | **10 (A + B + C)** |
| Skills moved | ~25 | **32** |
| Files changed | ~300 | **881** |
| Commits | 3 planned | **10** |
| Review cycles | 3 | **3** |

---

## 8. Future WP Guidelines

### WP4 (If Needed)

**Remaining categories from PAI 4.0.3:**
- Thinking/ (BeCreative, Council, FirstPrinciples, Fabric, RedTeam, etc.)
- Utilities/ (CreateCLI, CreateSkill, Documents, PAI, System, etc.)

**Recommendation:** Do as separate WP or skip if not critical.

### General Principles

1. **Match PAI 4.0.3 structure** - Directory layout should mirror reference
2. **Enhance with context** - Our SKILL.md format adds helpful context
3. **Maintain discovery** - MINIMAL_BOOTSTRAP.md is critical for skill routing
4. **Preserve history** - Git renames, not delete/create
5. **Document decisions** - Why certain choices were made

---

## 9. Quick Reference: Common Commands

```bash
# Create category and move skills
mkdir -p .opencode/skills/CategoryName
git mv .opencode/skills/SkillName .opencode/skills/CategoryName/

# Find path references that need updating
grep -r "skills/OldName/" .opencode/ --include="*.md" --include="*.ts"

# Verify git is tracking as renames
git status  # Should show "renamed" not "deleted"/"new file"

# Stage and commit
git add .
git commit -m "feat(wpX): Description

- Category: X skills
- Stats: Y files changed
- Notes: Any important details"
```

---

## 10. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-05 | Hybrid discovery (categories + sub-skills) | Allows both category routing and direct access |
| 2026-03-05 | Skip Research/ category | Single skill, already functional as flat |
| 2026-03-05 | Extensive MINIMAL_BOOTSTRAP.md | Prevents skills becoming undiscoverable |
| 2026-03-05 | Ignore MANDATORY/OPTIONAL requirements | Not present in PAI 4.0.3 reference |

---

*Document version: 1.0*  
*Based on: WP3 implementation experience*  
*Validated against: PAI 4.0.3 reference*
