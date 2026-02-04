/**
 * Observability Emitter Handler
 * 
 * Captures events from PAI-OpenCode plugin hooks and sends them
 * to the Observability Server for persistence and real-time display.
 * 
 * Design Principles:
 * - Fire and forget: Never blocks plugin execution
 * - Fail silently: Server unavailability is not an error
 * - Fast timeout: 1 second max to avoid latency impact
 * 
 * @module observability-emitter
 * @version 1.0.0
 */

import { randomUUID } from "crypto";
import { fileLog, fileLogError } from "../lib/file-logger";

// Configuration
const OBSERVABILITY_URL = `http://localhost:${process.env.PAI_OBSERVABILITY_PORT || "8889"}/events`;
const ENABLED = process.env.PAI_OBSERVABILITY_ENABLED !== "false";
const TIMEOUT_MS = 1000; // 1 second timeout

// Current session ID (set at session start)
let currentSessionId: string | null = null;

/**
 * Event types that can be emitted
 */
export type EventType =
  | "session.start"
  | "session.end"
  | "tool.execute"
  | "tool.blocked"
  | "security.block"
  | "security.warn"
  | "message.user"
  | "message.assistant"
  | "rating.explicit"
  | "rating.implicit"
  | "agent.spawn"
  | "agent.complete"
  | "voice.sent"
  | "learning.captured"
  | "isc.validated"
  | "context.loaded";

/**
 * Observability event structure
 */
export interface ObservabilityEvent {
  id: string;
  timestamp: string;
  session_id: string;
  event_type: EventType;
  data: Record<string, any>;
}

/**
 * Emit an event to the observability server
 * 
 * This function is designed to be fire-and-forget:
 * - Uses a short timeout (1s)
 * - Never throws errors
 * - Logs failures but doesn't propagate them
 */
export async function emitEvent(
  eventType: EventType,
  data: Record<string, any> = {}
): Promise<void> {
  // Skip if disabled
  if (!ENABLED) return;

  // Generate session ID if not set
  if (!currentSessionId) {
    currentSessionId = generateSessionId();
  }

  const event: ObservabilityEvent = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    session_id: currentSessionId,
    event_type: eventType,
    data,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    await fetch(OBSERVABILITY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    fileLog(`[Observability] Emitted: ${eventType}`, "debug");
  } catch (error) {
    // Fail silently - observability is non-critical
    // Only log in debug mode to avoid noise
    fileLog(`[Observability] Failed to emit ${eventType}: ${error}`, "debug");
  }
}

/**
 * Generate a session ID
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ses_${timestamp}_${random}`;
}

/**
 * Set the current session ID (called at session start)
 */
export function setSessionId(sessionId: string): void {
  currentSessionId = sessionId;
}

/**
 * Get the current session ID
 */
export function getSessionId(): string {
  if (!currentSessionId) {
    currentSessionId = generateSessionId();
  }
  return currentSessionId;
}

/**
 * Reset session (called at session end)
 */
export function resetSession(): void {
  currentSessionId = null;
}

// ============================================================================
// Event Helper Functions
// These wrap emitEvent with type-specific data formatting
// ============================================================================

/**
 * Emit session start event
 */
export async function emitSessionStart(metadata: Record<string, any> = {}): Promise<void> {
  const sessionId = generateSessionId();
  setSessionId(sessionId);
  
  await emitEvent("session.start", {
    ...metadata,
    working_directory: process.cwd(),
    platform: process.platform,
  });
}

/**
 * Emit session end event
 */
export async function emitSessionEnd(
  duration_ms?: number,
  stats?: Record<string, any>
): Promise<void> {
  await emitEvent("session.end", {
    duration_ms,
    ...stats,
  });
  resetSession();
}

/**
 * Emit tool execution event
 */
export async function emitToolExecute(
  tool: string,
  args: Record<string, any>,
  duration_ms?: number,
  success?: boolean,
  result_length?: number
): Promise<void> {
  await emitEvent("tool.execute", {
    tool,
    args_keys: Object.keys(args),
    args_preview: JSON.stringify(args).substring(0, 200),
    duration_ms,
    success,
    result_length,
  });
}

/**
 * Emit security block event
 */
export async function emitSecurityBlock(
  tool: string,
  reason: string,
  pattern?: string
): Promise<void> {
  await emitEvent("security.block", {
    tool,
    reason,
    pattern,
  });
}

/**
 * Emit security warning event
 */
export async function emitSecurityWarn(
  tool: string,
  reason: string
): Promise<void> {
  await emitEvent("security.warn", {
    tool,
    reason,
  });
}

/**
 * Emit user message event
 */
export async function emitUserMessage(
  content_length: number,
  has_rating: boolean = false
): Promise<void> {
  await emitEvent("message.user", {
    content_length,
    has_rating,
  });
}

/**
 * Emit assistant message event
 */
export async function emitAssistantMessage(
  content_length: number,
  has_voice_line: boolean = false,
  has_isc: boolean = false
): Promise<void> {
  await emitEvent("message.assistant", {
    content_length,
    has_voice_line,
    has_isc,
  });
}

/**
 * Emit explicit rating event
 */
export async function emitExplicitRating(
  score: number,
  comment?: string
): Promise<void> {
  await emitEvent("rating.explicit", {
    score,
    has_comment: !!comment,
    comment_preview: comment?.substring(0, 100),
  });
}

/**
 * Emit implicit sentiment event
 */
export async function emitImplicitSentiment(
  score: number,
  confidence: number,
  indicators: string[]
): Promise<void> {
  await emitEvent("rating.implicit", {
    score,
    confidence,
    indicators,
  });
}

/**
 * Emit agent spawn event
 */
export async function emitAgentSpawn(
  agent_type: string,
  prompt_length: number
): Promise<void> {
  await emitEvent("agent.spawn", {
    agent_type,
    prompt_length,
  });
}

/**
 * Emit agent complete event
 */
export async function emitAgentComplete(
  agent_type: string,
  result_length: number,
  duration_ms?: number
): Promise<void> {
  await emitEvent("agent.complete", {
    agent_type,
    result_length,
    duration_ms,
  });
}

/**
 * Emit voice notification event
 */
export async function emitVoiceSent(
  message_length: number,
  voice_id?: string
): Promise<void> {
  await emitEvent("voice.sent", {
    message_length,
    voice_id,
  });
}

/**
 * Emit learning captured event
 */
export async function emitLearningCaptured(
  category: string,
  filepath: string
): Promise<void> {
  await emitEvent("learning.captured", {
    category,
    filepath,
  });
}

/**
 * Emit ISC validation event
 */
export async function emitISCValidated(
  criteria_count: number,
  all_passed: boolean,
  warnings: string[]
): Promise<void> {
  await emitEvent("isc.validated", {
    criteria_count,
    all_passed,
    warning_count: warnings.length,
    warnings: warnings.slice(0, 5),
  });
}

/**
 * Emit context loaded event
 */
export async function emitContextLoaded(
  files_loaded: number,
  total_size: number
): Promise<void> {
  await emitEvent("context.loaded", {
    files_loaded,
    total_size,
  });
}
