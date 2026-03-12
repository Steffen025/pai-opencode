/**
 * roborev Code Review Handler
 *
 * Provides AI-powered code review via the roborev CLI tool.
 * roborev is MIT-licensed, fully local, and explicitly supports OpenCode.
 * https://github.com/roborev-dev/roborev
 *
 * TOOLS PROVIDED:
 * - code_review: Runs roborev to review staged/unstaged changes or last commit.
 *   The Algorithm can call this directly during VERIFY or after BUILD phase.
 *
 * HOOKS USED:
 * - (none active) Post-commit hook is managed by roborev itself via `roborev init`.
 *   This handler focuses on the on-demand `code_review` tool the Algorithm uses.
 *
 * SETUP (one-time per developer):
 *   brew install roborev-dev/tap/roborev
 *   roborev init           # installs git post-commit hook
 *   roborev skills install # installs OpenCode skill for roborev
 *
 * USAGE BY THE ALGORITHM:
 *   Call `code_review` tool with mode="dirty" to review uncommitted changes.
 *   Call `code_review` tool with mode="last-commit" to review the last commit.
 *   Call `code_review` tool with mode="fix" to feed findings to the agent.
 *   Call `code_review` tool with mode="refine" for the auto-fix loop.
 *
 * @module roborev-trigger
 */

import type { ToolContext } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin";
import { spawnSync } from "child_process";
import { fileLog, fileLogError } from "../lib/file-logger";

// --- Types ---

type ReviewMode = "dirty" | "last-commit" | "fix" | "refine";

interface ReviewResult {
	success: boolean;
	output: string;
	exitCode: number;
}

// --- roborev CLI Helpers ---

/**
 * Check if roborev is installed and available in PATH.
 */
function isRoborevAvailable(): boolean {
	try {
		const result = spawnSync("roborev", ["--version"], {
			encoding: "utf-8",
			timeout: 5000,
		});
		return result.status === 0;
	} catch {
		return false;
	}
}

/**
 * Run a roborev command and return the result.
 * All output is captured — no TTY needed.
 */
function runRoborev(args: string[]): ReviewResult {
	fileLog(`[roborev] Running: roborev ${args.join(" ")}`, "info");

	try {
		const result = spawnSync("roborev", args, {
			encoding: "utf-8",
			timeout: 120_000, // 2 minutes — roborev calls the LLM
			cwd: process.cwd(),
		});

		const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
		const exitCode = result.status ?? 1;

		fileLog(`[roborev] Exit code: ${exitCode}, output length: ${output.length}`, "info");

		return {
			success: exitCode === 0,
			output: output || "(no output)",
			exitCode,
		};
	} catch (error) {
		fileLogError("[roborev] Failed to spawn roborev process", error);
		return {
			success: false,
			output: `Failed to run roborev: ${error instanceof Error ? error.message : String(error)}`,
			exitCode: 1,
		};
	}
}

// --- Custom Tool: code_review ---

/**
 * Tool: code_review
 *
 * Runs roborev to review code changes and surface quality issues.
 * Use during VERIFY phase or after completing a BUILD to catch issues
 * before committing or creating a PR.
 *
 * Modes:
 *   dirty      — review all uncommitted (staged + unstaged) changes
 *   last-commit — review the most recent git commit
 *   fix        — feed roborev findings to the agent for fixes (interactive)
 *   refine     — run auto-fix loop until review passes (interactive)
 */
export const codeReviewTool = tool({
	description:
		"Run roborev AI code review on current changes. " +
		"Use during VERIFY phase or after BUILD to catch quality issues before committing. " +
		"Modes: 'dirty' reviews uncommitted changes, 'last-commit' reviews the last commit, " +
		"'fix' feeds findings to agent for fixes, 'refine' runs auto-fix loop. " +
		"Requires roborev to be installed: brew install roborev-dev/tap/roborev",
	args: {
		mode: tool.schema
			.enum(["dirty", "last-commit", "fix", "refine"] as const)
			.describe(
				"Review mode: 'dirty' for uncommitted changes (most common), " +
					"'last-commit' for the last commit, " +
					"'fix' to apply findings, 'refine' for auto-fix loop."
			)
			.optional()
			.default("dirty"),
		path: tool.schema
			.string()
			.describe(
				"Optional path or glob to focus the review on specific files. " +
					"Leave empty to review all changed files."
			)
			.optional(),
	},
	async execute(
		args: { mode?: ReviewMode; path?: string },
		_context: ToolContext
	): Promise<string> {
		const mode = args.mode ?? "dirty";

		// Check if roborev is available
		if (!isRoborevAvailable()) {
			return [
				"## roborev Not Found",
				"",
				"roborev is not installed or not in your PATH.",
				"",
				"**Install roborev:**",
				"```bash",
				"# macOS / Linux (Homebrew)",
				"brew install roborev-dev/tap/roborev",
				"",
				"# Or via Go",
				"go install github.com/roborev-dev/roborev@latest",
				"```",
				"",
				"**One-time setup:**",
				"```bash",
				"roborev init            # installs git post-commit hook",
				"roborev skills install  # installs OpenCode skill",
				"```",
				"",
				"After installation, re-run `code_review` to review your changes.",
			].join("\n");
		}

		// Build roborev command based on mode
		let roborevArgs: string[];
		switch (mode) {
			case "dirty":
				roborevArgs = ["review", "--dirty"];
				if (args.path) roborevArgs.push("--", args.path);
				break;
			case "last-commit":
				roborevArgs = ["review"];
				if (args.path) roborevArgs.push("--", args.path);
				break;
			case "fix":
				roborevArgs = ["fix"];
				break;
			case "refine":
				roborevArgs = ["refine"];
				break;
			default:
				roborevArgs = ["review", "--dirty"];
		}

		fileLog(`[roborev] Starting ${mode} review...`, "info");

		const result = runRoborev(roborevArgs);

		if (!result.success && result.output.includes("no changes")) {
			return [
				"## roborev: No Changes to Review",
				"",
				"No uncommitted changes found. Use `mode: 'last-commit'` to review the last commit,",
				"or make some changes first.",
			].join("\n");
		}

		const status = result.success ? "✅ PASSED" : "⚠️ FINDINGS";

		return [
			`## roborev Code Review — ${status}`,
			`**Mode:** ${mode}`,
			`**Exit code:** ${result.exitCode}`,
			"",
			"### Output",
			"",
			result.output,
			"",
			result.success
				? "_No issues found. Code review passed._"
				: [
						"_Review complete. Address findings above._",
						"",
						"**Next steps:**",
						"- Fix issues manually, then re-run `code_review`",
						"- Or run `code_review` with `mode: 'fix'` to let the agent apply fixes",
						"- Or run `code_review` with `mode: 'refine'` for an auto-fix loop",
					].join("\n"),
		].join("\n");
	},
});
