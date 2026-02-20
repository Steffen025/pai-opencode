# Agent Patch Queue

## Pending Patch: Desktop Tasker External Directory Permission

- **Priority:** High
- **Execute after:** Current Architect/Engineer ticket in progress (BG-002 / Issue #3)
- **Owner:** Architect + Engineer (next task)

### Problem

Desktop Tasker background commit-prep job failed with:

`permission requested: external_directory (/root/.opencode/*); auto-rejecting`

### Required Patch

1. Update Desktop Tasker execution path so background jobs can operate on `/root/.opencode` without interactive permission prompts.
2. Keep safety constraints intact (no destructive defaults, no auto-push).
3. Add verification workflow:
   - queue a commit-prep job via Desktop Tasker,
   - ensure status reaches `completed`,
   - output commit hash/message, included file list, and commits pending push.

### Acceptance Criteria

- No `external_directory auto-reject` for Desktop Tasker commit-prep jobs.
- Live chat remains responsive while background job runs.
- Verification evidence captured in the final report.

---

## Plan To Execute After This Patch

### Objective

Prepare the implementation plan for the Kirito web app starting with a Trello-like Kanban, then evolving to multi-page capabilities.

### Fixed Kanban Columns (must be used exactly)

- `Backlog`
- `To Do`
- `In Progress`
- `Blocked`
- `Done`

### Assignment

1. **Algorithm**
   - Produce product roadmap phases: Kanban MVP -> Runs -> Agents -> Chat -> Settings.
   - Define binary success criteria for each phase.

2. **Architect**
   - Propose target architecture for internet-exposed web app via Coolify.
   - Include security baseline (auth, HTTPS, secret handling, access control).
   - Ensure modular page/tab design from day one.

3. **Engineer**
   - Produce implementation backlog for MVP Kanban.
   - Include API/data model, drag-and-drop behavior, and integration points for heartbeat/tasker.
   - Provide CI/CD outline for Coolify deployment.

### Constraints

- GitHub is used for code storage only (not as ticket source of truth).
- Agent execution must remain background-first.
- Live chat responsiveness is mandatory.

### Deliverables

- One plan output per role (Algorithm, Architect, Engineer).
- One merged execution plan with priorities and sequencing.
