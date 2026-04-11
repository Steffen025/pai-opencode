/**
 * PAI-OpenCode Unified Plugin
 *
 * Single plugin that combines all PAI hook functionality across two layers:
 *
 * SCHICHT 1 — Hooks (active, blocking):
 * - Context injection       (session.systemPrompt)
 * - Security validation     (permission.ask + tool.execute.before)
 * - Work tracking           (chat.message)
 * - Tool capture            (tool.execute.after)
 *
 * SCHICHT 2 — Event Bus (passive, via event handler):
 * Session lifecycle:
 * - session.created         → skill-restore, version-check, session-info logging
 * - session.ended/idle      → learnings, integrity, work-complete, cleanup, relationship-memory
 * - session.compacted       → learning rescue (POST-compaction)
 * - session.updated         → session title tracking
 * - session.error           → error diagnostics
 *
 * COMPACTION HANDLING (2 komplementäre Mechanismen):
 * - experimental.session.compacting (WP-N2) → Context injection DURING compaction
 * - session.compacted (WP-A) → Learning rescue AFTER compaction
 * Beide notwendig: Einer beeinflusst die Summary, der andere rettet Daten.
 *
 * Message events:
 * - message.updated         → ISC validation, voice, response-capture, rating, sentiment
 *
 * System events:
 * - permission.asked        → full permission audit log
 * - command.executed        → /command usage tracking
 * - installation.update.available → native OpenCode update notification
 *
 * v3.0 HANDLERS (added 2026-02-17):
 * - Algorithm state tracking, agent execution guard, skill guard,
 *   version check, integrity check, effort level detection
 *
 * v3.0-WP-A HANDLERS (added 2026-03-06):
 * - PRD sync, session cleanup, last response cache,
 *   relationship memory, question tracking
 *
 * v3.0-WP-N7 HANDLERS (added 2026-03-12):
 * - roborev-trigger: code_review custom tool for AI-powered code review
 *
 * IMPORTANT: This plugin NEVER uses console.log!
 * All logging goes through file-logger.ts to prevent TUI corruption.
 *
 * @module pai-unified
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// ESM-equivalent of __dirname — .opencode/package.json has "type": "module"
// so CommonJS globals (__dirname / __filename) are not defined. Used below
// by loadMinimalBootstrap() to resolve the PAI dir relative to this plugin
// file regardless of the current working directory opencode is launched from.
const PLUGIN_DIR = path.dirname(fileURLToPath(import.meta.url));
import type { Hooks, Plugin } from "@opencode-ai/plugin";
import { captureAgentOutput, isTaskTool } from "./handlers/agent-capture";
import { validateAgentExecution } from "./handlers/agent-execution-guard";
// v3.0 HANDLERS
import { trackAlgorithmState } from "./handlers/algorithm-tracker";
import { checkForUpdates } from "./handlers/check-version";
import { injectCompactionContext } from "./handlers/compaction-intelligence";
import { detectEffortLevel } from "./handlers/format-reminder";
import { handleImplicitSentiment } from "./handlers/implicit-sentiment";
import { runIntegrityCheck } from "./handlers/integrity-check";
import { validateISC } from "./handlers/isc-validator";
import { cacheLastResponse, readLastResponse } from "./handlers/last-response-cache";
import { extractLearningsFromWork } from "./handlers/learning-capture";
import {
	emitAgentComplete,
	emitAssistantMessage,
	emitContextLoaded,
	emitExplicitRating,
	emitImplicitSentiment,
	emitISCValidated,
	emitLearningCaptured,
	emitSecurityBlock,
	emitSecurityWarn,
	emitSessionEnd,
	emitSessionStart,
	emitToolExecute,
	emitUserMessage,
	emitVoiceSent,
} from "./handlers/observability-emitter";
// WP-A: New handlers (PR #A)
import { syncPRDToRegistry } from "./handlers/prd-sync";
import { extractAskUserQuestionAnswer, trackQuestionAnswered } from "./handlers/question-tracking";
import { captureRating, detectRating } from "./handlers/rating-capture";
import { captureRelationshipMemory } from "./handlers/relationship-memory";
import { handleResponseCapture } from "./handlers/response-capture";
import { codeReviewTool } from "./handlers/roborev-trigger";
import { validateSecurity } from "./handlers/security-validator";
import { cleanupSession } from "./handlers/session-cleanup";
import {
	captureSubagentSession,
	sessionRegistryTool,
	sessionResultsTool,
} from "./handlers/session-registry";
import { validateSkillInvocation } from "./handlers/skill-guard";
import { restoreSkillFiles } from "./handlers/skill-restore";
import { handleTabState } from "./handlers/tab-state";
import { handleUpdateCounts } from "./handlers/update-counts";
import { extractVoiceCompletion, handleVoiceNotification } from "./handlers/voice-notification";
import {
	appendToThread,
	completeWorkSession,
	createWorkSession,
	getCurrentSession,
	isTrivialMessage,
} from "./handlers/work-tracker";
import { clearLog, fileLog, fileLogError } from "./lib/file-logger";

/**
 * MESSAGE DEDUPLICATION CACHE
 *
 * Prevents double-processing of user messages between "chat.message" and "message.updated" events.
 * Uses a short-lived in-memory cache keyed by message content hash.
 *
 * Issue: Both "chat.message" and "message.updated" fire for the same user message,
 * causing duplicate side-effects (detectRating, createWorkSession, appendToThread, etc.)
 *
 * Solution: Each handler checks this cache before processing. If message was recently
 * processed, skip to avoid double writes.
 */
