/**
 * Compaction Intelligence Handler
 *
 * Injects PAI-critical context into OpenCode's compaction summary.
 * Uses the experimental.session.compacting hook to ensure the LLM
 * includes subagent registry, ISC criteria, and PRD status in its summary.
 *
 * HOOK: experimental.session.compacting
 * INPUT: { sessionID: string }
 * OUTPUT: { context: string[]; prompt?: string }
 *
 * We APPEND to output.context (don't replace prompt) so OpenCode's
 * default summary template still runs — we just add PAI-specific sections.
 *
 * @module compaction-intelligence
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileLog, fileLogError } from "../lib/file-logger";
import { getStateDir, getWorkDir } from "../lib/paths";
import { buildRegistryContext } from "./session-registry";

/**
 * Read the active PRD for a session and extract status information.
 */
function buildPrdContext(sessionId: string): string | null {
	try {
		const stateDir = getStateDir();

		// Check session-scoped work state ONLY (no fallback to prevent cross-session leak)
		const stateFile = path.join(stateDir, `current-work-${sessionId}.json`);
		if (!fs.existsSync(stateFile)) return null;

		const state = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
		const workDir = state.work_dir || state.session_dir;
		if (!workDir) return null;

		// Read PRD file
		const prdPath = path.join(getWorkDir(), workDir, "PRD.md");
		if (!fs.existsSync(prdPath)) return null;

		const prdContent = fs.readFileSync(prdPath, "utf-8");

		// Extract frontmatter fields
		const statusMatch = prdContent.match(/^status:\s*(.+)$/m);
		const progressMatch = prdContent.match(
			/^verification_summary:\s*"?(\d+\/\d+)"?$/m,
		);
		const failingMatch = prdContent.match(
			/^failing_criteria:\s*\[([^\]]*)\]$/m,
		);
		const effortMatch = prdContent.match(/^effort_level:\s*(.+)$/m);
		const phaseMatch = prdContent.match(/^last_phase:\s*(.+)$/m);

		// Extract ISC criteria (lines starting with - [ ] or - [x])
		const criteria = prdContent.match(/^- \[[ x]\] ISC-[^\n]+/gm) || [];

		const lines = [
			"## Active PRD Status",
			"",
			`**Status:** ${statusMatch?.[1] || "unknown"}`,
			`**Progress:** ${progressMatch?.[1] || "unknown"}`,
			`**Effort Level:** ${effortMatch?.[1] || "unknown"}`,
			`**Last Phase:** ${phaseMatch?.[1] || "unknown"}`,
		];

		if (failingMatch?.[1]?.trim()) {
			lines.push(`**Failing Criteria:** ${failingMatch[1]}`);
		}

		if (criteria.length > 0) {
			lines.push("");
			lines.push(
				"### ISC Criteria (carry forward — these ARE the verification checklist):",
			);
			lines.push("");
			for (const c of criteria) {
				lines.push(c);
			}
		}

		return lines.join("\n");
	} catch (error) {
		fileLogError("[CompactionIntelligence] Failed to read PRD", error);
		return null;
	}
}

/**
 * Build additional context about current Algorithm state.
 * Reads session-specific algorithm state to prevent cross-session bleed.
 */
function buildAlgorithmContext(sessionId: string): string | null {
	try {
		const stateDir = getStateDir();
		// Session-specific state file to prevent cross-session bleed
		const algorithmStatePath = path.join(
			stateDir,
			`algorithm-state-${sessionId}.json`,
		);
		if (!fs.existsSync(algorithmStatePath)) return null;

		const state = JSON.parse(fs.readFileSync(algorithmStatePath, "utf-8"));

		const lines = [
			"## Algorithm State",
			"",
			`**Current Phase:** ${state.currentPhase || "unknown"}`,
			`**Effort Level:** ${state.effortLevel || "Standard"}`,
			`**Criteria Count:** ${state.criteriaCount || 0}`,
		];

		if (state.currentTask) {
			lines.push(`**Current Task:** ${state.currentTask}`);
		}

		return lines.join("\n");
	} catch {
		return null;
	}
}

/**
 * Main handler for experimental.session.compacting hook.
 *
 * Called by pai-unified.ts during the compaction process.
 * Appends PAI-specific context sections to the summary prompt.
 */
export async function injectCompactionContext(
	input: { sessionID: string },
	output: { context: string[]; prompt?: string },
): Promise<void> {
	try {
		let injectedCount = 0;

		// 1. Subagent Registry (from ADR-012)
		const registryCtx = buildRegistryContext(input.sessionID);
		if (registryCtx) {
			output.context.push(registryCtx);
			injectedCount++;
		}

		// 2. Active PRD + ISC Criteria
		const prdCtx = buildPrdContext(input.sessionID);
		if (prdCtx) {
			output.context.push(prdCtx);
			injectedCount++;
		}

		// 3. Algorithm State (session-specific to prevent cross-session bleed)
		const algCtx = buildAlgorithmContext(input.sessionID);
		if (algCtx) {
			output.context.push(algCtx);
			injectedCount++;
		}

		// 4. Recovery instructions
		output.context.push(
			[
				"## Post-Compaction Recovery Tools",
				"",
				"After compaction, these tools are available to recover context:",
				"- `session_registry` — Lists all subagent sessions with their IDs",
				"- `session_results(session_id)` — Retrieves output from a specific subagent",
				"",
				"Subagent data SURVIVES compaction. It is stored in OpenCode's database.",
				"Do NOT claim results are lost — use the tools above to recover them.",
			].join("\n"),
		);
		injectedCount++;

		fileLog(
			`[CompactionIntelligence] Injected ${injectedCount} context sections for session ${input.sessionID}`,
			"info",
		);
	} catch (error) {
		fileLogError(
			"[CompactionIntelligence] Context injection failed (non-blocking)",
			error,
		);
		// Non-blocking — compaction must not fail due to our plugin
	}
}
