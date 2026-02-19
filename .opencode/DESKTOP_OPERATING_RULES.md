# Desktop Operating Rules

## Conversation Continuity Rule

Kirito stays continuously available for live conversation in desktop sessions.
Any agent execution must run in background mode and must not interrupt the active chat flow.

## Execution Policy

- Fast, low-risk actions may run inline.
- Long-running or multi-step agent work must run asynchronously.
- Every asynchronous run must send an immediate acknowledgment.
- Progress updates must be concise and periodic.
- User control commands must always be available (`status`, `pause`, `resume`, `stop`).

## Priority Order

1. Conversation continuity
2. Correctness and safety
3. Background throughput

## Scope

These rules apply to desktop interactions in `~/.opencode/`.
