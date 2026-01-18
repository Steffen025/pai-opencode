/**
 * PAI Session Lifecycle Plugin
 *
 * Captures all events to discover session-related lifecycle events.
 * Uses the generic 'event' hook to log all events and filter for
 * session-related ones.
 *
 * This plugin implements the skeleton event capture for v0.5 - storage logic
 * will be added in v0.6 (History System).
 *
 * @version 0.5.1 - Fixed to use valid event hook
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

export const PaiSessionLifecycle: Plugin = async (ctx) => {
  debugLog('[PAI] Session Lifecycle plugin loaded');
  debugLog(`[PAI] Plugin context: ${JSON.stringify(ctx, null, 2)}`);

  return {
    // Generic event hook - captures ALL events
    event: async (input: { event: any }) => {
      try {
        const event = input?.event;
        const eventType = event?.type || 'unknown';
        const timestamp = new Date().toISOString();

        // Log ALL events initially to discover what's available
        debugLog(`[PAI] ========== EVENT CAPTURED ==========`);
        debugLog(`[PAI] Event type: ${eventType}`);
        debugLog(`[PAI] Timestamp: ${timestamp}`);
        debugLog(`[PAI] Event keys: ${Object.keys(event || {}).join(', ')}`);
        debugLog(`[PAI] Full event: ${JSON.stringify(event, null, 2)}`);

        // Filter for session-related events
        if (eventType.includes('session') || eventType.includes('Session')) {
          debugLog(`[PAI] *** SESSION EVENT DETECTED ***`);
          debugLog(`[PAI] Session event type: ${eventType}`);

          // Try to extract common session fields
          const sessionID = event?.sessionID || event?.sessionId || event?.id || 'unknown';
          const projectID = event?.projectID || event?.projectId || 'unknown';
          const model = event?.model;
          const parentID = event?.parentID || event?.parentId;

          debugLog(`[PAI] SessionID: ${sessionID}`);
          debugLog(`[PAI] ProjectID: ${projectID}`);
          if (model) debugLog(`[PAI] Model: ${model}`);
          if (parentID) debugLog(`[PAI] ParentID: ${parentID} (subagent)`);
        }

        // Filter for lifecycle events (start, stop, idle, etc.)
        if (eventType.includes('start') || eventType.includes('created') ||
            eventType.includes('stop') || eventType.includes('ended') ||
            eventType.includes('idle') || eventType.includes('pause')) {
          debugLog(`[PAI] *** LIFECYCLE EVENT DETECTED ***`);
          debugLog(`[PAI] Lifecycle event type: ${eventType}`);
        }

        debugLog(`[PAI] ========== END EVENT ==========`);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        debugLog(`[PAI] ERROR in event handler: ${errorMsg}`);
        debugLog(`[PAI] Error stack: ${error instanceof Error ? error.stack : 'N/A'}`);
      }
    }
  };
};
