/**
 * PAI-OpenCode Unified Plugin
 *
 * Single plugin that combines all PAI hook functionality:
 * - Context injection (SessionStart equivalent)
 * - Security validation (PreToolUse blocking equivalent)
 * - Tool lifecycle (PreToolUse/PostToolUse equivalents)
 * - Session lifecycle (Stop equivalent)
 *
 * IMPORTANT: This plugin NEVER uses console.log!
 * All logging goes through file-logger.ts to prevent TUI corruption.
 *
 * @module pai-unified
 */

import type { Plugin, Hooks } from "@opencode-ai/plugin";
import { loadContext } from "./handlers/context-loader";
import { validateSecurity } from "./handlers/security-validator";
import { fileLog, fileLogError, clearLog } from "./lib/file-logger";

/**
 * PAI Unified Plugin
 *
 * Exports all hooks in a single plugin for OpenCode.
 */
export const PaiUnified: Plugin = async (ctx) => {
  // Clear log at plugin load (new session)
  clearLog();
  fileLog("=== PAI-OpenCode Plugin Loaded ===");
  fileLog(`Working directory: ${process.cwd()}`);

  const hooks: Hooks = {
    /**
     * CONTEXT INJECTION (SessionStart equivalent)
     *
     * Injects CORE skill context into the chat system.
     * This is equivalent to PAI's load-core-context.ts hook.
     *
     * Note: This hook is EXPERIMENTAL in OpenCode.
     */
    "experimental.chat.system.transform": async (input, output) => {
      try {
        fileLog("Injecting context...");

        const result = await loadContext();

        if (result.success && result.context) {
          output.system.push(result.context);
          fileLog("Context injected successfully");
        } else {
          fileLog(`Context injection skipped: ${result.error || "unknown"}`, "warn");
        }
      } catch (error) {
        fileLogError("Context injection failed", error);
        // Don't throw - continue without context
      }
    },

    /**
     * SECURITY BLOCKING (PreToolUse exit(2) equivalent)
     *
     * Validates tool executions for security threats.
     * Can BLOCK dangerous operations by setting output.status = "deny".
     *
     * This is equivalent to PAI's security-validator.ts hook.
     */
    "permission.ask": async (input, output) => {
      try {
        // Extract tool info from Permission input
        const tool = (input as any).tool || "unknown";
        const args = (input as any).args || {};

        const result = await validateSecurity({ tool, args });

        switch (result.action) {
          case "block":
            output.status = "deny";
            fileLog(`BLOCKED: ${result.reason}`, "error");
            break;

          case "confirm":
            output.status = "ask";
            fileLog(`CONFIRM: ${result.reason}`, "warn");
            break;

          case "allow":
          default:
            // Don't modify output.status - let it proceed
            fileLog(`ALLOWED: ${tool}`, "debug");
            break;
        }
      } catch (error) {
        fileLogError("Permission check failed", error);
        // Fail-open: on error, don't block
      }
    },

    /**
     * PRE-TOOL EXECUTION (PreToolUse args modification)
     *
     * Called before tool execution.
     * Can modify args if needed.
     * Security blocking happens in permission.ask, not here.
     */
    "tool.execute.before": async (input, output) => {
      try {
        fileLog(`Tool before: ${input.tool}`, "debug");

        // Currently no arg modifications needed
        // This hook is for future arg manipulation if required
      } catch (error) {
        fileLogError("Tool before hook failed", error);
      }
    },

    /**
     * POST-TOOL EXECUTION (PostToolUse equivalent)
     *
     * Called after tool execution.
     * Used for learning capture, signals, etc.
     */
    "tool.execute.after": async (input, output) => {
      try {
        fileLog(`Tool after: ${input.tool}`, "debug");

        // Check for Task tool (subagent) completion
        if (input.tool === "Task") {
          fileLog("Subagent task completed", "info");
          // Future: Capture subagent learnings
        }

        // Future: Learning capture
        // Future: Signal processing
        // Future: Work session tracking
      } catch (error) {
        fileLogError("Tool after hook failed", error);
      }
    },

    /**
     * SESSION LIFECYCLE (Stop equivalent)
     *
     * Handles session events like start and end.
     */
    event: async (input) => {
      try {
        const eventType = (input.event as any)?.type || "";

        if (eventType.includes("session.created")) {
          fileLog("Session started", "info");
          // Future: Session initialization
        }

        if (
          eventType.includes("session.ended") ||
          eventType.includes("session.idle")
        ) {
          fileLog("Session ending", "info");
          // Future: Session cleanup
          // Future: Save work session state
        }

        // Log all events for debugging
        fileLog(`Event: ${eventType}`, "debug");
      } catch (error) {
        fileLogError("Event handler failed", error);
      }
    },
  };

  return hooks;
};

// Default export for OpenCode plugin system
export default PaiUnified;
