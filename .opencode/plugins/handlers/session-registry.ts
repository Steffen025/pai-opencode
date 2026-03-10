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

import * as fs from "fs";
import * as path from "path";
import { tool } from "@opencode-ai/plugin";
import type { ToolContext } from "@opencode-ai/plugin";
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
}

// --- Registry File Operations ---

function getRegistryPath(sessionId: string): string {
	return path.join(getStateDir(), `subagent-registry-${sessionId}.json`);
}

function readRegistry(sessionId: string): SubagentRegistry {
	const filePath = getRegistryPath(sessionId);
	if (fs.existsSync(filePath)) {
		try {
			return JSON.parse(fs.readFileSync(filePath, "utf-8"));
		} catch {
			// Corrupted file — start fresh
		}
	}
	return {
		parentSessionId: sessionId,
		entries: [],
		updatedAt: new Date().toISOString(),
	};
}

function writeRegistry(sessionId: string, registry: SubagentRegistry): void {
	const filePath = getRegistryPath(sessionId);
	const dir = path.dirname(filePath);
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	registry.updatedAt = new Date().toISOString();
	fs.writeFileSync(filePath, JSON.stringify(registry, null, 2), "utf-8");
}

// --- Task Tool Output Parser ---

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
export function extractSessionId(output: {
	output?: string;
	metadata?: any;
}): string | null {
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
		description:
			args?.description || args?.prompt?.substring(0, 100) || "unknown task",
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
	output: { output?: string; metadata?: any; title?: string },
): Promise<void> {
	try {
		const childSessionId = extractSessionId(output);
		if (!childSessionId) {
			fileLog(
				"[SessionRegistry] Could not extract session_id from Task output",
				"warn",
			);
			return;
		}

		const taskInfo = extractTaskInfo(args);
		const registry = readRegistry(sessionId);

		// Avoid duplicates
		if (registry.entries.some((e) => e.sessionId === childSessionId)) {
			fileLog(
				`[SessionRegistry] Session ${childSessionId} already registered`,
				"debug",
			);
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

		writeRegistry(sessionId, registry);
		fileLog(
			`[SessionRegistry] Registered ${taskInfo.agentType} subagent: ${childSessionId} (${registry.entries.length} total)`,
			"info",
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
		const registry = readRegistry(context.sessionID);

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
				`| ${i + 1} | ${e.agentType} | ${e.sessionId} | ${e.description.substring(0, 60)} | ${e.spawnedAt} |`,
			);
		}

		lines.push("");
		lines.push(
			"Use `session_results` with any session_id above to retrieve registry metadata and resume instructions (full conversation requires Task tool with session_id).",
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
				"The session ID of the subagent (e.g., ses_abc123). Get IDs from session_registry.",
			),
	},
	async execute(
		args: { session_id: string },
		context: ToolContext,
	): Promise<string> {
		// Read the registry file to get stored metadata for this session
		const registry = readRegistry(context.sessionID);
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
	const registry = readRegistry(sessionId);
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
		lines.push(
			`- **${e.agentType}** (${e.sessionId}): ${e.description.substring(0, 80)}`,
		);
	}

	return lines.join("\n");
}