const messageDedupeCache = new Map<string, number>();
const MESSAGE_DEDUPE_TTL_MS = 5000; // 5 seconds - enough for both events to fire

/**
 * SESSION MESSAGE BUFFERS (session-scoped)
 * Accumulates user and assistant messages per session so relationship-memory.ts
 * has real content to analyze at session end.
 * Keyed by sessionId to prevent cross-session contamination in concurrent sessions.
 * Entries are cleaned up on session.ended to prevent memory leaks.
 */
const sessionUserMessages = new Map<string, string[]>();
const sessionAssistantMessages = new Map<string, string[]>();

/** Helper: get or create message buffer for a session */
function getUserMessages(sessionId: string): string[] {
	if (!sessionUserMessages.has(sessionId)) sessionUserMessages.set(sessionId, []);
	return sessionUserMessages.get(sessionId)!;
}
function getAssistantMessages(sessionId: string): string[] {
	if (!sessionAssistantMessages.has(sessionId)) sessionAssistantMessages.set(sessionId, []);
	return sessionAssistantMessages.get(sessionId)!;
}

/**
 * Check if a message was recently processed (deduplication)
 */
function wasMessageRecentlyProcessed(content: string): boolean {
	const hash = `${content.length}:${content.substring(0, 100)}`; // Simple hash
	const now = Date.now();
	const lastProcessed = messageDedupeCache.get(hash);

	if (lastProcessed && now - lastProcessed < MESSAGE_DEDUPE_TTL_MS) {
		return true; // Recently processed - skip
	}

	// Mark as processed
	messageDedupeCache.set(hash, now);

	// Cleanup old entries (prevent memory leak)
	for (const [key, timestamp] of messageDedupeCache.entries()) {
		if (now - timestamp > MESSAGE_DEDUPE_TTL_MS * 2) {
			messageDedupeCache.delete(key);
		}
	}

	return false;
}

/**
 * Extract text content from message
 *
 * FIX for Issue #28: OpenCode delivers message text in multiple shapes
 * depending on version and context. Must check ALL known locations:
 *
 * 1. message.content (string)          — simple case
 * 2. message.content (array of blocks) — structured content
 * 3. message.parts (array)             — alternative shape (chat.message hook)
 * 4. output.parts (array)              — output-side parts (chat.message output)
 *
 * The bug: early return on !message.content skipped cases 3+4,
 * causing rating capture to fail when text arrived via parts.
 *
 * @param message - The message object
 * @param outputParts - Optional: parts from the output param (chat.message hook)
 */
function extractTextContent(message: any, outputParts?: any[]): string {
	// 1. Plain string content
	if (typeof message?.content === "string" && message.content.trim()) {
		return message.content;
	}

	// 2. Structured blocks in message.content (OpenCode v1.1.x array pattern)
	if (Array.isArray(message?.content)) {
		const text = message.content
			.filter((block: any) => block.type === "text" || block.text)
			.map((block: any) => block.text || block.content || "")
			.join(" ")
			.trim();
		if (text) return text;
	}

	// 3. message.parts — alternative shape seen in some OpenCode versions (Issue #28)
	if (Array.isArray(message?.parts)) {
		const text = message.parts
			.filter((p: any) => p.type === "text" || p.text)
			.map((p: any) => p.text || "")
			.join(" ")
			.trim();
		if (text) return text;
	}

	// 4. output.parts — provided via chat.message hook output param (Issue #28)
	if (Array.isArray(outputParts)) {
		const text = outputParts
			.filter((p: any) => p.type === "text" || p.text)
			.map((p: any) => p.text || "")
			.join(" ")
			.trim();
		if (text) return text;
	}

	return "";
}

/**
 * Read a file safely, returning null if not found (async)
 */
async function readFileSafe(filePath: string): Promise<string | null> {
	try {
		await fs.promises.access(filePath);
		return await fs.promises.readFile(filePath, "utf-8");
	} catch (error) {
		// Distinguish file-not-found from real I/O errors
		const nodeError = error as NodeJS.ErrnoException;
		if (nodeError.code === "ENOENT") {
			return null; // File not found - expected case
		}
		// Real I/O error - rethrow for caller to handle
		throw error;
	}
}

/**
 * Load minimal bootstrap context — WP2: Minimal Useful
 *
 * Loads:
 * 1. MINIMAL_BOOTSTRAP.md (core Algorithm + Steering Rules)
 * 2. System AISTEERINGRULES.md (if exists)
 * 3. User Identity files (ABOUTME, TELOS, DAIDENTITY) if exist
 *
 * Target: ~15KB (not 2KB - must know the user!)
 */
