/**
 * PAI-OpenCode Skill Restore Handler
 *
 * Workaround for OpenCode's skill normalization bug.
 * OpenCode modifies SKILL.md files when loading them, removing PAI-specific sections.
 * This handler restores them to their git state on session start.
 *
 * CRITICAL: Uses file logging only - NEVER console.log (corrupts TUI)
 *
 * @module skill-restore
 */

import { execFileSync, execSync } from "node:child_process";
import { fileLog, fileLogError } from "../lib/file-logger";

export interface RestoreResult {
	success: boolean;
	restored: string[];
	errors: string[];
}

/**
 * Check for modified SKILL.md files and restore them
 *
 * Uses `git status` to find modified SKILL.md files and `git restore` to fix them.
 * This runs on session start to undo OpenCode's normalization changes.
 */
export async function restoreSkillFiles(): Promise<RestoreResult> {
	const result: RestoreResult = {
		success: true,
		restored: [],
		errors: [],
	};

	try {
		// Check if we're in a git repository
		try {
			execSync("git rev-parse --git-dir", { stdio: "pipe" });
		} catch {
			fileLog("Not in a git repository, skipping skill restore", "debug");
			return result;
		}

		// Find modified SKILL.md files in .opencode/skills/
		let statusOutput: string;
		try {
			statusOutput = execSync('git status --porcelain ".opencode/skills/**/SKILL.md"', {
				encoding: "utf-8",
				stdio: ["pipe", "pipe", "pipe"],
			}).trim();
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			fileLogError("[skill-restore] git status failed", new Error(msg));
			result.success = false;
			return result;
		}

		if (!statusOutput) {
			fileLog("No modified SKILL.md files found", "debug");
			return result;
		}

		// Parse modified files
		const modifiedFiles: string[] = [];
		for (const line of statusOutput.split("\n")) {
			if (!line.trim()) continue;

			// Git status format: XY filename
			// M = modified, D = deleted, ? = untracked
			const status = line.substring(0, 2);
			const file = line.substring(3);

			// Only restore modified files (not deleted or untracked)
			if (status.includes("M") && file.endsWith("SKILL.md")) {
				modifiedFiles.push(file);
			}
		}

		if (modifiedFiles.length === 0) {
			fileLog("No modified SKILL.md files to restore", "debug");
			return result;
		}

		fileLog(`Found ${modifiedFiles.length} modified SKILL.md files`, "info");

		// Restore each file
		for (const file of modifiedFiles) {
			try {
				execFileSync("git", ["restore", "--", file], { stdio: "pipe" });
				result.restored.push(file);
				fileLog(`Restored: ${file}`, "info");
			} catch (error) {
				const msg = error instanceof Error ? error.message : String(error);
				result.errors.push(`${file}: ${msg}`);
				fileLog(`Failed to restore ${file}: ${msg}`, "error");
			}
		}

		result.success = result.errors.length === 0;

		if (result.restored.length > 0) {
			fileLog(
				`Skill restore complete: ${result.restored.length} restored, ${result.errors.length} errors`,
				result.success ? "info" : "warn"
			);
		}

		return result;
	} catch (error) {
		fileLogError("Skill restore failed", error);
		result.success = false;
		result.errors.push(error instanceof Error ? error.message : String(error));
		return result;
	}
}
