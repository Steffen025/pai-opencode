/**
 * Algorithm Tracker Handler (v3.0)
 *
 * Tracks Algorithm execution state — which phase is active,
 * validates phase transitions, tracks ISC criteria and agent spawns.
 *
 * Ported from PAI v3.0 AlgorithmTracker.hook.ts
 *
 * @module algorithm-tracker
 */

import * as fs from "fs";
import * as path from "path";
import { fileLog, fileLogError } from "../lib/file-logger";
import { getStateDir } from "../lib/paths";

/** Algorithm phases in order */
const PHASES = [
  "OBSERVE",
  "THINK",
  "PLAN",
  "BUILD",
  "EXECUTE",
  "VERIFY",
  "LEARN",
] as const;

type Phase = (typeof PHASES)[number];

interface AlgorithmState {
  sessionId: string;
  active: boolean;
  currentPhase: Phase | null;
  phaseHistory: { phase: Phase; timestamp: string }[];
  criteriaCount: number;
  criteriaCompleted: number;
  agentCount: number;
  effortLevel: string | null;
  startedAt: string;
  updatedAt: string;
}

/**
 * Read current algorithm state from disk
 */
export function readState(sessionId: string): AlgorithmState | null {
  try {
    const stateDir = getStateDir();
    const statePath = path.join(stateDir, "algorithm-state.json");
    if (fs.existsSync(statePath)) {
      const data = JSON.parse(fs.readFileSync(statePath, "utf-8"));
      if (data.sessionId === sessionId) return data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Write algorithm state to disk
 */
export function writeState(state: AlgorithmState): void {
  try {
    const stateDir = getStateDir();
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    const statePath = path.join(stateDir, "algorithm-state.json");
    state.updatedAt = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  } catch (error) {
    fileLogError("[AlgorithmTracker] Failed to write state", error);
  }
}

/**
 * Detect which Algorithm phase is being entered based on tool output
 */
function detectPhaseFromOutput(text: string): Phase | null {
  if (!text) return null;
  const str = typeof text === "string" ? text : JSON.stringify(text);

  // Check for phase headers in voice curls or output
  if (str.includes("Observe phase") || str.includes("━━━ 👁️ OBSERVE"))
    return "OBSERVE";
  if (str.includes("Think phase") || str.includes("━━━ 🧠 THINK"))
    return "THINK";
  if (str.includes("Plan phase") || str.includes("━━━ 📋 PLAN"))
    return "PLAN";
  if (str.includes("Build phase") || str.includes("━━━ 🔨 BUILD"))
    return "BUILD";
  if (str.includes("Execute phase") || str.includes("━━━ ⚡ EXECUTE"))
    return "EXECUTE";
  if (str.includes("Verify phase") || str.includes("━━━ ✅ VERIFY"))
    return "VERIFY";
  if (str.includes("Learn phase") || str.includes("━━━ 📚 LEARN"))
    return "LEARN";

  return null;
}

/**
 * Main tracking function — called from pai-unified.ts after tool execution
 */
export async function trackAlgorithmState(
  toolName: string,
  toolArgs: any,
  toolResult: any,
  sessionId: string
): Promise<AlgorithmState | null> {
  try {
    let state = readState(sessionId);

    // Initialize state if needed
    if (!state) {
      state = {
        sessionId,
        active: false,
        currentPhase: null,
        phaseHistory: [],
        criteriaCount: 0,
        criteriaCompleted: 0,
        agentCount: 0,
        effortLevel: null,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const resultStr =
      typeof toolResult === "string"
        ? toolResult
        : JSON.stringify(toolResult ?? "");

    // Detect phase from Bash output (voice curls)
    if (
      toolName.toLowerCase().includes("bash") ||
      toolName === "mcp_bash"
    ) {
      const phase = detectPhaseFromOutput(resultStr);
      if (phase) {
        state.active = true;
        state.currentPhase = phase;
        state.phaseHistory.push({
          phase,
          timestamp: new Date().toISOString(),
        });
        fileLog(`[AlgorithmTracker] Phase: ${phase}`, "info");
      }
    }

    // Track ISC criteria via TodoWrite
    if (
      toolName === "mcp_todowrite" ||
      toolName.toLowerCase().includes("todo")
    ) {
      const todos = toolArgs?.todos;
      if (Array.isArray(todos)) {
        state.criteriaCount = todos.length;
        state.criteriaCompleted = todos.filter(
          (t: any) => t.status === "completed"
        ).length;
        state.active = true;
        fileLog(
          `[AlgorithmTracker] ISC: ${state.criteriaCompleted}/${state.criteriaCount}`,
          "info"
        );
      }
    }

    // Track agent spawns via Task
    if (
      toolName === "mcp_task" ||
      toolName.toLowerCase().includes("task")
    ) {
      state.agentCount++;
      fileLog(`[AlgorithmTracker] Agent spawned (#${state.agentCount})`, "info");
    }

    writeState(state);
    return state;
  } catch (error) {
    fileLogError("[AlgorithmTracker] Tracking failed", error);
    return null;
  }
}
