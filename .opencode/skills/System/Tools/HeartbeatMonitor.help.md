# HeartbeatMonitor

Generic process heartbeat monitor for PAI tools and services.

## Purpose

- Monitor whether a process is alive (`pgrep -f` pattern)
- Write structured JSONL heartbeat events
- Open an incident when process stays down past threshold
- Optionally execute a recovery command once per incident

## Usage

```bash
bun ~/.opencode/skills/System/Tools/HeartbeatMonitor.ts --match <pattern> [options]
```

## Required Argument

- `--match <pattern>`: Process match string used with `pgrep -f`

## Options

- `--name <name>`: Logical monitor name (default `Heartbeat`)
- `--interval-ms <ms>`: Tick interval in milliseconds (default `15000`)
- `--stale-ms <ms>`: Stale threshold in milliseconds (default `30000`)
- `--log-file <path>`: JSONL output path (default `/root/.opencode/MEMORY/STATE/heartbeat/heartbeat.log`)
- `--on-stale-command <cmd>`: Shell command executed once when stale incident opens
- `--once`: Run one check and exit
- `-h, --help`: Show help

## Output Events

- `startup`
- `startup-unhealthy`
- `heartbeat`
- `incident-open`
- `incident-recovered`
- `on-stale-command`
- `error`
- `shutdown`

## Examples

```bash
# Continuous monitoring
bun ~/.opencode/skills/System/Tools/HeartbeatMonitor.ts \
  --name KiritoBridge \
  --match "telegram-bridge/bridge.ts"

# With auto-recovery command
bun ~/.opencode/skills/System/Tools/HeartbeatMonitor.ts \
  --name KiritoBridge \
  --match "telegram-bridge/bridge.ts" \
  --stale-ms 45000 \
  --on-stale-command "systemctl restart pai-telegram-bridge"

# One-shot health check
bun ~/.opencode/skills/System/Tools/HeartbeatMonitor.ts \
  --match "telegram-bridge/bridge.ts" \
  --once
```
