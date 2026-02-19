#!/usr/bin/env bun

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

type AlertState = {
  lastState: "OK" | "DEGRADED" | "INCIDENT";
  lastSentAt?: string;
};

type ProjectItem = {
  title?: string;
  score?: number;
  workflowState?: string;
  issueNumber?: number;
};

const DEFAULT_STATE_FILE = "/root/.opencode/telegram-bridge/sessions/heartbeat-alert-state.json";

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

async function loadState(filePath: string): Promise<AlertState> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as AlertState;
    if (parsed.lastState === "OK" || parsed.lastState === "DEGRADED" || parsed.lastState === "INCIDENT") {
      return parsed;
    }
  } catch {
    // ignore
  }
  return { lastState: "OK" };
}

async function saveState(filePath: string, state: AlertState): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf-8");
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

  const byPriority = (state: string) =>
    mapped.filter((it) => it.workflowState === state).sort((a, b) => (b.score || 0) - (a.score || 0));

  return byPriority("Todo")[0] || byPriority("In Progress")[0] || byPriority("Blocked")[0] || null;
}

async function main(): Promise<void> {
  const owner = env("KANBAN_OWNER", "BunniChrist");
  const project = env("KANBAN_PROJECT", "1");
  const botToken = env("TELEGRAM_BOT_TOKEN");
  const chatId = env("TELEGRAM_CHECKUP_CHAT_ID");
  const stateFile = env("HEARTBEAT_ALERT_STATE_FILE", DEFAULT_STATE_FILE);

  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN missing");
  if (!chatId) throw new Error("TELEGRAM_CHECKUP_CHAT_ID missing");

  const service = await run(["systemctl", "is-active", "pai-telegram-bridge"]);
  const serviceActive = service.code === 0 && service.stdout === "active";

  const logs = await run([
    "journalctl",
    "-u",
    "pai-telegram-bridge",
    "--since",
    "5 minutes ago",
    "--no-pager",
  ]);

  const text = logs.stdout || "";
  const timeoutCount = (text.match(/\[timeout\]/g) || []).length;
  const stderrCount = (text.match(/\[stderr\]/g) || []).length;
  const fallbackCount = (text.match(/Passage au modèle/g) || []).length;

  let current: AlertState["lastState"] = "OK";
  if (!serviceActive) {
    current = "INCIDENT";
  } else if (timeoutCount > 0 || stderrCount > 0) {
    current = "DEGRADED";
  }

  const previous = await loadState(stateFile);

  if (current !== "OK" && current !== previous.lastState) {
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

    let actionLine = "Action: aucune issue prioritaire";
    if (projectItemsRes.code === 0) {
      const projectJson = JSON.parse(projectItemsRes.stdout) as { items: Array<Record<string, unknown>> };
      const action = pickAction(projectJson.items);
      if (action) {
        actionLine = `Action: #${action.issueNumber || "?"} - ${action.title || "(sans titre)"}`;
      }
    }

    const message = [
      `ALERTE IMMEDIATE: ${current}`,
      `Bridge: ${serviceActive ? "active" : "inactive"}`,
      `Fenetre 5min -> timeouts:${timeoutCount} stderr:${stderrCount} fallbacks:${fallbackCount}`,
      actionLine,
      `Horodatage: ${new Date().toISOString()}`,
    ].join("\n");

    const send = await run([
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

    if (send.code !== 0) {
      throw new Error(`sendMessage failed: ${send.stderr}`);
    }
  }

  await saveState(stateFile, {
    lastState: current,
    lastSentAt: current !== "OK" && current !== previous.lastState ? new Date().toISOString() : previous.lastSentAt,
  });

  console.log(`Heartbeat alert check complete (state=${current}).`);
}

await main();
