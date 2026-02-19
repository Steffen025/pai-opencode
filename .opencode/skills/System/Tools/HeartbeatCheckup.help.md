# HeartbeatCheckup

Sends a periodic Telegram check-up message with bridge health + Kanban progress.

## What it reports

- Bridge global state: `OK` / `DEGRADED` / `INCIDENT`
- Service activity and uptime reference
- Log window counters since last check: timeouts, fallbacks, stderr events
- Kanban counts by `Workflow State`: Backlog, Todo, In Progress, Blocked, Done
- Delta vs previous check
- Action line with issue number and title (priority: Todo -> In Progress -> Blocked)

## Required env

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHECKUP_CHAT_ID`

## Optional env

- `KANBAN_OWNER` (default: `BunniChrist`)
- `KANBAN_PROJECT` (default: `1`)
- `CHECKUP_STATE_FILE` (default: `/root/.opencode/telegram-bridge/sessions/checkup-state.json`)

## Manual run

```bash
bun ~/.opencode/skills/System/Tools/HeartbeatCheckup.ts
```

## Scheduler

- Service: `/etc/systemd/system/kirito-heartbeat-checkup.service`
- Timer: `/etc/systemd/system/kirito-heartbeat-checkup.timer`
- Frequency: every 2 hours (`OnCalendar=*-*-* 00/2:00:00`)