async function loadMinimalBootstrap(): Promise<string | null> {
	try {
		// Resolve PAI directory relative to plugin location, not cwd.
		// Plugin is at ~/.opencode/plugins/pai-unified.ts
		// PAI is at   ~/.opencode/PAI/
		// PLUGIN_DIR is resolved via fileURLToPath(import.meta.url) because
		// .opencode/package.json declares "type": "module" — __filename is
		// not defined in ESM contexts.
		const paiDir = path.join(PLUGIN_DIR, "..", "PAI");
		const bootstrapPath = path.join(paiDir, "MINIMAL_BOOTSTRAP.md");

		// Check if bootstrap exists (async)
		try {
			await fs.promises.access(bootstrapPath);
		} catch {
			fileLog("MINIMAL_BOOTSTRAP.md not found, using fallback", "warn");
			return null;
		}

		const contextParts: string[] = [];

		// 1. Core bootstrap (async)
		const bootstrapContent = await fs.promises.readFile(bootstrapPath, "utf-8");
		contextParts.push(`--- PAI BOOTSTRAP ---\n${bootstrapContent}`);

		// 2. System Steering Rules (if exists)
		const systemSteeringPath = path.join(paiDir, "AISTEERINGRULES.md");
		const systemSteering = await readFileSafe(systemSteeringPath);
		if (systemSteering) {
			contextParts.push(`--- System Steering Rules ---\n${systemSteering}`);
			fileLog("Loaded System AISTEERINGRULES.md");
		}

		// 3. User Identity Files (if exist) — CRITICAL: Must know the user!
		const userDir = path.join(paiDir, "USER");
		const userFiles = [
			{ file: "ABOUTME.md", label: "User Profile" },
			{ file: "TELOS/TELOS.md", label: "Life Goals" },
			{ file: "DAIDENTITY.md", label: "AI Identity" },
			{ file: "AISTEERINGRULES.md", label: "User Steering Rules" },
		];

		let userContextLoaded = 0;
		for (const { file, label } of userFiles) {
			const filePath = path.join(userDir, file);
			const content = await readFileSafe(filePath);
			if (content) {
				contextParts.push(`--- ${label} ---\n${content}`);
				fileLog(`Loaded USER/${file}`);
				userContextLoaded++;
			}
		}

		// Combine all context
		const fullContext = contextParts.join("\n\n");
		const size = Buffer.byteLength(fullContext, "utf-8");
		fileLog(`Bootstrap loaded: ${size} bytes (${userContextLoaded} user files)`);

		return `<system-reminder>\nPAI CONTEXT (Lazy Loading Bootstrap)\n\n${fullContext}\n\n---\nSkills load on-demand via OpenCode skill tool. User context auto-loaded if exists.\n</system-reminder>`;
	} catch (error) {
		fileLogError("Failed to load minimal bootstrap", error);
		// Return null to signal failure - caller should handle
		return null;
	}
}

/**
 * Append effort level to a session's META.yaml
 *
 * Adds effort_level and effort_budget fields to the session metadata.
 * Called after work session creation (Phase 4 — Issue #24).
 */
async function appendEffortToMeta(
	sessionPath: string,
	level: string,
	budget: string
): Promise<void> {
	const metaPath = path.join(sessionPath, "META.yaml");
	let content = await fs.promises.readFile(metaPath, "utf-8");
	// Only append if not already present
	if (!content.includes("effort_level:")) {
		content = `${content.trimEnd()}\neffort_level: ${level}\neffort_budget: ${budget}\n`;
		await fs.promises.writeFile(metaPath, content);
	}
}

/**
 * PAI Unified Plugin
 *
 * Exports all hooks in a single plugin for OpenCode.
 * Implements PAI v2.4 hook functionality.
 */
