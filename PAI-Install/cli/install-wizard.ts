#!/usr/bin/env bun

/**
 * PAI-OpenCode v3 Installation Wizard (terminal-only)
 *
 * Interactive installer flow for fresh install, migration, and updates.
 * No GUI/Electron dependencies.
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import * as readline from "node:readline";
import { createFreshState } from "../engine/state.ts";
import {
	stepBuildOpenCode,
	stepIdentity,
	stepInstallPAI,
	stepPrerequisites,
	stepProviderConfig,
	stepVoice,
} from "../engine/steps-fresh.ts";

import {
	stepCreateBackup,
	stepDetectMigration,
	stepMigrate,
	stepMigrationDone,
} from "../engine/steps-migrate.ts";
import {
	stepApplyUpdate,
	stepDetectUpdate,
	stepUpdateDone,
} from "../engine/steps-update.ts";

const COLOR = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	blue: "\x1b[34m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	cyan: "\x1b[36m",
	gray: "\x1b[90m",
} as const;

const PROGRESS_BAR_WIDTH = 24;

type Mode = "fresh" | "migrate" | "update";

const { values } = parseArgs({
	args: Bun.argv.slice(2),
	options: {
		help: { type: "boolean", default: false },
		fresh: { type: "boolean", default: false },
		migrate: { type: "boolean", default: false },
		update: { type: "boolean", default: false },
		// Deprecated build-related flags. Both are silently accepted as a no-op
		// so legacy invocations from pre-v3.0 scripts/CI don't crash. PAI no
		// longer builds OpenCode from source — vanilla opencode.ai is used.
		"skip-build": { type: "boolean", default: false },
		rebuild: { type: "boolean", default: false },
	},
	strict: true,
});

function print(message = ""): void {
	console.log(message);
}

function printInfo(message: string): void {
	print(`${COLOR.blue}[wizard]${COLOR.reset} ${message}`);
}

function printSuccess(message: string): void {
	print(`${COLOR.green}[wizard]${COLOR.reset} ${message}`);
}

function printWarning(message: string): void {
	print(`${COLOR.yellow}[wizard]${COLOR.reset} ${message}`);
}

function printError(message: string): void {
	print(`${COLOR.red}[wizard]${COLOR.reset} ${message}`);
}

function showHelp(): void {
	print("PAI-OpenCode Installation Wizard (terminal)");
	print("");
	print("Usage:");
	print("  bun PAI-Install/cli/install-wizard.ts");
	print("  bun PAI-Install/cli/install-wizard.ts --fresh");
	print("  bun PAI-Install/cli/install-wizard.ts --migrate");
	print("  bun PAI-Install/cli/install-wizard.ts --update");
	print("");
	print("Options:");
	print("  --skip-build   Deprecated — PAI no longer builds OpenCode (uses vanilla)");
	print("  --rebuild      Deprecated alias of --skip-build — also ignored");
	print("  --help         Show this help");
}

function banner(): void {
	print("");
	print(`${COLOR.cyan}${COLOR.bold}╔══════════════════════════════════════════════════════════════╗${COLOR.reset}`);
	print(`${COLOR.cyan}${COLOR.bold}║${COLOR.reset}    ${COLOR.bold}PAI-OpenCode Installer Wizard (v3 Terminal Flow)${COLOR.reset}       ${COLOR.cyan}${COLOR.bold}║${COLOR.reset}`);
	print(`${COLOR.cyan}${COLOR.bold}║${COLOR.reset}    Guided setup for Fresh Install, Migration, and Updates     ${COLOR.cyan}${COLOR.bold}║${COLOR.reset}`);
	print(`${COLOR.cyan}${COLOR.bold}╚══════════════════════════════════════════════════════════════╝${COLOR.reset}`);
	print("");
}

function progress(percent: number, message: string): void {
	const clamped = Math.max(0, Math.min(100, percent));
	const filled = Math.round((clamped / 100) * PROGRESS_BAR_WIDTH);
	const bar = "█".repeat(filled) + "░".repeat(PROGRESS_BAR_WIDTH - filled);
	print(`${COLOR.gray}[${bar}]${COLOR.reset} ${clamped.toString().padStart(3)}% ${message}`);
}

function ask(question: string, defaultValue?: string): Promise<string> {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	const suffix = defaultValue ? ` ${COLOR.gray}[${defaultValue}]${COLOR.reset}` : "";

	return new Promise((resolve) => {
		let settled = false;

		const cleanup = (): void => {
			process.off("SIGINT", onSigint);
		};

		const finalize = (value: string): void => {
			if (settled) {
				return;
			}
			settled = true;
			cleanup();
			resolve(value);
		};

		const onSigint = (): void => {
			cleanup();
			rl.close();
			print("");
			printError("Installation cancelled by user (Ctrl+C).");
			process.exit(1);
		};

		process.once("SIGINT", onSigint);

		rl.question(`${question}${suffix}: `, (answer) => {
			rl.close();
			const value = answer.trim();
			finalize(value || defaultValue || "");
		});
	});
}

function askHidden(question: string, defaultValue?: string): Promise<string> {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	const suffix = defaultValue ? ` ${COLOR.gray}[${defaultValue}]${COLOR.reset}` : "";

	return new Promise((resolve) => {
		let settled = false;

		const cleanup = (): void => {
			process.off("SIGINT", onSigint);
		};

		const finalize = (value: string): void => {
			if (settled) {
				return;
			}
			settled = true;
			cleanup();
			resolve(value);
		};

		const onSigint = (): void => {
			cleanup();
			rl.close();
			print("");
			printError("Installation cancelled by user (Ctrl+C).");
			process.exit(1);
		};

		process.once("SIGINT", onSigint);

		(
			rl as readline.Interface & {
				_writeToOutput?: (value: string) => void;
			}
		)._writeToOutput = (value: string) => {
			// WARNING: _writeToOutput is an undocumented Node.js readline hook.
			// Bun/Node upgrades may break this masking workaround. Revisit when updating runtimes.
			if (value.includes("\n") || value.includes("\r")) {
				(rl.output as NodeJS.WriteStream).write(value);
				return;
			}
			(rl.output as NodeJS.WriteStream).write("*");
		};

		rl.question(`${question}${suffix}: `, (answer) => {
			rl.close();
			print("");
			const value = answer.trim();
			finalize(value || defaultValue || "");
		});
	});
}

async function askBoolean(question: string, defaultYes = true): Promise<boolean> {
	const defaultLabel = defaultYes ? "Y/n" : "y/N";

	while (true) {
		const answer = (await ask(`${question} (${defaultLabel})`)).toLowerCase();

		if (!answer) {
			return defaultYes;
		}

		if (["y", "yes"].includes(answer)) {
			return true;
		}

		if (["n", "no"].includes(answer)) {
			return false;
		}

		printWarning("Please enter y/yes/n/no or press Enter for default.");
	}
}

async function askChoice(
	question: string,
	options: { label: string; value: string; description?: string }[],
	defaultIndex = 0,
): Promise<string> {
	print(question);
	for (let i = 0; i < options.length; i += 1) {
		const item = options[i];
		const marker = i === defaultIndex ? "*" : " ";
		print(`  ${marker} ${i + 1}. ${item.label}`);
		if (item.description) {
			print(`      ${COLOR.gray}${item.description}${COLOR.reset}`);
		}
	}

	while (true) {
		const raw = await ask(`Choose 1-${options.length}`, String(defaultIndex + 1));
		if (!raw.trim()) {
			return options[defaultIndex].value;
		}

		const parsed = Number(raw);
		if (Number.isInteger(parsed) && parsed >= 1 && parsed <= options.length) {
			return options[parsed - 1].value;
		}

		printWarning(`Please enter a valid number between 1 and ${options.length}.`);
	}
}

async function detectMode(): Promise<Mode | null> {
	const hasHomeInstall = existsSync(join(homedir(), ".opencode"));

	if (!hasHomeInstall) {
		return "fresh";
	}

	const migration = await stepDetectMigration(createFreshState("cli"), () => undefined);
	if (migration.needed) {
		return "migrate";
	}

	const update = await stepDetectUpdate(createFreshState("cli"), () => undefined);
	if (update.needed) {
		return "update";
	}

	return null;
}

async function chooseModeInteractive(autoMode: Mode | null): Promise<Mode | null> {
	const explicitModes: Mode[] = [];
	if (values.fresh) explicitModes.push("fresh");
	if (values.migrate) explicitModes.push("migrate");
	if (values.update) explicitModes.push("update");

	if (explicitModes.length > 1) {
		throw new Error(
			`Conflicting mode flags: ${explicitModes.map((mode) => `--${mode}`).join(", ")}. Use only one of --fresh, --migrate, or --update.`,
		);
	}

	if (explicitModes.length === 1) {
		return explicitModes[0];
	}

	if (autoMode) {
		printInfo(`Auto-detected mode: ${autoMode}`);
		const useAuto = await askBoolean("Continue with detected mode?", true);
		if (useAuto) {
			return autoMode;
		}
	}

	const choice = await askChoice(
		"Select installation mode:",
		[
			{ label: "Fresh Install", value: "fresh", description: "New PAI-OpenCode setup" },
			{ label: "Migrate v2 -> v3", value: "migrate", description: "Move old skill structure to v3" },
			{ label: "Update v3.x", value: "update", description: "Apply latest installer updates" },
			{ label: "Exit", value: "exit", description: "Do nothing" },
		],
		autoMode ? ["fresh", "migrate", "update"].indexOf(autoMode) : 0,
	);

	if (choice === "exit") {
		return null;
	}

	return choice as Mode;
}

async function runFreshWizard(): Promise<void> {
	print("");
	print(`${COLOR.bold}Fresh Install${COLOR.reset}`);
	print(`${COLOR.gray}────────────────────────────────────────────────────────${COLOR.reset}`);

	const state = createFreshState("cli");

	progress(5, "Checking prerequisites");
	const prereq = await stepPrerequisites(state, progress);

	if (!prereq.git || !prereq.bun) {
		printError("Missing prerequisites.");
		if (!prereq.git) print("  - Install git first");
		if (!prereq.bun) print("  - Install bun first: https://bun.sh/install");
		process.exit(1);
	}

	printSuccess(`Git: ${prereq.gitVersion || "found"}`);
	printSuccess(`Bun: ${prereq.bunVersion || "found"}`);

	// PAI no longer builds OpenCode from source — vanilla OpenCode is installed
	// via the official opencode.ai installer. stepBuildOpenCode is kept as a
	// no-op to preserve step numbering for legacy flows.
	if (values["skip-build"] || values.rebuild) {
		const flag = values.rebuild ? "--rebuild" : "--skip-build";
		printWarning(`${flag} is deprecated (PAI now uses vanilla OpenCode). Ignoring.`);
	}
	await stepBuildOpenCode(state, progress, true);
	printInfo("OpenCode install is managed by the vanilla opencode.ai installer.");
	printInfo("If opencode is not on your PATH, run: curl -fsSL https://opencode.ai/install | bash");

	// Provider defaults to Zen free — no API key needed for out-of-box experience.
	// Users configure premium providers AFTER install via `/connect` in OpenCode.
	printInfo("Using OpenCode Zen (free models) — no API key required.");
	printInfo("To connect premium providers later, run /connect inside OpenCode.\n");

	await stepProviderConfig(
		state,
		{ provider: "zen", apiKey: "" },
		progress,
	);

	const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
	const principalName = await ask("Your name", "User");
	const aiName = await ask("AI assistant name", "PAI");
	const timezone = await ask("Timezone", detectedTimezone);

	await stepIdentity(
		state,
		{
			principalName,
			aiName,
			timezone,
		},
		progress,
	);

	const voiceProvider = await askChoice(
		"Voice setup (optional):",
		[
			{ label: "No voice", value: "none", description: "Text-only notifications" },
			{ label: "Google TTS", value: "google", description: "PAI voice server with Google" },
			{ label: "ElevenLabs", value: "elevenlabs", description: "Premium neural voices" },
			{ label: "macOS", value: "macos", description: "Built-in say voices" },
		],
		0,
	);

	if (voiceProvider === "none") {
		await stepVoice(state, { enabled: false, provider: "none" }, progress);
	} else {
		const voiceApiKey =
			voiceProvider === "google"
				? await askHidden("Google TTS API key (optional)", "")
				: voiceProvider === "elevenlabs"
					? await askHidden("ElevenLabs API key (optional)", "")
					: "";
		const voiceId = await ask("Voice ID (optional)", "");

		await stepVoice(
			state,
			{
				enabled: true,
				provider: voiceProvider as "google" | "elevenlabs" | "macos",
				apiKey: voiceApiKey || undefined,
				voiceId: voiceId || undefined,
			},
			progress,
		);
	}

	await stepInstallPAI(state, progress);

	print("");
	printSuccess("Fresh install completed.");
	print("");
	print("Next steps:");
	print("  1. Open a new terminal or source your shell config file");
	print("  2. Run: pai");
	print("");
	print("To use a different model provider (optional):");
	print("  Step 1 — Connect the provider inside a running OpenCode session:");
	print("           /connect");
	print("  Step 2 — Update agent model assignments in opencode.json:");
	print("           bun run .opencode/tools/switch-provider.ts <profile>");
	print("           bun run .opencode/tools/switch-provider.ts --list   (see available profiles)");
	print("");
	printInfo("Default: all agents use opencode/big-pickle (Zen free, no API key needed).");
	printInfo("Free model list: https://opencode.ai/docs/zen/");
}

async function runMigrationWizard(): Promise<void> {
	print("");
	print(`${COLOR.bold}Migration (v2 -> v3)${COLOR.reset}`);
	print(`${COLOR.gray}────────────────────────────────────────────────────────${COLOR.reset}`);

	const state = createFreshState("cli");
	const detection = await stepDetectMigration(state, progress);

	if (!detection.needed) {
		printSuccess(`No migration needed: ${detection.reason || "already v3-compatible"}`);
		return;
	}

	printInfo(`Detected ${detection.flatSkills?.length || 0} flat skill(s) needing migration.`);
	const proceed = await askBoolean("Create backup and migrate now?", true);
	if (!proceed) {
		printWarning("Migration cancelled.");
		return;
	}

	const dryRun = await askBoolean("Dry run migration only?", false);

	if (!dryRun) {
		const backupDir = await ask("Backup directory (blank = auto)", "");
		const backup = await stepCreateBackup(state, backupDir, progress);
		if (!backup.success) {
			printError(`Backup failed: ${backup.error || "unknown error"}`);
			process.exit(1);
		}

		printSuccess(`Backup created: ${backup.backupPath}`);
	}

	const result = await stepMigrate(state, progress, dryRun);

	if (!result.success) {
		if (result.errors.length > 0) {
			printError("Migration reported errors:");
			for (const error of result.errors) {
				print(`  - ${error}`);
			}
		}
		process.exit(1);
	}

	printSuccess(`Migrated ${result.migrated.length} skill(s).`);

	if (!dryRun) {
		// OpenCode binary installation is handled by the vanilla opencode.ai
		// installer, not by PAI migration. Just run finalization.
		printInfo("OpenCode install is managed by the vanilla opencode.ai installer.");
		await stepMigrationDone(state, result, progress);
	}

	printSuccess(dryRun ? "Dry-run migration finished." : "Migration completed.");
}

async function runUpdateWizard(): Promise<void> {
	print("");
	print(`${COLOR.bold}Update (v3.x)${COLOR.reset}`);
	print(`${COLOR.gray}────────────────────────────────────────────────────────${COLOR.reset}`);

	const state = createFreshState("cli");
	const detection = await stepDetectUpdate(state, progress);

	if (!detection.needed) {
		printSuccess(detection.reason || "Already up to date.");
		return;
	}

	printInfo(
		`Update available: ${detection.currentVersion || "unknown"} -> ${detection.targetVersion}`,
	);

	const apply = await askBoolean("Apply update now?", true);
	if (!apply) {
		printWarning("Update skipped.");
		return;
	}

	const updateResult = await stepApplyUpdate(state, progress);
	if (!updateResult.success) {
		printError(`Update failed: ${updateResult.error || "unknown error"}`);
		process.exit(1);
	}

	await stepUpdateDone(state, updateResult, progress);

	printSuccess(`Update complete. Current version: ${updateResult.newVersion || "unchanged"}`);
	if (updateResult.changesApplied.length > 0) {
		printInfo(`Changes applied: ${updateResult.changesApplied.join(", ")}`);
	}
}

async function main(): Promise<void> {
	if (values.help) {
		showHelp();
		return;
	}

	banner();

	const autoMode = await detectMode();
	if (!autoMode) {
		printInfo("No migration/update needed for existing install.");
		const installAnyway = await askBoolean("Run fresh install anyway?", false);
		if (!installAnyway) {
			printSuccess("Nothing to do.");
			return;
		}
	}

	const selectedMode = await chooseModeInteractive(autoMode);
	if (!selectedMode) {
		printSuccess("Installer exited.");
		return;
	}

	switch (selectedMode) {
		case "fresh":
			await runFreshWizard();
			break;
		case "migrate":
			await runMigrationWizard();
			break;
		case "update":
			await runUpdateWizard();
			break;
	}
}

main().catch((error) => {
	printError(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
	process.exit(1);
});
