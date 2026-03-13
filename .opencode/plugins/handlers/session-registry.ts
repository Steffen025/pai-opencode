/**
 * Session Registry Handler
 *
 * Tracks subagent sessions spawned via Task tool and provides
 * two custom tools for the Algorithm to recover session data
 * after context compaction.
 *
 * TOOLS PROVIDED:
 * - session_registry: Lists all subagent sessions with metadata for current session
 * - session_results: Gets registry metadata for a subagent + resume instructions
 *
 * HOOKS USED:
 * - tool.execute.after (tool === "task"): Captures session_id from Task tool output,
 *   extracts metadata, writes to local registry file
 *
 * @module session-registry
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ToolContext } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin";
import { fileLog, fileLogError } from "../lib/file-logger";
import { getStateDir } from "../lib/paths";

// --- Types ---

interface SubagentEntry {
	sessionId: string;
	agentType: string;
	description: string;
	modelTier?: string;
	spawnedAt: string;
	status: "running" | "completed" | "failed";
}

interface SubagentRegistry {
	parentSessionId: string;
	entries: SubagentEntry[];
	updatedAt: string;
	version: number;
}

// --- Registry File Operations ---

function getRegistryPath(sessionId: string): string {
	return path.join(getStateDir(), `subagent-registry-${sessionId}.json`);
}

function normalizeRegistry(data: unknown, sessionId: string): SubagentRegistry {
	const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
	return {
		parentSessionId: typeof obj.parentSessionId === "string" ? obj.parentSessionId : sessionId,
		entries: Array.isArray(obj.entries)
			? (obj.entries as unknown[]).filter(
					(e): e is SubagentEntry =>
						!!e &&
						typeof e === "object" &&
						typeof (e as Record<string, unknown>).sessionId === "string" &&
						typeof (e as Record<string, unknown>).agentType === "string" &&
						typeof (e as Record<string, unknown>).description === "string" &&
						typeof (e as Record<string, unknown>).spawnedAt === "string" &&
						(["running", "completed", "failed"] as const).includes(
							(e as Record<string, unknown>).status as SubagentEntry["status"]
						)
				)
			: [],
		updatedAt:
			typeof obj.updatedAt === "string" ? obj.updatedAt : new Date().toISOString(),
		version: typeof obj.version === "number" ? obj.version : 0,
	};
}

function readRegistry(sessionId: string): SubagentRegistry {
	const filePath = getRegistryPath(sessionId);
	if (!fs.existsSync(filePath)) {
		return {
			parentSessionId: sessionId,
			entries: [],
			updatedAt: new Date().toISOString(),
			version: 0,
		};
	}

	let raw: string;
	try {
		raw = fs.readFileSync(filePath, "utf-8");
	} catch (err) {
		// I/O error (e.g. EACCES) — propagate so the caller knows the registry is inaccessible
		fileLog(`[session-registry] Failed to read registry at ${filePath}: ${err}`, "error");
		throw err;
	}

	try {
		const data = JSON.parse(raw);
		return normalizeRegistry(data, sessionId);
	} catch (err) {
		if (err instanceof SyntaxError) {
			fileLog(`[session-registry] Corrupted registry file at ${filePath} — starting fresh`, "warn");
			return {
				parentSessionId: sessionId,
				entries: [],
				updatedAt: new Date().toISOString(),
				version: 0,
			};
		}
		throw err;
	}
}

/**
 * Write registry with compare-and-swap semantics.
 * Returns true if write succeeded, false if version mismatch (caller should retry).
 * Throws on I/O errors (e.g. ENOSPC, EACCES) — these are not retryable CAS conflicts.
 */
function writeRegistryAtomic(
	sessionId: string,
	registry: SubagentRegistry,
	expectedVersion: number
): boolean {
	const filePath = getRegistryPath(sessionId);
	const dir = path.dirname(filePath);
	const tempPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;

	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

	// Check current version before writing (compare-and-swap)
	const current = readRegistry(sessionId);
	if (current.version !== expectedVersion) {
		return false; // Version mismatch - caller should retry
	}

	// Increment version for new write
	registry.version = expectedVersion + 1;
	registry.updatedAt = new Date().toISOString();

	try {
		// Write to temp file
		fs.writeFileSync(tempPath, JSON.stringify(registry, null, 2), "utf-8");
		// Atomic rename
		fs.renameSync(tempPath, filePath);
		return true;
	} catch (err) {
		// Cleanup temp file, then rethrow — I/O errors are not CAS conflicts
		try {
			if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
		} catch {}
		throw err;
	}
}

