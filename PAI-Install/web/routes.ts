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
import {
  createFreshState,
  hasSavedState,
  loadState,
  saveState,
  clearState,
  completeStep,
  skipStep,
} from "../engine/state";
import { STEPS, getProgress, getStepStatuses } from "../engine/steps";

// ─── State ───────────────────────────────────────────────────────

let installState: InstallState | null = null;
let wsClients = new Set<any>();
let messageHistory: ServerMessage[] = [];
let pendingRequests = new Map<string, { resolve: (value: string) => void }>();

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
    pendingRequests.set(id, { resolve });
    broadcast({ type: "input_request", id, prompt, inputType: type, placeholder });
  });
}

async function requestChoice(
  id: string,
  prompt: string,
  choices: { label: string; value: string; description?: string }[]
): Promise<string> {
  return new Promise<string>((resolve) => {
    pendingRequests.set(id, { resolve });
    broadcast({ type: "choice_request", id, prompt, choices });
  });
}

// ─── WebSocket Message Handler ───────────────────────────────────

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
      break;

    case "user_input": {
      const pending = pendingRequests.get(msg.requestId);
      if (pending) {
        pending.resolve(msg.value);
        pendingRequests.delete(msg.requestId);
        // Only echo back to the originating socket, don't broadcast to all
        const display = msg.value.startsWith("sk-") || msg.value.startsWith("xi-")
          ? msg.value.substring(0, 8) + "..."
          : msg.value;
        if (display) {
          // Send only to origin socket, not to message history
          const originMsg: ServerMessage = { type: "message", role: "system" as any, content: display };
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
        pending.resolve(msg.value);
        pendingRequests.delete(msg.requestId);
      }
      break;
    }

    case "start_install": {
      if (!installState) {
        startInstallation();
      }
      break;
    }
  }
}

// ─── Installation Flow ───────────────────────────────────────────

async function startInstallation(): Promise<void> {
  // Always start fresh — GUI should not silently resume stale state
  if (hasSavedState()) clearState();
  installState = createFreshState("web");

  const emit = createWsEmitter();

  try {
    // Step 1: System Detection
    if (!installState.completedSteps.includes("system-detect")) {
      await runSystemDetect(installState, emit);
      broadcast({ type: "detection_result", data: installState.detection! });
      completeStep(installState, "system-detect", "prerequisites");
    }

    // Step 2: Prerequisites
    if (!installState.completedSteps.includes("prerequisites")) {
      await runPrerequisites(installState, emit);
      completeStep(installState, "prerequisites", "api-keys");
    }

    // Step 3: API Keys
    if (!installState.completedSteps.includes("api-keys")) {
      await runApiKeys(installState, emit, requestInput, requestChoice);
      completeStep(installState, "api-keys", "identity");
    }

    // Step 4: Identity
    if (!installState.completedSteps.includes("identity")) {
      await runIdentity(installState, emit, requestInput);
      completeStep(installState, "identity", "repository");
    }

    // Step 5: Repository
    if (!installState.completedSteps.includes("repository")) {
      await runRepository(installState, emit);
      completeStep(installState, "repository", "configuration");
    }

    // Step 6: Configuration
    if (!installState.completedSteps.includes("configuration")) {
      await runConfiguration(installState, emit);
      completeStep(installState, "configuration", "voice");
    }

    // Step 7: Voice (handles key collection + voice selection + server test)
    if (!installState.completedSteps.includes("voice") && !installState.skippedSteps.includes("voice")) {
      try {
        await runVoiceSetup(installState, emit, requestChoice, requestInput);
        if (!installState.skippedSteps.includes("voice")) {
          completeStep(installState, "voice", "validation");
        }
      } catch (voiceErr: any) {
        broadcast({ type: "error", message: `Voice setup error: ${voiceErr?.message || "Unknown error"}` });
        broadcast({ type: "message", role: "assistant", content: "Voice setup encountered an error. Continuing with installation..." });
        skipStep(installState, "voice", "validation", voiceErr?.message || "error");
      }
    }

    // Step 8: Validation
    broadcast({ type: "step_update", step: "validation", status: "active" });
    const checks = await runValidation(installState);
    broadcast({ type: "validation_result", checks });
    completeStep(installState, "validation");
    broadcast({ type: "step_update", step: "validation", status: "completed" });

    const summary = generateSummary(installState);
    broadcast({ type: "install_complete", success: true, summary });

    clearState();
  } catch (error: any) {
    broadcast({ type: "error", message: error.message });
    saveState(installState);
  }
}

// ─── Connection Management ───────────────────────────────────────

export function addClient(ws: any): void {
  wsClients.add(ws);
}

export function removeClient(ws: any): void {
  wsClients.delete(ws);
}

export function getState(): InstallState | null {
  return installState;
}
