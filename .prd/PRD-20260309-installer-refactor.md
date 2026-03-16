---
prd: true
id: PRD-20260309-installer-refactor
status: IN_PROGRESS
mode: interactive
effort_level: Extended
created: 2026-03-09
updated: 2026-03-09
iteration: 0
maxIterations: 1
loopStatus: null
last_phase: PLAN
failing_criteria: []
verification_summary: "0/17"
parent: null
children: []
---

# PAI-OpenCode Installer Refactor Implementation

> Implement installer refactoring per docs/architecture/INSTALLER-REFACTOR-PLAN.md
> Branch: feature/wp-e-installer-refactor
> Target: PR #48

## STATUS

| What | State |
|------|-------|
| Progress | 0/17 criteria passing |
| Phase | PLAN → BUILD |
| Next action | Create feature branch, implement engine files |
| Blocked by | None |

## CONTEXT

### Problem Space
Current installer has 4 entry points causing user confusion. Need ONE unified Electron GUI with auto-detection for fresh/migrate/update modes. Must integrate wrapper system from reference implementation.

### Key Files
- `PAI-Install/engine/build-opencode.ts` — Build OpenCode binary (NEW)
- `PAI-Install/engine/migrate.ts` — v2→v3 migration (NEW)
- `PAI-Install/engine/update.ts` — v3→v3.x updates (NEW)
- `/usr/local/bin/{AI_NAME}-wrapper` — Wrapper script (NEW)
- `~/.opencode/tools/opencode` — Custom binary symlink (NEW)
- `PAI-Install/install.sh` — Simplified to 15-20 lines (EDIT)

### Constraints
- NO automatic migration without consent
- NO overwriting existing backups
- NO using Homebrew opencode as default
- NO breaking existing .zshrc configurations

## PLAN

1. Create feature branch `feature/wp-e-installer-refactor`
2. Implement engine/build-opencode.ts (port from PAIOpenCodeWizard.ts)
3. Implement engine/migrate.ts (port from Tools/migration-v2-to-v3.ts)
4. Implement engine/update.ts (new)
5. Implement step files (steps-fresh, steps-migrate, steps-update)
6. Create wrapper script at /usr/local/bin/{AI_NAME}-wrapper
7. Add .zshrc alias integration
8. Update Electron UI for flow routing
9. Simplify install.sh to 15-20 lines
10. Create cli/quick-install.ts for headless mode
11. Delete 6 deprecated files
12. Test all scenarios

## IDEAL STATE CRITERIA

- [ ] ISC-C1: install.sh is exactly 15-20 lines of bash
- [ ] ISC-C2: engine/build-opencode.ts builds custom OpenCode binary with progress callbacks
- [ ] ISC-C3: engine/migrate.ts ports v2→v3 migration with backup creation
- [ ] ISC-C4: engine/update.ts handles v3→v3.x updates preserving settings
- [ ] ISC-C5: Wrapper script installed at /usr/local/bin/{AI_NAME}-wrapper
- [ ] ISC-C6: Custom binary symlinked at ~/.opencode/tools/opencode
- [ ] ISC-C7: .zshrc alias created and persists after restart
- [ ] ISC-C8: Electron UI auto-detects fresh/migrate/update modes
- [ ] ISC-C9: OpenCode-Zen is default provider (FREE tier emphasized)
- [ ] ISC-C10: Build step shows live progress (10-70%) with skip option
- [ ] ISC-C11: Migration requires explicit user consent with backup
- [ ] ISC-C12: Headless CLI mode works with all arguments
- [ ] ISC-C13: 6 deprecated files deleted

### Anti-Criteria
- [ ] ISC-A1: NO automatic migration without user confirmation
- [ ] ISC-A2: NO overwriting existing backups
- [ ] ISC-A3: NO using Homebrew opencode as default
- [ ] ISC-A4: NO breaking existing .zshrc configurations

## DECISIONS

- 2026-03-09: Use OpenCode-Zen as default provider (FREE tier) per Jeremy clarification
- 2026-03-09: Wrapper script pattern based on existing ~/.opencode/tools/opencode-wrapper
- 2026-03-09: Build from source (don't bundle binary) due to GitHub size limits
- 2026-03-09: Migration requires explicit consent with backup creation

## LOG

### Iteration 0 — 2026-03-09
- Phase reached: PLAN
- Created 17 ISC criteria
- Ready to create feature branch and implement