// --- Task Tool Output Parser ---

/**
 * Sanitize text for Markdown display.
 * - Replace newlines with spaces
 * - Collapse consecutive whitespace
 * - Trim
 * - Escape pipe characters (for tables)
 * - Truncate to max length
 */
function sanitizeForMarkdown(text: string, maxLength = 60, escapePipes = true): string {
	let sanitized = text.replace(/\r\n/g, " ").replace(/\n/g, " ").replace(/\s+/g, " ").trim();

	if (escapePipes) {
		sanitized = sanitized.replace(/\|/g, "\\|");
	}

	return sanitized.substring(0, maxLength);
}

/**
 * Extract session_id from Task tool output metadata.
 *
 * The Task tool returns output in this format (upstream v1.2.24+):
 * ```
 * <task_metadata>
 * session_id: ses_abc123...
 * </task_metadata>
 * ```
 *
 * Also checks the structured metadata field (output.metadata.sessionId).
 */
export function extractSessionId(output: { output?: string; metadata?: any }): string | null {
	// Method 1: Structured metadata (preferred)
	if (output.metadata?.sessionId) {
		return output.metadata.sessionId;
	}

	// Method 2: Parse from <task_metadata> text block
	if (output.output) {
		const match = output.output.match(/session_id:\s*(ses_[a-zA-Z0-9]+)/);
		if (match) return match[1];

		// Legacy format: task_id: ses_...
		const legacyMatch = output.output.match(/task_id:\s*(ses_[a-zA-Z0-9]+)/);
		if (legacyMatch) return legacyMatch[1];
	}

	return null;
}

/**
 * Extract agent type and description from Task tool args.
 */
export function extractTaskInfo(args: any): {
	agentType: string;
	description: string;
	modelTier?: string;
} {
	return {
		agentType: args?.subagent_type || args?.agent || "unknown",
		description: args?.description || args?.prompt?.substring(0, 100) || "unknown task",
		modelTier: args?.model_tier,
	};
}

// --- Hook: Capture Task tool completions ---

/**
 * Called from tool.execute.after when tool === "task".
 * Registers the spawned subagent session in the local registry.
 */
export async function captureSubagentSession(
	sessionId: string,
	args: any,
	output: { output?: string; metadata?: any; title?: string }
): Promise<void> {
	try {
		const childSessionId = extractSessionId(output);
		if (!childSessionId) {
			fileLog("[SessionRegistry] Could not extract session_id from Task output", "warn");
			return;
		}

		const taskInfo = extractTaskInfo(args);

		// Retry loop with compare-and-swap for atomic updates
		let retries = 5;
		while (retries > 0) {
			const registry = readRegistry(sessionId);
			const expectedVersion = registry.version;

			// Avoid duplicates (check if already registered)
			if (registry.entries.some((e) => e.sessionId === childSessionId)) {
				fileLog(`[SessionRegistry] Session ${childSessionId} already registered`, "debug");
				return;
			}

			registry.entries.push({
				sessionId: childSessionId,
				agentType: taskInfo.agentType,
				description: taskInfo.description,
				modelTier: taskInfo.modelTier,
				spawnedAt: new Date().toISOString(),
				status: "completed",
			});

			// Compare-and-swap write
			if (writeRegistryAtomic(sessionId, registry, expectedVersion)) {
				fileLog(
					`[SessionRegistry] Registered ${taskInfo.agentType} subagent: ${childSessionId} (${registry.entries.length} total, v${expectedVersion + 1})`,
					"info"
				);
				return;
			}

			// CAS failed - version mismatch, retry after delay
			retries--;
			if (retries > 0) {
				fileLog(
					`[SessionRegistry] Registry version conflict, re-reading and retrying... (${retries} left)`,
					"warn"
				);
				await new Promise((r) => setTimeout(r, 50));
			}
		}

		fileLogError(
			"[SessionRegistry] Failed to write registry after retries",
			new Error("Compare-and-swap failed")
		);
	} catch (error) {
		fileLogError("[SessionRegistry] Failed to capture subagent session", error);
	}
}

// --- Custom Tools ---

/**
 * Tool: session_registry
 *
 * Lists all subagent sessions spawned in the current session.
 * Use after compaction to recover context about spawned subagents.
 */
