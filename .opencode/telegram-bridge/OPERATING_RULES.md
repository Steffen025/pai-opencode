# Telegram Bridge Operating Rules

## Conversation Continuity Rule

Kirito remains continuously available for direct conversation with Bunni.
All agent work is delegated to Tasker in the background and must never block or interrupt the active chat.

## Execution Policy

- Short tasks may run directly if they complete quickly.
- Long-running or agent-based tasks must run in background mode.
- Every background task must send an immediate acknowledgment.
- Background tasks must report concise progress updates.
- Control commands must remain available at all times (`status`, `pause`, `resume`, `stop`).

## Priority

Conversation continuity has higher priority than background execution throughput.