export const PaiUnified: Plugin = async (_ctx) => {
	// Clear log at plugin load (new session)
	clearLog();
	fileLog("=== PAI-OpenCode Plugin Loaded ===");
	fileLog(`Working directory: ${process.cwd()}`);
	fileLog("Hooks: Context, Security, Work, Ratings, Agents, Learning");
	fileLog(
		"v3.0 Handlers: Algorithm Tracker, Agent Guard, Skill Guard, Version Check, Integrity Check, Effort Level"
	);

	const hooks: Hooks = {
		// ═══════════════════════════════════════════════════════════════
		// WP-N1/N2: COMPACTION HANDLING (2 komplementäre Mechanismen)
		// ═══════════════════════════════════════════════════════════════

		// WP-N1: Custom tools for session recovery AFTER compaction
		// WP-N7: code_review tool via roborev
		tool: {
			session_registry: sessionRegistryTool,
			session_results: sessionResultsTool,
			code_review: codeReviewTool,
		},

		// WP-N2: Context Injection (WÄHREND compaction)
		// Hook: experimental.session.compacting
		// Zeitpunkt: Während LLM die Summary generiert
		// Ziel: Subagent-Registry, ISC, PRD in Summary injizieren
		// Output: Beeinflusst WAS das LLM in die Summary schreibt
		"experimental.session.compacting": async (input, output) => {
			fileLog("[Compaction:Pre] Context injection triggered", "info");
			await injectCompactionContext(input, output);
		},

	/**
	 * CONTEXT INJECTION (SessionStart equivalent)
	 *
	 * WP2: Injects minimal bootstrap (~7KB) instead of full 233KB context.
	 * Skills load on-demand via OpenCode native skill tool.
	 *
	 * NOTE: Only loads when PAI_ENABLED=1 is set (via `pai` wrapper).
	 * Plain `opencode` launches without PAI context by design.
	 */
	"experimental.chat.system.transform": async (input, output) => {
		try {
			// Gate: Only load PAI context when the `pai` wrapper explicitly sets
			// PAI_ENABLED=1. We check for the exact string "1" (not just truthy)
			// so accidental env pollution (e.g. PAI_ENABLED=0, PAI_ENABLED=false)
			// does not inadvertently enable context injection.
			if (process.env.PAI_ENABLED !== "1") {
				fileLog("PAI context disabled (PAI_ENABLED !== '1'; use 'pai' command for full context)", "info");
				return;
			}

			fileLog("Injecting minimal bootstrap context (WP2 lazy loading)...");

			// Emit session start
			emitSessionStart({ model: (input as any).model }).catch(() => {});

				// WP2: Use minimal bootstrap instead of full context loader
				const bootstrap = await loadMinimalBootstrap();

				if (bootstrap && bootstrap.length > 0) {
					output.system.push(bootstrap);
					fileLog(`Context injected successfully (${bootstrap.length} chars)`);

					// Emit context loaded
					emitContextLoaded({
						files_loaded: 1,
						total_size: bootstrap.length,
						success: true,
					}).catch(() => {});
				} else {
					fileLog("Context injection skipped: empty bootstrap", "warn");
					// Emit context load failure
					emitContextLoaded({
						files_loaded: 0,
						total_size: 0,
						success: false,
					}).catch(() => {});
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
				fileLog(`permission.ask input: ${JSON.stringify(input).substring(0, 200)}`, "debug");

				// Extract tool info from Permission input
				const tool = (input as any).tool || "unknown";
				const args = (input as any).args || {};

				const result = await validateSecurity({ tool, args });

				switch (result.action) {
					case "block":
						output.status = "deny";
						fileLog(`BLOCKED: ${result.reason}`, "error");
						emitSecurityBlock({
							tool,
							reason: result.reason || "Unknown",
						}).catch(() => {});
						break;

					case "confirm":
						output.status = "ask";
						fileLog(`CONFIRM: ${result.reason}`, "warn");
						emitSecurityWarn({
							tool,
							reason: result.reason || "Requires confirmation",
						}).catch(() => {});
						break;
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
			fileLog(`output.args: ${JSON.stringify(output.args ?? {}).substring(0, 500)}`, "debug");

			// Security validation - throws error to block dangerous commands
			const result = await validateSecurity({
				tool: input.tool,
				args: output.args ?? {},
			});

			if (result.action === "block") {
				fileLog(`BLOCKED: ${result.reason}`, "error");
				emitSecurityBlock({
					tool: input.tool,
					reason: result.reason || "Unknown",
					pattern: result.pattern,
				}).catch(() => {});
				// Throwing an error blocks the tool execution
				throw new Error(`[PAI Security] ${result.message || result.reason}`);
			}

			if (result.action === "confirm") {
				fileLog(`WARNING: ${result.reason}`, "warn");
				emitSecurityWarn({
					tool: input.tool,
					reason: result.reason || "Requires confirmation",
				}).catch(() => {});
				// For now, log warning but allow - OpenCode will handle its own permission prompt
			}

			fileLog(`Security check passed for ${input.tool}`, "debug");

			// === AGENT EXECUTION GUARD (v3.0) ===
			if (input.tool === "mcp_task" || input.tool.toLowerCase().includes("task")) {
				try {
					const guardResult = await validateAgentExecution(output.args ?? {});
					if (!guardResult.allowed) {
						fileLog(`[AgentGuard] Warning: ${guardResult.reason}`, "warn");
					}
				} catch (error) {
					fileLogError("[AgentGuard] Validation failed (non-blocking)", error);
				}
			}

			// === SKILL GUARD (v3.0) ===
			if (input.tool === "mcp_skill" || input.tool.toLowerCase().includes("skill")) {
				try {
					const skillName = (output.args as any)?.name || "unknown";
					const context = (output.args as any)?.context || "";
					const skillResult = await validateSkillInvocation(skillName, context);
					if (!skillResult.valid) {
						fileLog(`[SkillGuard] Warning: ${skillResult.reason}`, "warn");
					}
				} catch (error) {
					fileLogError("[SkillGuard] Validation failed (non-blocking)", error);
				}
			}
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
				emitToolExecute({
					tool: input.tool,
					args,
					success: true,
					result_length: resultLength,
				}).catch(() => {});

				// === AGENT OUTPUT CAPTURE ===
				// Check for Task tool (subagent) completion
				if (isTaskTool(input.tool)) {
					fileLog("Subagent task completed, capturing output...", "info");

					// Emit agent complete
					const agentType = args.subagent_type || "unknown";
					emitAgentComplete({
						agent_type: agentType,
						result_length: resultLength,
					}).catch(() => {});

					const result = output.result;

					const captureResult = await captureAgentOutput(args, result);
					if (captureResult.success && captureResult.filepath) {
						fileLog(`Agent output saved: ${captureResult.filepath}`, "info");
					}

					// WP-N1: Capture subagent session to registry
					await captureSubagentSession(input.sessionID, input.args, output);
				}

				// === ALGORITHM TRACKER (v3.0) ===
				try {
					const sessionId = (input as any).sessionId || "unknown";
					await trackAlgorithmState(
						input.tool,
						(input as any).args || (output as any).args || {},
						output.result,
						sessionId
					);
				} catch (error) {
					fileLogError("[AlgorithmTracker] Tracking failed (non-blocking)", error);
				}

				// === PRD SYNC (WP-A) ===
				// When AI writes/edits a PRD.md in MEMORY/WORK/, sync frontmatter
				// to prd-registry.json for dashboard and session continuity.
				// See ADR-009.
				if (
					input.tool === "write_file" ||
					input.tool === "edit_file" ||
					input.tool === "str_replace_based_edit_tool" ||
					input.tool.toLowerCase().includes("write") ||
					input.tool.toLowerCase().includes("edit")
				) {
					try {
						const filePath =
							(output as any).args?.file_path ||
							(output as any).args?.path ||
							(input as any).args?.file_path ||
							"";
						if (filePath) {
							await syncPRDToRegistry(filePath);
						}
					} catch (error) {
						fileLogError("[PRDSync] Sync failed (non-blocking)", error);
					}
				}

				// === QUESTION TRACKING (WP-A) ===
				// When AskUserQuestion tool completes, record the Q&A pair.
				try {
					const args = (output as any).args || (input as any).args || {};
					const qa = extractAskUserQuestionAnswer(input.tool, args, output.result);
					if (qa) {
						const sessionId = (input as any).sessionId || "unknown";
						await trackQuestionAnswered(qa.question, qa.answer, sessionId, (input as any).callID);
					}
				} catch (error) {
					fileLogError("[QuestionTracking] Track failed (non-blocking)", error);
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
					fileLog(
						`[chat.message] message.content: ${JSON.stringify(message.content).substring(0, 200)}`,
						"debug"
					);
				}

				const role = message.role || "unknown";
				// Fix Issue #28: pass output.parts so text delivered via parts is captured
				const outputParts = (output as any).parts;
				const content = extractTextContent(message, outputParts);

				// Guard: skip empty/whitespace-only content before any further processing
				if (!content || content.trim().length === 0) return;

				// Only process user messages
				if (role !== "user") return;

				// === DEDUPLICATION CHECK ===
				// Prevent double-processing between "chat.message" and "message.updated"
				if (wasMessageRecentlyProcessed(content)) {
					fileLog(
						`[chat.message] Skipping duplicate message: ${content.substring(0, 50)}...`,
						"debug"
					);
					return;
				}

				fileLog(`[chat.message] User: ${content.substring(0, 100)}...`, "debug");

				// === AUTO-WORK CREATION ===
				// Create work session on first user prompt if none exists
				// Skip trivial messages (greetings, ratings, acknowledgments) — Issue #24
				const currentSession = getCurrentSession();
				if (!currentSession && !isTrivialMessage(content)) {
					const workResult = await createWorkSession(content);
					if (workResult.success && workResult.session) {
						fileLog(`Work session started: ${workResult.session.id}`, "info");

						// === EFFORT LEVEL IN META (Phase 4 — Issue #24) ===
						// Detect effort level and write to session META.yaml
						try {
							const effortResult = await detectEffortLevel(content);
							await appendEffortToMeta(
								workResult.session.path,
								effortResult.level,
								effortResult.budget
							);
							fileLog(
								`[EffortLevel] Written to META: ${effortResult.level} (${effortResult.budget})`,
								"info"
							);
						} catch (error) {
							fileLogError("[EffortLevel] META write failed (non-blocking)", error);
						}
					}
				} else if (currentSession) {
					// Append to existing thread (only if session exists)
					await appendToThread(`**User:** ${content}`);
				}

				// Buffer user message for relationship memory (session-scoped)
				if (content.length >= 10) {
					const sessionId = (input as any).sessionID || "unknown";
					const buf = getUserMessages(sessionId);
					buf.push(content.slice(0, 300));
					if (buf.length > 50) buf.shift(); // cap at 50
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

				// === EFFORT LEVEL DETECTION (v3.0) ===
				if (content.length > 20) {
					try {
						const effortResult = await detectEffortLevel(content);
						fileLog(
							`[EffortLevel] Detected: ${effortResult.level} (${effortResult.budget})`,
							"info"
						);
					} catch (error) {
						fileLogError("[EffortLevel] Detection failed (non-blocking)", error);
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

					// Initialize fresh buffers for new session (Map-based — no global reset)
					const newSessionId = (input.event as any)?.properties?.info?.id || "unknown";
					sessionUserMessages.set(newSessionId, []);
					sessionAssistantMessages.set(newSessionId, []);

					// Emit session start (backup emit, primary is in context injection)
					emitSessionStart().catch(() => {});

					// SKILL RESTORE WORKAROUND
					// OpenCode modifies SKILL.md files when loading them.
					// Restore them to git state on session start.
					try {
						const restoreResult = await restoreSkillFiles();
						if (restoreResult.restored.length > 0) {
							fileLog(`Skill restore: ${restoreResult.restored.length} files restored`, "info");
						}
					} catch (error) {
						fileLogError("Skill restore failed", error);
						// Don't throw - session should continue
					}

					// === VERSION CHECK (v3.0) ===
					try {
						const updateResult = await checkForUpdates();
						if (updateResult.updateAvailable) {
							fileLog(
								`[VersionCheck] Update available: ${updateResult.currentVersion} → ${updateResult.latestVersion}`,
								"info"
							);
						}
					} catch (error) {
						fileLogError("[VersionCheck] Check failed (non-blocking)", error);
					}
				}

				// === SESSION END ===
				if (eventType.includes("session.ended") || eventType.includes("session.idle")) {
					fileLog("=== Session Ending ===", "info");

					// WORK COMPLETION LEARNING
					// Extract learnings from the work session
					try {
						const learningResult = await extractLearningsFromWork();
						if (learningResult.success && learningResult.learnings.length > 0) {
							fileLog(`Extracted ${learningResult.learnings.length} learnings`, "info");

							// Emit learning captured for each learning
							learningResult.learnings.forEach((learning: any) => {
								emitLearningCaptured({
									category: learning.category || "unknown",
									filepath: learning.filepath || "unknown",
								}).catch(() => {});
							});
						}
					} catch (error) {
						fileLogError("Learning extraction failed", error);
					}

					// === INTEGRITY CHECK (v3.0) ===
					try {
						const healthResult = await runIntegrityCheck();
						if (!healthResult.healthy) {
							fileLog(`[IntegrityCheck] Issues found: ${healthResult.issues.join(", ")}`, "warn");
						} else {
							fileLog("[IntegrityCheck] System healthy", "info");
						}
					} catch (error) {
						fileLogError("[IntegrityCheck] Check failed (non-blocking)", error);
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

					// === SESSION CLEANUP (WP-A) ===
					// Mark work directory as COMPLETED, clear state, clean session-names.
					// Runs AFTER learning extraction (uses state before clear). See ADR-009.
					// SessionId lives in event.properties, not directly on input (event bus shape).
					try {
						const eventData = (input as any).event;
						const sessionId =
							eventData?.properties?.sessionID || eventData?.properties?.id || undefined;
						await cleanupSession(sessionId);
					} catch (error) {
						fileLogError("[SessionCleanup] Cleanup failed (non-blocking)", error);
					}

					// === RELATIONSHIP MEMORY (WP-A) ===
					// Pass the accumulated session message buffers (session-scoped Map).
					// Buffers are populated throughout the session and cleaned up here.
					try {
						const endedSessionId =
							(input.event as any)?.properties?.sessionID ||
							(input.event as any)?.properties?.id ||
							"unknown";
						await captureRelationshipMemory(
							[...getUserMessages(endedSessionId)],
							[...getAssistantMessages(endedSessionId)]
						);
						// Cleanup to prevent memory leaks
						sessionUserMessages.delete(endedSessionId);
						sessionAssistantMessages.delete(endedSessionId);
					} catch (error) {
						fileLogError("[RelationshipMemory] Capture failed (non-blocking)", error);
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
									fileLog(
										`[ISC Validation] Algorithm detected, ${iscResult.criteriaCount} criteria found`,
										"info"
									);
									if (iscResult.warnings.length > 0) {
										fileLog(`[ISC Validation] Warnings: ${iscResult.warnings.join(", ")}`, "warn");
									}

									// Emit ISC validation
									emitISCValidated({
										criteriaCount: iscResult.criteriaCount || 0,
										all_passed: iscResult.warnings.length === 0,
										warnings: iscResult.warnings || [],
									}).catch(() => {});
								}
							} catch (error) {
								fileLogError("[ISC Validation] Failed", error);
							}

							// === VOICE NOTIFICATION ===
							// Extract voice completion and send to TTS
							try {
								const voiceCompletion = extractVoiceCompletion(responseText);
								if (voiceCompletion) {
									fileLog(
										`[Voice] Found completion: "${voiceCompletion.substring(0, 50)}..."`,
										"info"
									);
									await handleVoiceNotification(voiceCompletion, sessionId);

									// Emit voice sent
									emitVoiceSent({
										message_length: voiceCompletion.length,
									}).catch(() => {});

									// === TAB STATE UPDATE ===
									// Update terminal tab title/color after completion
									try {
										await handleTabState(voiceCompletion, "completed");
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
							emitAssistantMessage({
								content_length: responseText.length,
								has_voice_line: hasVoiceLine,
								has_isc: hasISC,
							}).catch(() => {});

							// === RESPONSE CAPTURE ===
							// Capture response for work tracking and learning
							try {
								await handleResponseCapture(responseText, sessionId);
							} catch (error) {
								fileLogError("[Capture] Response capture failed (non-blocking)", error);
							}

							// === ASSISTANT THREAD CAPTURE (Phase 2 — Issue #24) ===
							// Append full assistant response to THREAD.md for session completeness
							try {
								const currentSess = getCurrentSession();
								if (currentSess) {
									await appendToThread(`**Assistant:** ${responseText}`);
									fileLog(
										`[Thread] Assistant response appended (${responseText.length} chars)`,
										"debug"
									);
								}
							} catch (error) {
								fileLogError("[Thread] Assistant capture failed (non-blocking)", error);
							}

							// Buffer assistant response for relationship memory (session-scoped)
							const assistantSessionId = (input as any).sessionID || "unknown";
							const assistBuf = getAssistantMessages(assistantSessionId);
							assistBuf.push(responseText.slice(0, 500));
							if (assistBuf.length > 20) assistBuf.shift(); // cap at 20

							// === LAST RESPONSE CACHE (WP-A) ===
							// Cache response so ImplicitSentiment has context on next user message.
							// OpenCode-native replacement for Claude-Code transcript_path pattern.
							// See ADR-009.
							try {
								const cacheSessionId = (input as any).sessionID || "unknown";
								await cacheLastResponse(responseText, cacheSessionId);
							} catch (error) {
								fileLogError("[LastResponseCache] Cache write failed (non-blocking)", error);
							}
						}
					}
				}

				// === USER MESSAGE HANDLING ===
				// IMPORTANT: Only use message.updated (complete messages), NOT message.part.updated.
				// message.part.updated fires per streaming CHUNK — using it here caused
				// sentiment analysis (and thus claude CLI spawns via Inference.ts) to trigger
				// hundreds of times per response, saturating CPU. See: GitHub Issue #17
				if (eventType === "message.updated") {
					const eventData = input.event as any;
					const message = eventData?.properties?.message;

					// Only process user messages (assistant messages handled above at line ~428)
					let userText: string | null = null;

					if (message?.role === "user") {
						// Fix Issue #28: also check event properties parts
						const eventParts = eventData?.properties?.parts;
						userText = extractTextContent(message, eventParts);
						fileLog(`[message.updated] User message: "${userText.substring(0, 100)}..."`, "debug");
					}

					// Process user message if we found it
					if (userText && userText.trim().length > 0) {
						// === DEDUPLICATION CHECK ===
						// Prevent double-processing between "chat.message" and "message.updated"
						if (wasMessageRecentlyProcessed(userText)) {
							fileLog(
								`[message.updated] Skipping duplicate message: ${userText.substring(0, 50)}...`,
								"debug"
							);
							return; // Skip this event
						}

						fileLog(`[USER MESSAGE] Content: "${userText.substring(0, 100)}..."`, "info");

						// === EXPLICIT RATING CAPTURE ===
						const rating = detectRating(userText);
						if (rating) {
							fileLog(`[RATING DETECTED] Score: ${rating}`, "info");
							const ratingResult = await captureRating(userText, "user message");
							if (ratingResult.success && ratingResult.rating) {
								fileLog(`Rating captured: ${ratingResult.rating.score}/10`, "info");

								// Emit explicit rating
								emitExplicitRating({
									score: ratingResult.rating.score,
									comment: ratingResult.rating.comment,
								}).catch(() => {});
							} else {
								fileLog(`Rating capture failed: ${ratingResult.error}`, "warn");
							}
						} else {
							// === IMPLICIT SENTIMENT CAPTURE ===
							// Only run if NOT an explicit rating
							try {
								const sessionId = (input as any).sessionID || "unknown";
								// Read last response for context (ADR-009: OpenCode-native replacement
								// for Claude-Code's transcriptPath pattern)
								const lastResponse =
									(await readLastResponse((input as any).sessionID).catch(() => null)) ?? undefined;
								const sentimentResult = await handleImplicitSentiment(
									userText,
									sessionId,
									lastResponse
								);

								// Emit implicit sentiment if captured
								// Fix ADR-009: handleImplicitSentiment returns { rating, sentiment, confidence }
								// NOT { score, indicators } — CodeRabbit bug fix
								if (sentimentResult && sentimentResult.rating !== null) {
									emitImplicitSentiment({
										score: sentimentResult.rating,
										confidence: sentimentResult.confidence || 0,
										sentiment: sentimentResult.sentiment,
									}).catch(() => {});
								}
							} catch (error) {
								fileLogError("[ImplicitSentiment] Failed (non-blocking)", error);
							}
						}

						// Emit user message
						emitUserMessage({
							content_length: userText.length,
							has_rating: !!rating,
						}).catch(() => {});

						// === AUTO-WORK CREATION ===
						// Skip trivial messages (greetings, ratings, acknowledgments) — Issue #24
						const currentSession = getCurrentSession();
						if (!currentSession && !isTrivialMessage(userText)) {
							const workResult = await createWorkSession(userText);
							if (workResult.success && workResult.session) {
								fileLog(`Work session started: ${workResult.session.id}`, "info");

								// === EFFORT LEVEL IN META (Phase 4 — Issue #24) ===
								try {
									const effortResult = await detectEffortLevel(userText);
									await appendEffortToMeta(
										workResult.session.path,
										effortResult.level,
										effortResult.budget
									);
									fileLog(
										`[EffortLevel] Written to META: ${effortResult.level} (${effortResult.budget})`,
										"info"
									);
								} catch (error) {
									fileLogError("[EffortLevel] META write failed (non-blocking)", error);
								}
							}
						} else if (currentSession) {
							await appendToThread(`**User:** ${userText}`);
						}
					}
				}

				// ─── BUS EVENTS (WP-A) ───────────────────────────────────────────────

				// ═══════════════════════════════════════════════════════════════
				// COMPACTION HANDLING (Komplementär zu WP-N2)
				// ═══════════════════════════════════════════════════════════════

				// WP-N2 oben: Context Injection (WÄHREND compaction via experimental.session.compacting hook)
				// HIER: Learning Rescue (NACH compaction via session.compacted event)

				// === SESSION COMPACTED ===
				// Event: session.compacted
				// Zeitpunkt: NACHDEM LLM Summary generiert & Context gekürzt wurde
				// Ziel: Extrahierte Learnings aus Work-Files retten
				// Output: Speichert Learnings für spätere Nutzung
				// Unterscheidung: [Compaction:Post] vs [Compaction:Pre] (bei WP-N2 Hook)
				if (eventType === "session.compacted") {
					fileLog("[Compaction:Post] Context compaction detected — rescuing learnings", "info");
					try {
						const learningResult = await extractLearningsFromWork();
						if (learningResult.success && learningResult.learnings.length > 0) {
							fileLog(
								`[Compaction:Post] Rescued ${learningResult.learnings.length} learnings`,
								"info"
							);
						} else {
							fileLog("[Compaction:Post] No learnings to rescue", "debug");
						}
					} catch (error) {
						fileLogError("[Compaction:Post] Learning rescue failed", error);
					}
					fileLog(`[Compaction:Post] Compaction completed at ${new Date().toISOString()}`, "info");
				}

				// === SESSION ERROR ===
				// Track session errors for debugging and resilience monitoring.
				if (eventType === "session.error") {
					const eventData = input.event as any;
					const errMsg =
						eventData?.properties?.error || eventData?.properties?.message || "unknown error";
					const sessionId =
						eventData?.properties?.sessionID || eventData?.properties?.id || "unknown";
					fileLog(`[SessionError] Session ${sessionId}: ${errMsg}`, "error");
				}

				// === PERMISSION AUDIT LOG ===
				// Full audit log of ALL permission requests (not just blocked ones).
				// Gives complete picture of what OpenCode is doing. Complements
				// permission.ask hook (Schicht 1) which only sees blocking decisions.
				if (eventType === "permission.asked") {
					const eventData = input.event as any;
					const props = eventData?.properties || {};
					const permId = props.id || "unknown";
					const permission = props.permission || "unknown";
					const patterns = (props.patterns || []).slice(0, 3).join(", ") || "none";
					const via = props.tool ? `tool/${props.tool.callID}` : "no-tool";
					fileLog(
						`[PermissionAudit] id=${permId} permission=${permission} patterns=[${patterns}] via=${via}`,
						"info"
					);
				}

				// === COMMAND TRACKING ===
				// Track /command usage for analytics and debugging.
				if (eventType === "command.executed") {
					const eventData = input.event as any;
					const props = eventData?.properties || {};
					const cmdName = props.name || "unknown";
					const cmdArgs = (props.arguments || "").slice(0, 100);
					fileLog(`[CommandTracker] /${cmdName}${cmdArgs ? ` ${cmdArgs}` : ""}`, "info");
				}

				// === OPENCODE UPDATE AVAILABLE ===
				// Native push notification when a new OpenCode version is available.
				// Complements our check-version.ts (which checks PAI-OpenCode releases).
				if (eventType === "installation.update.available") {
					const eventData = input.event as any;
					const version = eventData?.properties?.version || eventData?.properties?.tag || "unknown";
					fileLog(`[UpdateAvailable] OpenCode ${version} available`, "info");
				}

				// === SESSION UPDATED (title tracking) ===
				// When OpenCode renames/updates a session, capture the new title.
				if (eventType === "session.updated") {
					const eventData = input.event as any;
					const info = eventData?.properties?.info || {};
					if (info.title) {
						fileLog(`[SessionTitle] Updated to: "${info.title}"`, "info");
					}
				}

				// ─── END BUS EVENTS ──────────────────────────────────────────────────

				// Log all events for debugging
				fileLog(`Event: ${eventType}`, "debug");
			} catch (error) {
				fileLogError("Event handler failed", error);
			}
		},

		// === SHELL.ENV HOOK (WP-G — OpenCode-native) ===
		// Inject PAI context into every Bash tool call environment.
		// OpenCode Bash is STATELESS (fresh process per call) — this is the only
		// reliable way to pass runtime context into shell commands.
		// See docs/epic/OPENCODE-NATIVE-RESEARCH.md — Section 1.
		// === SHELL.ENV HOOK (WP-G — OpenCode-native) ===
		// OpenCode Bash is STATELESS — every call spawns a fresh shell process.
		// This hook runs before EACH bash call and injects environment variables.
		//
		// TWO-LAYER SYSTEM:
		// Layer 1 — .opencode/.env (loaded by Bun at startup):
		//   All API keys are already in process.env. Plugin TypeScript code reads
		//   them directly via process.env.GOOGLE_API_KEY etc. — no hook needed.
		//
		// Layer 2 — shell.env Hook (this function):
		//   For Bash child processes that need RUNTIME context (session ID, work dir)
		//   OR explicit passthrough of keys that may not be inherited automatically.
		//
		// API keys live in .env and are read via process.env in TypeScript.
		// Do NOT duplicate all keys here — Bun already handles that via inheritance.
		// Only add keys here if a Bash script explicitly needs them and inheritance fails.
		//
		// See: docs/epic/OPENCODE-NATIVE-RESEARCH.md — Section 1 (Bash Stateless)
		"shell.env": async (input: any, output: any) => {
			try {
				const sessionId = input?.sessionID || "unknown";
				const workDir = input?.cwd || "";

				output.env = output.env || {};

				// PAI runtime context (not in .env — dynamically computed per call)
				output.env.PAI_CONTEXT = "1";
				output.env.PAI_SESSION_ID = sessionId;
				output.env.PAI_WORK_DIR = workDir;
				output.env.PAI_VERSION = "3.0";

				// Explicit passthrough for keys that PAI scripts may need in Bash
				// These are already in process.env via Bun .env loading, but we
				// explicitly forward them to ensure child process inheritance.
				const PASSTHROUGH_KEYS = [
					"PAI_OBSERVABILITY_PORT",
					"PAI_OBSERVABILITY_ENABLED",
					"GOOGLE_API_KEY", // Used by transcription scripts
					"TTS_PROVIDER", // Voice synthesis selector
					"DA", // Agent name (Jeremy)
					"TIME_ZONE", // Timezone for date formatting in scripts
				];
				for (const key of PASSTHROUGH_KEYS) {
					if (process.env[key]) {
						output.env[key] = process.env[key];
					}
				}

				fileLog(`[shell.env] Context injected for session ${sessionId}`, "debug");
			} catch (error) {
				// Non-blocking — never fail a bash call due to env injection
				fileLogError("[shell.env] Env injection failed (non-blocking)", error);
			}
		},
	};

	return hooks;
};

// Default export for OpenCode plugin system
export default PaiUnified;