export const sessionRegistryTool = tool({
	description:
		"List all subagent sessions spawned in this session. Returns session IDs, agent types, and descriptions. " +
		"Use this after context compaction to recover information about previously spawned subagents. " +
		"The results are always available — subagent data survives compaction.",
	args: {},
	async execute(_args: {}, context: ToolContext): Promise<string> {
		let registry: SubagentRegistry;
		try {
			registry = readRegistry(context.sessionID);
		} catch (err) {
			fileLog(`[session-registry] sessionRegistryTool: failed to read registry: ${err}`, "error");
			return "Registry unavailable: could not read session data (I/O error). Check file permissions on the state directory.";
		}

		if (registry.entries.length === 0) {
			return "No subagent sessions found for this session. No subagents have been spawned via the Task tool yet.";
		}

		const lines = [
			`## Subagent Registry (${registry.entries.length} sessions)`,
			"",
			"| # | Agent Type | Session ID | Description | Spawned At |",
			"|---|-----------|-----------|-------------|------------|",
		];

		for (let i = 0; i < registry.entries.length; i++) {
			const e = registry.entries[i];
			lines.push(
				`| ${i + 1} | ${e.agentType} | ${e.sessionId} | ${sanitizeForMarkdown(e.description, 60, true)} | ${e.spawnedAt} |`
			);
		}

		lines.push("");
		lines.push(
			"Use `session_results` with any session_id above to retrieve registry metadata and resume instructions (full conversation requires Task tool with session_id)."
		);

		return lines.join("\n");
	},
});

/**
 * Tool: session_results
 *
 * Retrieves registry metadata for a specific subagent session (agent type, description,
 * spawn time, status) plus instructions for resuming the session. The full conversation
 * history is stored in OpenCode's SQLite database and survives context compaction.
 * To get the actual conversation messages, use the Task tool with the session_id.
 */
export const sessionResultsTool = tool({
	description:
		"Get registry metadata for a specific subagent session by session_id. " +
		"Returns: agent type, description, model tier, status, and resume instructions. " +
		"Use this to identify what a subagent worked on and how to access its full results. " +
		"The full conversation history is in OpenCode's database — use Task tool with session_id to retrieve it.",
	args: {
		session_id: tool.schema
			.string()
			.describe(
				"The session ID of the subagent (e.g., ses_abc123). Get IDs from session_registry."
			),
	},
	async execute(args: { session_id: string }, context: ToolContext): Promise<string> {
		// Read the registry file to get stored metadata for this session
		let registry: SubagentRegistry;
		try {
			registry = readRegistry(context.sessionID);
		} catch (err) {
			fileLog(`[session-registry] sessionResultsTool: failed to read registry: ${err}`, "error");
			return "Registry unavailable: could not read session data (I/O error). Check file permissions on the state directory.";
		}
		const entry = registry.entries.find((e) => e.sessionId === args.session_id);

		if (!entry) {
			return `Session ${args.session_id} not found in the registry for this session. Use session_registry to see available sessions.`;
		}

		// Return registry metadata + resume instructions
		// Note: Full conversation is in OpenCode's DB. To retrieve actual messages,
		// use Task({ session_id, prompt: "Summarize your work" }) or access via SDK.
		return [
			`## Subagent Session: ${args.session_id}`,
			"",
			`**Agent:** ${entry.agentType}`,
			`**Description:** ${entry.description}`,
			`**Model Tier:** ${entry.modelTier || "default"}`,
			`**Spawned:** ${entry.spawnedAt}`,
			`**Status:** ${entry.status}`,
			"",
			"**To resume this session or get full conversation history:**",
			`Task({ session_id: "${args.session_id}", prompt: "Continue where you left off and summarize what you did" })`,
		].join("\n");
	},
});

/**
 * Build formatted registry context for compaction injection.
 * Called by WP-N2 compaction intelligence handler.
 */
export function buildRegistryContext(sessionId: string): string | null {
	let registry: SubagentRegistry;
	try {
		registry = readRegistry(sessionId);
	} catch (err) {
		fileLog(`[session-registry] buildRegistryContext: failed to read registry: ${err}`, "error");
		return null;
	}
	if (registry.entries.length === 0) return null;

	const lines = [
		"## Active Subagent Registry",
		"",
		"The following subagent sessions were spawned during this session.",
		"Their data is stored in OpenCode's database and survives compaction.",
		"Use `session_registry` tool to list them, `session_results` to view metadata and resume hints.",
		"",
	];

	for (const e of registry.entries) {
		const sanitizedDesc = sanitizeForMarkdown(e.description, 80, false);
		lines.push(`- **${e.agentType}** (${e.sessionId}): ${sanitizedDesc}`);
	}

	return lines.join("\n");
}
