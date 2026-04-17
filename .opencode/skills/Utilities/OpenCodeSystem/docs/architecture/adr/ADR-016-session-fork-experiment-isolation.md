# ADR-016: Session Fork for Experiment Isolation

**Status:** Accepted
**Date:** 2026-03-10
**Deciders:** Steffen, Jeremy
**Tags:** opencode-native, session-fork, experiment-safety, plan-mode-replacement
**WP:** WP-N4

---

## Context

Claude Code has Plan Mode (`EnterPlanMode`/`ExitPlanMode`) — a structured read-only exploration phase. OpenCode does not have Plan Mode.

However, OpenCode has `Session.fork()` — the ability to create an exact copy of a session at any message point. This provides a different but powerful primitive for safe experimentation: fork → experiment → if good keep, if bad discard the fork.

**Verified API** (`packages/sdk/js/src/v2/gen/sdk.gen.ts`):
```typescript
public fork(parameters: {
  sessionID: string;
  messageID: string;  // Fork point — which message to fork at
}): Promise<Session>
```

---

## Decision

Document session forking as the OpenCode-native approach to safe experimentation. This is a documentation-only change — no plugin code required since `Session.fork()` is already available as a built-in API.

---

## Technical Implementation

### Add to `AGENTS.md` — "Safe Experiments" section

```markdown
# Safe Experiments (Session Fork)

OpenCode provides Session Forking as a safe experiment primitive.
Fork the session at the current point, experiment in the fork,
and discard it if the experiment fails.

This partially replaces Claude Code's Plan Mode (which is not available in OpenCode).

## When to Fork

- Before risky refactoring that might break things
- When exploring multiple solution approaches
- Before destructive operations (delete, overwrite)
- When the Algorithm needs to "try something" without commitment

## How Session Fork Works

The AI can instruct the user to fork via the OpenCode UI, or document
the fork point for manual recovery. Programmatic forking is available
via the OpenCode SDK:

```
POST /session/{sessionID}/fork
Body: { "messageID": "msg_..." }
```

This creates an exact copy of the session up to that message.
The original session remains untouched.
```

---

## Verification

- [ ] AGENTS.md documents session forking with usage guidance
- [ ] "When to Fork" list covers the main use cases
- [ ] No false claims about Plan Mode availability

---

## Related ADRs

- ADR-012: Session Registry (session management)
- ADR-014: LSP-Native Code Navigation (paired in WP-N4)
