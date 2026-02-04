/**
 * PAI-OpenCode Unified Plugin
 *
 * Single plugin that combines all PAI v2.4 hook functionality:
 * - Context injection (SessionStart equivalent)
 * - Security validation (PreToolUse blocking equivalent)
 * - Work tracking (AutoWorkCreation + SessionSummary)
 * - Rating capture (ExplicitRatingCapture)
 * - Agent output capture (AgentOutputCapture)
 * - Learning extraction (WorkCompletionLearning)
 *
 * IMPORTANT: This plugin NEVER uses console.log!
 * All logging goes through file-logger.ts to prevent TUI corruption.
 *
 * @module pai-unified
 * @version 1.0.0
 */

import type { Plugin, Hooks } from "@opencode-ai/plugin";
import { loadContext } from "./handlers/context-loader";
import { validateSecurity } from "./handlers/security-validator";
import { restoreSkillFiles } from "./handlers/skill-restore";
import {
  createWorkSession,
  completeWorkSession,
  getCurrentSession,
  appendToThread,
} from "./handlers/work-tracker";
import { captureRating, detectRating } from "./handlers/rating-capture";
import {
  captureAgentOutput,
  isTaskTool,
} from "./handlers/agent-capture";
import { extractLearningsFromWork } from "./handlers/learning-capture";
import { validateISC } from "./handlers/isc-validator";
import {
  handleVoiceNotification,
  extractVoiceCompletion,
} from "./handlers/voice-notification";
import { handleUpdateCounts } from "./handlers/update-counts";
import { handleResponseCapture } from "./handlers/response-capture";
import { handleImplicitSentiment } from "./handlers/implicit-sentiment";
import { handleTabState } from "./handlers/tab-state";
import { fileLog, fileLogError, clearLog } from "./lib/file-logger";
import {
  emitSessionStart,
  emitSessionEnd,
  emitToolExecute,
  emitSecurityBlock,
  emitSecurityWarn,
  emitUserMessage,
  emitAssistantMessage,
  emitExplicitRating,
  emitImplicitSentiment,
  emitAgentSpawn,
  emitAgentComplete,
  emitVoiceSent,
  emitLearningCaptured,
  emitISCValidated,
  emitContextLoaded,
} from "./handlers/observability-emitter";

/**
 * Extract text content from message
 *
 * OpenCode v1.1.x can provide message.content as:
 * - string (simple case)
 * - array of blocks (structured content)
 *
 * This helper handles both cases robustly.
 */
function extractTextContent(message: any): string {
  if (!message?.content) return "";

  // Plain string
  if (typeof message.content === "string") {
    return message.content;
  }

  // Structured blocks/parts (OpenCode v1.1.x pattern)
  if (Array.isArray(message.content)) {
    return message.content
      .filter((block: any) => block.type === "text" || block.text)
      .map((block: any) => block.text || block.content || "")
      .join(" ")
      .trim();
  }

  // Fallback: stringify
  return String(message.content);
}

/**
 * PAI Unified Plugin
 *
 * Exports all hooks in a single plugin for OpenCode.
 * Implements PAI v2.4 hook functionality.
 */
