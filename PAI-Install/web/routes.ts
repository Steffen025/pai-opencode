/**
 * PAI Installer v4.0 — API Routes
 * HTTP + WebSocket API for the web installer.
 */

import type { InstallState, EngineEvent, ServerMessage, ClientMessage } from "../engine/types";
import { detectSystem, validateElevenLabsKey } from "../engine/detect";
import {
  runSystemDetect,
  runPrerequisites,
  runApiKeys,
  runIdentity,
  runRepository,
  runConfiguration,
  runVoiceSetup,
} from "../engine/actions";
import { runValidation, generateSummary } from "../engine/validate";
import { runFreshInstall } from "../engine/steps-fresh";
import { runMigration } from "../engine/steps-migrate";
import { runUpdate } from "../engine/steps-update";
import { hasSavedState, clearState, createFreshState, saveState } from "../engine/state";
import { access, constants } from "node:fs/promises";

// ─── State ───────────────────────────────────────────────────────

let installState: InstallState | null = null;
let wsClients = new Set<any>();
let messageHistory: ServerMessage[] = [];
let pendingRequests = new Map<string, { resolve: (value: string) => void; timeout: Timer }>();
let installationRunning = false;

// Request timeout: 5 minutes (prevent memory leaks from abandoned requests)
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

function setRequestTimeout(id: string): void {
	const timeout = setTimeout(() => {
		const pending = pendingRequests.get(id);
		if (pending) {
			pending.resolve(""); // Resolve empty on timeout
			pendingRequests.delete(id);
		}
	}, REQUEST_TIMEOUT_MS);
	
	const existing = pendingRequests.get(id);
	if (existing) {
		clearTimeout(existing.timeout);
	}
	pendingRequests.set(id, { resolve: pendingRequests.get(id)?.resolve || (() => {}), timeout });
}

// ─── Broadcasting ────────────────────────────────────────────────

function broadcast(msg: ServerMessage, originSocket?: any): void {
	const raw = JSON.stringify(msg);

	// Don't add sensitive user input to message history
	if (msg.type !== "user_input") {
		messageHistory.push(msg);
	}

	// If originSocket provided, only send to that socket (for user_input)
	if (originSocket) {
		try {
			originSocket.send(raw);
		} catch {
			wsClients.delete(originSocket);
		}
		return;
	}

	// Otherwise broadcast to all clients
	for (const ws of wsClients) {
		try {
			ws.send(raw);
		} catch {
			wsClients.delete(ws);
		}
	}
}

// ─── Engine Event → WebSocket ────────────────────────────────────

function createWsEmitter(): (event: EngineEvent) => Promise<void> {
  return async (event: EngineEvent) => {
    switch (event.event) {
      case "step_start":
        broadcast({ type: "step_update", step: event.step, status: "active" });
        break;
      case "step_complete":
        broadcast({ type: "step_update", step: event.step, status: "completed" });
        break;
      case "step_skip":
        broadcast({ type: "step_update", step: event.step, status: "skipped", detail: event.reason });
        break;
      case "step_error":
        broadcast({ type: "error", message: event.error, step: event.step });
        break;
      case "progress":
        broadcast({ type: "progress", step: event.step, percent: event.percent, detail: event.detail });
        break;
      case "message":
        broadcast({ type: "message", role: "assistant", content: event.content, speak: event.speak });
        break;
      case "error":
        broadcast({ type: "error", message: event.message });
        break;
    }
  };
}

// ─── Input Request Bridge ────────────────────────────────────────

async function requestInput(
  id: string,
  prompt: string,
  type: "text" | "password" | "key",
  placeholder?: string
): Promise<string> {
  return new Promise<string>((resolve) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      resolve(""); // Resolve empty on timeout
    }, REQUEST_TIMEOUT_MS);
    
    pendingRequests.set(id, { resolve, timeout });
    broadcast({ type: "input_request", id, prompt, inputType: type, placeholder });
  });
}

async function requestChoice(
  id: string,
  prompt: string,
  choices: { label: string; value: string; description?: string }[]
): Promise<string> {
  return new Promise<string>((resolve) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      resolve(""); // Resolve empty on timeout
    }, REQUEST_TIMEOUT_MS);
    
    pendingRequests.set(id, { resolve, timeout });
    broadcast({ type: "choice_request", id, prompt, choices });
  });
}

// ─── WebSocket Message Handler ───────────────────────────────────

let detectedMode: "fresh" | "migrate" | "update" | null = null;
let selectedMode: "fresh" | "migrate" | "update" | null = null;

