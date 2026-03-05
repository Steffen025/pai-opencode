# WP4 Implementation Plan: Integration, Validation & Plugin Updates

**Date:** 2026-03-05  
**Branch:** `feature/wp4-integration`  
**Base:** `dev` (after WP3 merge)  
**Duration:** 8-12 hours  
**Status:** Planning

---

## 🎯 Goal

Ensure WP3's hierarchical skill structure actually WORKS in practice. Update all integration points, validate the system, and fix any issues discovered.

---

## 📊 Scope

| Component | Current State | WP4 Target |
|-----------|---------------|------------|
| **Skill Structure** | ✅ 10 categories, 32 skills organized | Validation & testing |
| **Plugins** | ❌ Untested with new structure | Updated & tested |
| **MINIMAL_BOOTSTRAP.md** | ✅ Updated manually | Auto-generation script |
| **Internal References** | ⚠️ Some may still be broken | Fixed & validated |
| **Skill Discovery** | ✅ Static registry | Validated working |

---

## 🗂️ Implementation Tasks

### Phase 1: Internal Path Reference Audit & Fix

**Duration:** 2-3 hours  
**Critical:** HIGH - Broken paths = broken skills

**Tasks:**
1. [ ] Search for all hardcoded skill paths in the codebase
   ```bash
   grep -r "skills/[A-Z][a-z]*/" .opencode/ --include="*.md" --include="*.ts" | grep -v "skills/Category/"
   ```
2. [ ] Identify broken references (old flat paths that should be new hierarchical)
3. [ ] Fix critical paths in:
   - [ ] `.opencode/skills/*/SKILL.md` internal tool references
   - [ ] `.opencode/skills/*/Workflows/*.md` workflow references
   - [ ] `.opencode/PAI/*.md` system references
   - [ ] Any plugin references

**Deliverables:**
- List of all broken references found
- Fixed references committed
- Biome validation passing

---

### Phase 2: Plugin System Updates

**Duration:** 3-4 hours  
**Critical:** HIGH - Plugins are the integration layer

**Files to Update:**
- [ ] `.opencode/plugins/pai-unified.ts` - Main plugin
  - [ ] Update `LoadContext` for hierarchical paths
  - [ ] Add support for category-level context loading
  - [ ] Test with Thinking/ and Utilities/ categories
  
- [ ] `.opencode/plugins/handlers/` - All handlers
  - [ ] SecurityValidator - Update path patterns
  - [ ] ContextInjector - Handle nested skill paths
  - [ ] WorkTracker - Verify skill name extraction
  - [ ] RatingCapture - Ensure capture works with new paths

**Testing:**
```bash
# Test each plugin component
bun test plugins/
```

**Deliverables:**
- Updated plugin files
- Plugin tests passing
- Backwards compatibility verified

---

### Phase 3: Skill Discovery System Enhancement

**Duration:** 2-3 hours  
**Critical:** MEDIUM - Improves maintainability

**Tasks:**
1. [ ] Create `GenerateSkillIndex.ts` enhancement
   - [ ] Parse hierarchical structure
   - [ ] Generate category → skill mappings
   - [ ] Output JSON index for fast lookups
   
2. [ ] Create `ValidateSkillStructure.ts`
   - [ ] Verify all skills have proper frontmatter
   - [ ] Check category SKILL.md files exist
   - [ ] Validate no orphaned skills
   
3. [ ] Add npm scripts
   ```json
   {
     "scripts": {
       "skills:validate": "bun run .opencode/skills/PAI/Tools/ValidateSkillStructure.ts",
       "skills:index": "bun run .opencode/skills/PAI/Tools/GenerateSkillIndex.ts"
     }
   }
   ```

**Deliverables:**
- Enhanced skill tools
- Validation script
- Generated `skill-index.json`

---

### Phase 4: Integration Testing

**Duration:** 2-3 hours  
**Critical:** HIGH - Prove it all works

**Test Scenarios:**
1. [ ] **Category Access Test**
   - Load Security/ category SKILL.md
   - Verify routing to Recon/ works
   - Verify routing to WebAssessment/ works
   
2. [ ] **Sub-Skill Direct Access Test**
   - Load Investigation/OSINT/ directly
   - Verify triggers work
   - Verify workflows accessible
   
3. [ ] **Plugin Integration Test**
   - Run with `plugins/pai-unified.ts`
   - Verify context injection works
   - Check no errors in logs
   
4. [ ] **MINIMAL_BOOTSTRAP.md Test**
   - Verify all 32 skills discoverable
   - Check both category and sub-skill entries work

**Test Commands:**
```bash
# Run validation
bun run skills:validate

# Check structure
tree .opencode/skills/ -L 2

# Count skills
grep -r "^name:" .opencode/skills/*/SKILL.md .opencode/skills/*/*/SKILL.md | wc -l
```

**Deliverables:**
- Test results documented
- Issues found = issues fixed
- Integration report

---

## 📋 Pre-Implementation Checklist

Before starting WP4:

- [ ] WP3 fully merged to `dev`
- [ ] No pending WP3 issues
- [ ] `dev` branch stable
- [ ] Backward compatibility requirements understood

---

## 🔍 Success Criteria

WP4 is complete when:

1. ✅ All internal skill paths resolved correctly
2. ✅ Plugins work with hierarchical structure
3. ✅ Skill discovery works (both category and direct)
4. ✅ Biome check passes (zero errors)
5. ✅ Integration tests pass
6. ✅ Documentation updated

---

## 🚀 Post-WP4: What's Next?

After WP4 is complete:

**WP5: Migration Script & Installer**
- Create `migration-v2-to-v3.ts`
- Port PAI-Install from v4.0.3
- Test upgrade path

**WP6: Documentation & Release Prep**
- Update main README.md
- Create UPGRADE.md guide
- Write release notes
- Final testing

---

## 📝 Notes

**Why WP4 before Migration/Installer?**
- We MUST validate the structure works BEFORE asking users to migrate
- No point in migration script if the target structure is broken
- WP4 is the "does it actually work?" checkpoint

**Risk Mitigation:**
- Keep backwards compatibility layer in plugins
- Test thoroughly before any user-facing changes
- Document any breaking changes

---

*Based on ARCHITECTURE-PLAN.md Phases 6-7*  
*Adapted for post-WP3 state (all categories complete)*
