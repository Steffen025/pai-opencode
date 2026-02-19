#!/usr/bin/env bun

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

type Counts = {
  backlog: number;
  todo: number;
  inProgress: number;
  blocked: number;
  done: number;
};

type CheckupState = {
  lastCheckAt: string;
  counts: Counts;
};

type ProjectItem = {
  title?: string;
  score?: number;
  workflowState?: string;
  issueNumber?: number;
};

const DEFAULT_STATE_FILE = "/root/.opencode/telegram-bridge/sessions/checkup-state.json";

function env(name: string, fallback = ""): string {
  return (process.env[name] || fallback).trim();
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/\s+/g, "");
}

async function run(command: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(command, { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, stdout: stdout.trim(), stderr: stderr.trim() };
}

async function runShell(command: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return run(["/bin/sh", "-lc", command]);
}

async function loadPreviousState(stateFile: string): Promise<CheckupState | null> {
  try {
    const raw = await readFile(stateFile, "utf-8");
    const parsed = JSON.parse(raw) as CheckupState;
    return parsed;
  } catch {
    return null;
  }
}

async function saveState(stateFile: string, state: CheckupState): Promise<void> {
  await mkdir(dirname(stateFile), { recursive: true });
  await writeFile(stateFile, JSON.stringify(state, null, 2), "utf-8");
}

function countFromItems(items: Array<Record<string, unknown>>): Counts {
  const counts: Counts = {
    backlog: 0,
    todo: 0,
    inProgress: 0,
    blocked: 0,
    done: 0,
  };

  for (const item of items) {
    let state = "";
    for (const key of Object.keys(item)) {
      if (normalizeKey(key) === normalizeKey("Workflow State")) {
        const value = item[key];
        if (typeof value === "string") state = value;
      }
    }

    if (state === "Backlog") counts.backlog++;
    if (state === "Todo") counts.todo++;
    if (state === "In Progress") counts.inProgress++;
    if (state === "Blocked") counts.blocked++;
    if (state === "Done") counts.done++;
  }

  return counts;
}

function delta(current: Counts, previous: Counts | null): Counts {
  if (!previous) {
    return { ...current };
  }
  return {
    backlog: current.backlog - previous.backlog,
    todo: current.todo - previous.todo,
    inProgress: current.inProgress - previous.inProgress,
    blocked: current.blocked - previous.blocked,
    done: current.done - previous.done,
  };
}

function stateOf(item: Record<string, unknown>): string {
  for (const key of Object.keys(item)) {
    if (normalizeKey(key) === normalizeKey("Workflow State")) {
      const value = item[key];
      if (typeof value === "string") return value;
    }
  }
  return "";
}

function pickAction(items: Array<Record<string, unknown>>): ProjectItem | null {
  const mapped: ProjectItem[] = items.map((item) => {
    const content = (item.content as Record<string, unknown> | undefined) || {};
    return {
      title: (item.title as string) || (content.title as string),
      score: typeof item.score === "number" ? item.score : 0,
      workflowState: stateOf(item),
      issueNumber: typeof content.number === "number" ? content.number : undefined,
    };
  });

  const todo = mapped
    .filter((it) => it.workflowState === "Todo")
    .sort((a, b) => (b.score || 0) - (a.score || 0));
  if (todo.length > 0) return todo[0];

  const inProgress = mapped
    .filter((it) => it.workflowState === "In Progress")
    .sort((a, b) => (b.score || 0) - (a.score || 0));
  if (inProgress.length > 0) return inProgress[0];

  const blocked = mapped
    .filter((it) => it.workflowState === "Blocked")
    .sort((a, b) => (b.score || 0) - (a.score || 0));
  if (blocked.length > 0) return blocked[0];

  return null;
}

function formatSigned(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

async function main(): Promise<void> {
  const owner = env("KANBAN_OWNER", "BunniChrist");
  const project = env("KANBAN_PROJECT", "1");
  const botToken = env("TELEGRAM_BOT_TOKEN");
  const chatId = env("TELEGRAM_CHECKUP_CHAT_ID");
  const stateFile = env("CHECKUP_STATE_FILE", DEFAULT_STATE_FILE);

  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN missing");
  if (!chatId) throw new Error("TELEGRAM_CHECKUP_CHAT_ID missing");

  const service = await run(["systemctl", "is-active", "pai-telegram-bridge"]);
  const serviceActive = service.code === 0 && service.stdout === "active";

  const previous = await loadPreviousState(stateFile);
  const since = previous?.lastCheckAt || new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const logs = await run([
    "journalctl",
    "-u",
    "pai-telegram-bridge",
    "--since",
    since,
    "--no-pager",
  ]);

  const logText = logs.stdout || "";
  const timeoutCount = (logText.match(/\[timeout\]/g) || []).length;
  const fallbackCount = (logText.match(/Passage au modèle/g) || []).length;
  const stderrCount = (logText.match(/\[stderr\]/g) || []).length;

  let globalState = "OK";
  if (!serviceActive) {
    globalState = "INCIDENT";
  } else if (timeoutCount > 0 || stderrCount > 0) {
    globalState = "DEGRADED";
  }

  const uptimeRes = await runShell("systemctl show pai-telegram-bridge --property=ActiveEnterTimestamp --value");
  const uptimeStamp = uptimeRes.code === 0 && uptimeRes.stdout ? uptimeRes.stdout : "unknown";

  const projectItemsRes = await run([
    "gh",
    "project",
    "item-list",
    project,
    "--owner",
    owner,
    "--format",
    "json",
  ]);
  if (projectItemsRes.code !== 0) {
    throw new Error(`gh project item-list failed: ${projectItemsRes.stderr}`);
  }
  const projectJson = JSON.parse(projectItemsRes.stdout) as { items: Array<Record<string, unknown>> };
  const counts = countFromItems(projectJson.items);
  const deltas = delta(counts, previous?.counts || null);
  const action = pickAction(projectJson.items);

  const actionLine = action
    ? `Action: #${action.issueNumber || "?"} - ${action.title || "(sans titre)"}`
    : "Action: aucune issue prioritaire";

  const message = [
    `Heartbeat: ${globalState}`,
    `Bridge: ${serviceActive ? "active" : "inactive"} | Since: ${uptimeStamp}`,
    `Window: since ${since}`,
    `Timeouts: ${timeoutCount} | Fallbacks: ${fallbackCount} | Stderr: ${stderrCount}`,
    `Issues: B:${counts.backlog} T:${counts.todo} IP:${counts.inProgress} BL:${counts.blocked} D:${counts.done}`,
    `Delta: B:${formatSigned(deltas.backlog)} T:${formatSigned(deltas.todo)} IP:${formatSigned(
      deltas.inProgress
    )} BL:${formatSigned(deltas.blocked)} D:${formatSigned(deltas.done)}`,
    actionLine,
  ].join("\n");

  const sendRes = await run([
    "curl",
    "-sS",
    "-X",
    "POST",
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    "-d",
    `chat_id=${chatId}`,
    "-d",
    `text=${message}`,
  ]);

  if (sendRes.code !== 0) {
    throw new Error(`sendMessage failed: ${sendRes.stderr}`);
  }

  await saveState(stateFile, {
    lastCheckAt: new Date().toISOString(),
    counts,
  });

  console.log("Checkup sent to Telegram.");
}

await main();