export function handleWsMessage(ws: any, raw: string): void {
  let msg: ClientMessage;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }

  switch (msg.type) {
    case "client_ready":
      // Replay message history
      for (const m of messageHistory) {
        ws.send(JSON.stringify({ ...m, replayed: true }));
      }
      // Send current state
      if (installState) {
        const steps = getStepStatuses(installState);
        for (const s of steps) {
          ws.send(JSON.stringify({ type: "step_update", step: s.id, status: s.status }));
        }
      }
      // Detect and broadcast install mode
      detectInstallMode().then((mode) => {
        detectedMode = mode;
        broadcast({ type: "mode_detected", mode: detectedMode });
      });
      break;

    case "select_mode":
      if (installationRunning) {
        broadcast({ type: "error", message: "Installation already in progress" });
        break;
      }
      if (msg.mode && ["fresh", "migrate", "update"].includes(msg.mode)) {
        selectedMode = msg.mode as "fresh" | "migrate" | "update";
        broadcast({ type: "mode_selected", mode: selectedMode });
        // Auto-start installation after mode selection
        installationRunning = true;
        startInstallation(selectedMode).finally(() => {
          installationRunning = false;
        });
      }
      break;

    case "user_input": {
      const pending = pendingRequests.get(msg.requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        pending.resolve(msg.value);
        pendingRequests.delete(msg.requestId);
        // Only echo back to the originating socket, don't broadcast to all
        const display = msg.value.startsWith("sk-") || msg.value.startsWith("xi-")
          ? msg.value.substring(0, 8) + "..."
          : msg.value;
        if (display) {
          // Send only to origin socket, not to message history
          const originMsg: ServerMessage = { type: "message", role: "system", content: display };
          try {
            ws.send(JSON.stringify(originMsg));
          } catch {
            wsClients.delete(ws);
          }
        }
      }
      break;
    }

    case "user_choice": {
      const pending = pendingRequests.get(msg.requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        pending.resolve(msg.value);
        pendingRequests.delete(msg.requestId);
      }
      break;
    }

    case "start_install": {
      if (installationRunning) {
        broadcast({ type: "error", message: "Installation already in progress" });
        break;
      }
      if (!installState && selectedMode) {
        installationRunning = true;
        startInstallation(selectedMode).finally(() => {
          installationRunning = false;
        });
      }
      break;
    }
  }
}

// ─── Installation Flow ───────────────────────────────────────────

async function startInstallation(mode: "fresh" | "migrate" | "update"): Promise<void> {
  // Always start fresh — GUI should not silently resume stale state
  if (hasSavedState()) clearState();
  installState = createFreshState("web");

  const emit = createWsEmitter();

  try {
    broadcast({ type: "message", role: "assistant", content: `Starting ${mode} installation...` });

    switch (mode) {
      case "fresh":
        await runFreshInstall(installState, emit, requestInput, requestChoice);
        break;
      case "migrate":
        await runMigration(installState, emit, requestInput, requestChoice);
        break;
      case "update":
        await runUpdate(installState, emit, requestInput, requestChoice);
        break;
    }

    const summary = generateSummary(installState);
    broadcast({ type: "install_complete", success: true, summary, mode });
    clearState();
  } catch (error: any) {
    broadcast({ type: "error", message: error.message });
    saveState(installState);
  }
}

// ─── Mode Detection ─────────────────────────────────────────────

async function detectInstallMode(): Promise<"fresh" | "migrate" | "update" | null> {
  // Check for existing PAI installation
  const paiDir = `${process.env.HOME}/.opencode`;
  
  try {
    await access(paiDir, constants.F_OK);
  } catch {
    return "fresh";
  }
  
  // Check for v2 installation (claude/config.json vs opencode/settings.json)
  let hasV2 = false;
  let hasV3 = false;
  
  try {
    await access(`${paiDir}/claude/config.json`, constants.F_OK);
    hasV2 = true;
  } catch {
    hasV2 = false;
  }
  
  try {
    await access(`${paiDir}/settings.json`, constants.F_OK);
    hasV3 = true;
  } catch {
    hasV3 = false;
  }
  
  if (hasV2 && !hasV3) {
    return "migrate";
  }
  
  if (hasV3) {
    return "update";
  }
  
  return "fresh";
}

export function addClient(ws: any): void {
  wsClients.add(ws);
}

export function removeClient(ws: any): void {
  wsClients.delete(ws);
}

export function getState(): InstallState | null {
  return installState;
}