export const PaiUnified: Plugin = async (ctx) => {
  // Clear log at plugin load (new session)
  clearLog();
  fileLog("=== PAI-OpenCode Plugin v1.0.0 Loaded ===");
  fileLog(`Working directory: ${process.cwd()}`);
  fileLog("Hooks: Context, Security, Work, Ratings, Agents, Learning");

  const hooks: Hooks = {
    /**
     * CONTEXT INJECTION (SessionStart equivalent)
     *
     * Injects PAI skill context into the chat system.
     * Equivalent to PAI v2.4 load-core-context.ts hook.
     */
    "experimental.chat.system.transform": async (input, output) => {
      try {
        fileLog("Injecting context...");
        
        // Emit session start
        emitSessionStart({ model: (input as any).model }).catch(() => {});

        const result = await loadContext();

        if (result.success && result.context) {
          output.system.push(result.context);
          fileLog("Context injected successfully");
          
          // Emit context loaded
          const contextSize = result.context.length;
          emitContextLoaded(1, contextSize).catch(() => {});
        } else {
          fileLog(
            `Context injection skipped: ${result.error || "unknown"}`,
            "warn"
          );
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
     * Equivalent to PAI v2.4 security-validator.ts hook.
     */
    "permission.ask": async (input, output) => {
      try {
        fileLog(`>>> PERMISSION.ASK CALLED <<<`, "info");
        fileLog(
          `permission.ask input: ${JSON.stringify(input).substring(0, 200)}`,
          "debug"
        );

        // Extract tool info from Permission input
        const tool = (input as any).tool || "unknown";
        const args = (input as any).args || {};

        const result = await validateSecurity({ tool, args });

        switch (result.action) {
          case "block":
            output.status = "deny";
            fileLog(`BLOCKED: ${result.reason}`, "error");
            emitSecurityBlock(tool, result.reason || "Unknown").catch(() => {});
            break;

          case "confirm":
            output.status = "ask";
            fileLog(`CONFIRM: ${result.reason}`, "warn");
            emitSecurityWarn(tool, result.reason || "Requires confirmation").catch(() => {});
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
     * PRE-TOOL EXECUTION - SECURITY BLOCKING
     *
     * Called before EVERY tool execution.
     * Can block dangerous commands by THROWING AN ERROR.
     */
    "tool.execute.before": async (input, output) => {
      fileLog(`Tool before: ${input.tool}`, "debug");
      // Args are in OUTPUT, not input! OpenCode API quirk.
      fileLog(
        `output.args: ${JSON.stringify(output.args ?? {}).substring(0, 500)}`,
        "debug"
      );

      // Security validation - throws error to block dangerous commands
      const result = await validateSecurity({
        tool: input.tool,
        args: output.args ?? {},
      });

      if (result.action === "block") {
        fileLog(`BLOCKED: ${result.reason}`, "error");
        emitSecurityBlock(input.tool, result.reason || "Unknown", result.pattern).catch(() => {});
        // Throwing an error blocks the tool execution
        throw new Error(`[PAI Security] ${result.message || result.reason}`);
      }

      if (result.action === "confirm") {
        fileLog(`WARNING: ${result.reason}`, "warn");
        emitSecurityWarn(input.tool, result.reason || "Requires confirmation").catch(() => {});
        // For now, log warning but allow - OpenCode will handle its own permission prompt
      }

      fileLog(`Security check passed for ${input.tool}`, "debug");
    },

    /**
     * POST-TOOL EXECUTION (PostToolUse + AgentOutputCapture equivalent)
     *
     * Called after tool execution.
     * Captures subagent outputs to MEMORY/RESEARCH/
     * Equivalent to PAI v2.4 AgentOutputCapture hook.
     */
    "tool.execute.after": async (input, output) => {
      try {
        fileLog(`Tool after: ${input.tool}`, "debug");
        
        // Emit tool execution
        const args = (input as any).args || (output as any).args || {};
        const resultLength = output.result ? JSON.stringify(output.result).length : 0;
        emitToolExecute(input.tool, args, undefined, true, resultLength).catch(() => {});

        // === AGENT OUTPUT CAPTURE ===
        // Check for Task tool (subagent) completion
        if (isTaskTool(input.tool)) {
          fileLog("Subagent task completed, capturing output...", "info");
          
          // Emit agent complete
          const agentType = args.subagent_type || "unknown";
          emitAgentComplete(agentType, resultLength).catch(() => {});

          const result = output.result;

          const captureResult = await captureAgentOutput(args, result);
          if (captureResult.success && captureResult.filepath) {
            fileLog(`Agent output saved: ${captureResult.filepath}`, "info");
          }
        }
      } catch (error) {
        fileLogError("Tool after hook failed", error);
      }
    },

    /**
     * CHAT MESSAGE HANDLER
     * (UserPromptSubmit: AutoWorkCreation + ExplicitRatingCapture + FormatReminder)
     *
     * Called when user submits a message.
     * Equivalent to PAI v2.4 AutoWorkCreation + ExplicitRatingCapture hooks.
     *
     * CRITICAL FIX (Issue #6): OpenCode v1.1.x provides message in OUTPUT, not INPUT!
     * - input contains: sessionID, agent, model (metadata only)
     * - output contains: message (the actual user message), parts
     */
    "chat.message": async (input, output) => {
      try {
        // DEBUG: Log full structures to diagnose Issue #6
        fileLog(`[chat.message] input keys: ${Object.keys(input).join(", ")}`, "debug");
        fileLog(`[chat.message] output keys: ${Object.keys(output).join(", ")}`, "debug");
        
        // FIXED: Read from output.message, NOT input.message!
        // See: https://github.com/Steffen025/pai-opencode/issues/6
        const msg = (output as any).message;

        // Fallback for backward compatibility with older OpenCode versions
        const fallbackMsg = (input as any).message;
        const message = msg || fallbackMsg;

        if (!message) {
          fileLog("[chat.message] No message found in input or output", "warn");
          return;
        }

        // DEBUG: Log message structure
        fileLog(`[chat.message] message keys: ${Object.keys(message).join(", ")}`, "debug");
        fileLog(`[chat.message] message.content type: ${typeof message.content}`, "debug");
        if (message.content) {
          fileLog(`[chat.message] message.content: ${JSON.stringify(message.content).substring(0, 200)}`, "debug");
        }

        const role = message.role || "unknown";
        const content = extractTextContent(message);

        // Only process user messages
        if (role !== "user") return;

        fileLog(
          `[chat.message] User: ${content.substring(0, 100)}...`,
          "debug"
        );

        // === AUTO-WORK CREATION ===
        // Create work session on first user prompt if none exists
        const currentSession = getCurrentSession();
        if (!currentSession) {
          const workResult = await createWorkSession(content);
          if (workResult.success && workResult.session) {
            fileLog(`Work session started: ${workResult.session.id}`, "info");
          }
        } else {
          // Append to existing thread
          await appendToThread(`**User:** ${content.substring(0, 200)}...`);
        }

        // === EXPLICIT RATING CAPTURE ===
        // Check if message is a rating (e.g., "8", "7 - needs work", "9/10")
        const rating = detectRating(content);
        if (rating) {
          const ratingResult = await captureRating(content, "user message");
          if (ratingResult.success && ratingResult.rating) {
            fileLog(`Rating captured: ${ratingResult.rating.score}/10`, "info");
          }
        }

        // === FORMAT REMINDER ===
        // For non-trivial prompts, nudge towards Algorithm format
        // (Not blocking, just logging for awareness)
        if (content.length > 100 && !content.toLowerCase().includes("trivial")) {
          fileLog("Non-trivial prompt detected, Algorithm format recommended", "debug");
        }
      } catch (error) {
        fileLogError("chat.message handler failed", error);
      }
    },

    /**
     * SESSION LIFECYCLE
     * (SessionStart: skill-restore, SessionEnd: WorkCompletionLearning + SessionSummary)
     *
     * Handles session events like start and end.
     * Equivalent to PAI v2.4 StopOrchestrator + SessionSummary + WorkCompletionLearning.
     */
    event: async (input) => {
      try {
        const eventType = (input.event as any)?.type || "";

        // === SESSION START ===
        if (eventType.includes("session.created")) {
          fileLog("=== Session Started ===", "info");
          
          // Emit session start (backup emit, primary is in context injection)
          emitSessionStart().catch(() => {});

          // SKILL RESTORE WORKAROUND
          // OpenCode modifies SKILL.md files when loading them.
          // Restore them to git state on session start.
          try {
            const restoreResult = await restoreSkillFiles();
            if (restoreResult.restored.length > 0) {
              fileLog(
                `Skill restore: ${restoreResult.restored.length} files restored`,
                "info"
              );
            }
          } catch (error) {
            fileLogError("Skill restore failed", error);
            // Don't throw - session should continue
          }
        }

        // === SESSION END ===
        if (
          eventType.includes("session.ended") ||
          eventType.includes("session.idle")
        ) {
          fileLog("=== Session Ending ===", "info");

          // WORK COMPLETION LEARNING
          // Extract learnings from the work session
          try {
            const learningResult = await extractLearningsFromWork();
            if (learningResult.success && learningResult.learnings.length > 0) {
              fileLog(
                `Extracted ${learningResult.learnings.length} learnings`,
                "info"
              );
              
              // Emit learning captured for each learning
              learningResult.learnings.forEach((learning: any) => {
                emitLearningCaptured(learning.category || "unknown", learning.filepath || "unknown").catch(() => {});
              });
            }
          } catch (error) {
            fileLogError("Learning extraction failed", error);
          }

          // SESSION SUMMARY
          // Complete the work session
          try {
            const completeResult = await completeWorkSession();
            if (completeResult.success) {
              fileLog("Work session completed", "info");
            }
          } catch (error) {
            fileLogError("Work session completion failed", error);
          }

          // UPDATE COUNTS
          // Update settings.json with fresh system counts
          try {
            await handleUpdateCounts();
          } catch (error) {
            fileLogError("Update counts failed (non-blocking)", error);
          }
          
          // Emit session end
          emitSessionEnd().catch(() => {});
        }

        // === ASSISTANT MESSAGE HANDLING (ISC VALIDATION + VOICE + CAPTURE) ===
        // Validate ISC, send voice notification, and capture response
        if (eventType === "message.updated") {
          const eventData = input.event as any;
          const message = eventData?.properties?.message;
          
          if (message?.role === "assistant") {
            const responseText = extractTextContent(message);
            const sessionId = (input as any).sessionId || "unknown";
            
            if (responseText.length > 100) {
              // Run ISC validation on non-trivial assistant responses
              try {
                const iscResult = await validateISC(responseText);
                if (iscResult.algorithmDetected) {
                  fileLog(`[ISC Validation] Algorithm detected, ${iscResult.criteriaCount} criteria found`, "info");
                  if (iscResult.warnings.length > 0) {
                    fileLog(`[ISC Validation] Warnings: ${iscResult.warnings.join(", ")}`, "warn");
                  }
                  
                  // Emit ISC validation
                  emitISCValidated(
                    iscResult.criteriaCount || 0,
                    iscResult.warnings.length === 0,
                    iscResult.warnings || []
                  ).catch(() => {});
                }
              } catch (error) {
                fileLogError("[ISC Validation] Failed", error);
              }

              // === VOICE NOTIFICATION ===
              // Extract voice completion and send to TTS
              try {
                const voiceCompletion = extractVoiceCompletion(responseText);
                if (voiceCompletion) {
                  fileLog(`[Voice] Found completion: "${voiceCompletion.substring(0, 50)}..."`, "info");
                  await handleVoiceNotification(voiceCompletion, sessionId);
                  
                  // Emit voice sent
                  emitVoiceSent(voiceCompletion.length).catch(() => {});
                  
                  // === TAB STATE UPDATE ===
                  // Update terminal tab title/color after completion
                  try {
                    await handleTabState(voiceCompletion, 'completed');
                  } catch (error) {
                    fileLogError("[TabState] Failed to update tab state (non-blocking)", error);
                  }
                } else {
                  fileLog("[Voice] No voice completion found in response", "debug");
                }
              } catch (error) {
                fileLogError("[Voice] Voice notification failed (non-blocking)", error);
              }
              
              // Emit assistant message
              const hasVoiceLine = !!extractVoiceCompletion(responseText);
              const hasISC = responseText.includes("🤖") || responseText.includes("OBSERVE");
              emitAssistantMessage(responseText.length, hasVoiceLine, hasISC).catch(() => {});

              // === RESPONSE CAPTURE ===
              // Capture response for work tracking and learning
              try {
                await handleResponseCapture(responseText, sessionId);
              } catch (error) {
                fileLogError("[Capture] Response capture failed (non-blocking)", error);
              }
            }
          }
        }

        // === USER MESSAGE HANDLING ===
        // OpenCode sends message.updated AND message.part.updated events
        // We need to check BOTH for user messages
        if (eventType === "message.updated" || eventType === "message.part.updated") {
          // DEBUG: Log full event structure to find where user message is
          const eventData = input.event as any;
          fileLog(`[message.updated] EVENT KEYS: ${Object.keys(eventData || {}).join(", ")}`, "info");
          fileLog(`[message.updated] properties keys: ${Object.keys(eventData?.properties || {}).join(", ")}`, "info");
          fileLog(`[message.updated] FULL EVENT: ${JSON.stringify(eventData).substring(0, 500)}`, "debug");
          
          // FIXED: message.part.updated uses properties.part, not properties.message
          // Structure: eventData.properties.part.text (for user messages)
          const part = eventData?.properties?.part;
          const message = eventData?.properties?.message;
          
          // Extract text from part (message.part.updated) or message (message.updated)
          let userText: string | null = null;
          
          if (part?.type === "text" && typeof part.text === "string") {
            // This is a text part from message.part.updated
            userText = part.text;
            fileLog(`[message.part.updated] Extracted from part.text: "${userText.substring(0, 100)}..."`, "debug");
          } else if (message?.role === "user") {
            // This is a full message from message.updated
            userText = extractTextContent(message);
            fileLog(`[message.updated] Extracted from message.content: "${userText.substring(0, 100)}..."`, "debug");
          }
          
          // Process user message if we found it
          if (userText && userText.trim().length > 0) {
            fileLog(`[USER MESSAGE] Content: "${userText.substring(0, 100)}..."`, "info");
            
            // === EXPLICIT RATING CAPTURE ===
            const rating = detectRating(userText);
            if (rating) {
              fileLog(`[RATING DETECTED] Score: ${rating}`, "info");
              const ratingResult = await captureRating(userText, "user message");
              if (ratingResult.success && ratingResult.rating) {
                fileLog(`Rating captured: ${ratingResult.rating.score}/10`, "info");
                
                // Emit explicit rating
                emitExplicitRating(
                  ratingResult.rating.score,
                  ratingResult.rating.comment
                ).catch(() => {});
              } else {
                fileLog(`Rating capture failed: ${ratingResult.error}`, "warn");
              }
            } else {
              // === IMPLICIT SENTIMENT CAPTURE ===
              // Only run if NOT an explicit rating
              try {
                const sessionId = (input as any).sessionID || 'unknown';
                const sentimentResult = await handleImplicitSentiment(userText, sessionId);
                
                // Emit implicit sentiment if captured
                if (sentimentResult && sentimentResult.score !== undefined) {
                  emitImplicitSentiment(
                    sentimentResult.score,
                    sentimentResult.confidence || 0,
                    sentimentResult.indicators || []
                  ).catch(() => {});
                }
              } catch (error) {
                fileLogError('[ImplicitSentiment] Failed (non-blocking)', error);
              }
            }
            
            // Emit user message
            emitUserMessage(userText.length, !!rating).catch(() => {});
            
            // === AUTO-WORK CREATION ===
            const currentSession = getCurrentSession();
            if (!currentSession && userText.length > 20) {
              const workResult = await createWorkSession(userText);
              if (workResult.success && workResult.session) {
                fileLog(`Work session started: ${workResult.session.id}`, "info");
              }
            } else if (currentSession) {
              await appendToThread(`**User:** ${userText.substring(0, 200)}...`);
            }
          }
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
