#!/usr/bin/env bun

import { appendFile, mkdir } from "fs/promises";
import { dirname } from "path";

interface Args {
  name: string;
  match: string;
  intervalMs: number;
  staleMs: number;
  logFile: string;
  onStaleCommand?: string;
  once: boolean;
}

interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

let timer: ReturnType<typeof setInterval> | null = null;
let lastHealthyAt = Date.now();
let incidentOpen = false;
let staleCommandExecuted = false;

function showHelp(): void {
  console.log(`
HeartbeatMonitor.ts - Generic process heartbeat monitor

Usage:
  bun ~/.opencode/skills/System/Tools/HeartbeatMonitor.ts --match <pattern> [options]

Required:
  --match <pattern>           Process match pattern used by pgrep -f

Options:
  --name <name>               Heartbeat name for logs (default: Heartbeat)
  --interval-ms <ms>          Tick interval in milliseconds (default: 15000)
  --stale-ms <ms>             Stale threshold in milliseconds (default: 30000)
  --log-file <path>           JSONL log path
                              (default: /root/.opencode/MEMORY/STATE/heartbeat/heartbeat.log)
  --on-stale-command <cmd>    Command to execute once when stale incident opens
  --once                      Run one tick and exit
  -h, --help                  Show this help

Examples:
  bun ~/.opencode/skills/System/Tools/HeartbeatMonitor.ts \
    --name KiritoBridge --match "telegram-bridge/bridge.ts"

  bun ~/.opencode/skills/System/Tools/HeartbeatMonitor.ts \
    --match "telegram-bridge/bridge.ts" \
    --stale-ms 45000 \
    --on-stale-command "systemctl restart pai-telegram-bridge"

  bun ~/.opencode/skills/System/Tools/HeartbeatMonitor.ts \
    --match "my-worker.js" --once
`);
}

function parseArgs(): Args | null {
  const raw = process.argv.slice(2);
  const parsed: Partial<Args> = {
    name: "Heartbeat",
    intervalMs: 15000,
    staleMs: 30000,
    logFile: "/root/.opencode/MEMORY/STATE/heartbeat/heartbeat.log",
    once: false,
  };

  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    const next = raw[i + 1];

    switch (arg) {
      case "--name":
        if (!next) return null;
        parsed.name = next;
        i++;
        break;
      case "--match":
        if (!next) return null;
        parsed.match = next;
        i++;
        break;
      case "--interval-ms":
        if (!next || Number.isNaN(Number(next))) return null;
        parsed.intervalMs = Number(next);
        i++;
        break;
      case "--stale-ms":
        if (!next || Number.isNaN(Number(next))) return null;
        parsed.staleMs = Number(next);
        i++;
        break;
      case "--log-file":
        if (!next) return null;
        parsed.logFile = next;
        i++;
        break;
      case "--on-stale-command":
        if (!next) return null;
        parsed.onStaleCommand = next;
        i++;
        break;
      case "--once":
        parsed.once = true;
        break;
      case "-h":
      case "--help":
        showHelp();
        process.exit(0);
      default:
        console.error(`Unknown argument: ${arg}`);
        showHelp();
        return null;
    }
  }

  if (!parsed.match) {
    console.error("Missing required argument: --match");
    showHelp();
    return null;
  }

  if ((parsed.intervalMs || 0) <= 0 || (parsed.staleMs || 0) <= 0) {
    console.error("--interval-ms and --stale-ms must be > 0");
    return null;
  }

  return parsed as Args;
}

async function ensureLogDir(logFile: string): Promise<void> {
  await mkdir(dirname(logFile), { recursive: true });
}

async function appendLog(logFile: string, payload: Record<string, unknown>): Promise<void> {
  const line = `${JSON.stringify({ ts: new Date().toISOString(), ...payload })}\n`;
  await appendFile(logFile, line, "utf-8");
}

async function runCommand(command: string): Promise<CommandResult> {
  const proc = Bun.spawn(["/bin/sh", "-lc", command], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return {
    code,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
  };
}

async function isProcessRunning(match: string): Promise<boolean> {
  const result = await runCommand(`/usr/bin/pgrep -f ${JSON.stringify(match)}`);
  return result.code === 0;
}

async function executeStaleCommand(args: Args): Promise<void> {
  if (!args.onStaleCommand) return;
  const result = await runCommand(args.onStaleCommand);
  await appendLog(args.logFile, {
    event: "on-stale-command",
    name: args.name,
    command: args.onStaleCommand,
    success: result.code === 0,
    exitCode: result.code,
    stderr: result.stderr || null,
    stdout: result.stdout || null,
  });
}

async function tick(args: Args): Promise<void> {
  const running = await isProcessRunning(args.match);
  const now = Date.now();

  if (running) {
    lastHealthyAt = now;
    if (incidentOpen) {
      incidentOpen = false;
      staleCommandExecuted = false;
      await appendLog(args.logFile, {
        event: "incident-recovered",
        name: args.name,
      });
    }

    await appendLog(args.logFile, {
      event: "heartbeat",
      name: args.name,
      running: true,
      incidentOpen,
    });
    return;
  }

  const staleForMs = now - lastHealthyAt;
  await appendLog(args.logFile, {
    event: "heartbeat",
    name: args.name,
    running: false,
    incidentOpen,
    staleForMs,
  });

  if (staleForMs < args.staleMs) {
    return;
  }

  if (!incidentOpen) {
    incidentOpen = true;
    await appendLog(args.logFile, {
      event: "incident-open",
      name: args.name,
      staleForMs,
      staleMs: args.staleMs,
      match: args.match,
    });
  }

  if (args.onStaleCommand && !staleCommandExecuted) {
    staleCommandExecuted = true;
    await executeStaleCommand(args);
  }
}

async function shutdown(args: Args, signal: string): Promise<void> {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  await appendLog(args.logFile, {
    event: "shutdown",
    name: args.name,
    signal,
  });
  process.exit(0);
}

async function main(): Promise<void> {
  const args = parseArgs();
  if (!args) {
    process.exit(1);
  }

  await ensureLogDir(args.logFile);
  await appendLog(args.logFile, {
    event: "startup",
    name: args.name,
    match: args.match,
    intervalMs: args.intervalMs,
    staleMs: args.staleMs,
    once: args.once,
    hasStaleCommand: Boolean(args.onStaleCommand),
  });

  const initiallyRunning = await isProcessRunning(args.match);
  lastHealthyAt = Date.now();
  if (!initiallyRunning) {
    await appendLog(args.logFile, {
      event: "startup-unhealthy",
      name: args.name,
      match: args.match,
    });
  }

  if (args.once) {
    await tick(args);
    return;
  }

  timer = setInterval(() => {
    void tick(args).catch(async (error: Error) => {
      await appendLog(args.logFile, {
        event: "error",
        name: args.name,
        message: error.message,
      });
    });
  }, args.intervalMs);

  process.on("SIGINT", () => {
    void shutdown(args, "SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown(args, "SIGTERM");
  });

  await tick(args);
}

await main();
