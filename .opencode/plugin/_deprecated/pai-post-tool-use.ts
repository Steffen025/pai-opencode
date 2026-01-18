/**
 * PAI Post-Tool-Use Plugin
 *
 * Captures all tool execution events for later processing by the history system.
 * This plugin implements the skeleton event capture for v0.5 - storage logic
 * will be added in v0.6 (History System).
 *
 * @version 0.5.1 - Enhanced debug logging
 */

import type { Plugin } from "@opencode-ai/plugin";
import { appendFileSync } from "fs";

const DEBUG_LOG = "/tmp/pai-plugin-debug.log";

function debugLog(message: string) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;

  // ONLY write to debug file - console.log corrupts TUI
  try {
    appendFileSync(DEBUG_LOG, logLine);
  } catch {
    // Silently fail - don't corrupt TUI
  }
}

export const PaiPostToolUse: Plugin = async (ctx) => {
  debugLog('[PAI] Post-Tool-Use plugin loaded');
  debugLog(`[PAI] Plugin context: ${JSON.stringify(ctx, null, 2)}`);

  return {
    "tool.execute.after": async (input: any, output: any) => {
      try {
        const timestamp = new Date().toISOString();

        // Log ALL available data for debugging
        debugLog(`[PAI] ========== tool.execute.after TRIGGERED ==========`);
        debugLog(`[PAI] Timestamp: ${timestamp}`);
        debugLog(`[PAI] Input keys: ${Object.keys(input || {}).join(', ')}`);
        debugLog(`[PAI] Output keys: ${Object.keys(output || {}).join(', ')}`);
        debugLog(`[PAI] Full input: ${JSON.stringify(input, null, 2)}`);
        debugLog(`[PAI] Full output: ${JSON.stringify(output, null, 2)}`);

        const tool = input?.tool || input?.name || 'unknown';
        const sessionID = input?.sessionID || input?.sessionId || 'unknown';
        const callID = input?.callID || input?.callId || 'unknown';

        debugLog(`[PAI] Tool: ${tool}`);
        debugLog(`[PAI] SessionID: ${sessionID}`);
        debugLog(`[PAI] CallID: ${callID}`);

        // Identify Task tool for SubagentStop use case
        if (tool === "Task") {
          debugLog(`[PAI] *** AGENT TASK COMPLETED ***`);
          const outputPreview = output?.output?.substring(0, 200) || output?.result?.substring(0, 200) || '(empty)';
          debugLog(`[PAI] Output preview: ${outputPreview}...`);
        }

        debugLog(`[PAI] ========== END tool.execute.after ==========`);

      } catch (error) {
        // Non-critical: log and continue
        const errorMsg = error instanceof Error ? error.message : String(error);
        debugLog(`[PAI] ERROR in post-tool-use handler: ${errorMsg}`);
        debugLog(`[PAI] Error stack: ${error instanceof Error ? error.stack : 'N/A'}`);
      }
    }
  };
};
