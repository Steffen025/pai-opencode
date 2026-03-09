#!/usr/bin/env bun
/**
 * PAI-OpenCode Installer — Headless/CLI Mode
 * 
 * Non-interactive installation for CI/CD, homeservers, and power users.
 * 
 * Usage:
 *   bun PAI-Install/cli/quick-install.ts --preset zen --name "User"
 *   bun PAI-Install/cli/quick-install.ts --migrate
 *   bun PAI-Install/cli/quick-install.ts --update
 */

import { parseArgs } from "node:util";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { InstallState } from "../engine/types";
import { createFreshState } from "../engine/state";
import { stepPrerequisites } from "../engine/steps-fresh";
import { stepBuildOpenCode } from "../engine/steps-fresh";
import { stepProviderConfig, ZEN_FREE_MODELS } from "../engine/steps-fresh";
import { stepIdentity } from "../engine/steps-fresh";
import { stepVoice } from "../engine/steps-fresh";
import { stepInstallPAI } from "../engine/steps-fresh";
import { stepDetectMigration, stepCreateBackup, stepMigrate, stepBinaryUpdate, stepMigrationDone } from "../engine/steps-migrate";
import { stepDetectUpdate, stepApplyUpdate, stepUpdateDone } from "../engine/steps-update";

// ═══════════════════════════════════════════════════════════
// CLI Arguments
// ═══════════════════════════════════════════════════════════

const { values } = parseArgs({
	args: Bun.argv.slice(2),
	options: {
		// Mode selection
		"fresh": { type: "boolean", default: false },
		"migrate": { type: "boolean", default: false },
		"update": { type: "boolean", default: false },
		
		// Fresh install options
		"preset": { type: "string", default: "zen" },
		"name": { type: "string" },
		"ai-name": { type: "string" },
		"timezone": { type: "string" },
		"api-key": { type: "string" },
		"elevenlabs-key": { type: "string" },
		"skip-build": { type: "boolean", default: false },
		"no-voice": { type: "boolean", default: false },
		
		// Migration options
		"backup-dir": { type: "string" },
		"dry-run": { type: "boolean", default: false },
		
		// General
		"help": { type: "boolean", default: false },
		"version": { type: "boolean", default: false },
	},
	strict: true,
});

// ═══════════════════════════════════════════════════════════
// Help
// ═══════════════════════════════════════════════════════════

if (values.help) {
	console.log(`
PAI-OpenCode Quick Installer — Headless Mode

USAGE:
  bun PAI-Install/cli/quick-install.ts [OPTIONS]

MODES:
  --fresh              Fresh install (default if no mode specified)
  --migrate            Migrate from v2 to v3
  --update             Update v3.x to latest

FRESH INSTALL OPTIONS:
  --preset <name>      Provider preset: zen (default), anthropic, openrouter
  --name <name>        Your name (principal)
  --ai-name <name>     AI assistant name
  --timezone <tz>      Timezone (default: auto-detect)
  --api-key <key>      API key for selected provider
  --elevenlabs-key <k> ElevenLabs API key (optional)
  --skip-build         Skip building OpenCode binary
  --no-voice           Skip voice setup

MIGRATION OPTIONS:
  --backup-dir <path>  Custom backup directory
  --dry-run            Preview changes without applying

EXAMPLES:
  # Fresh install with Zen (FREE)
  bun cli/quick-install.ts --preset zen --name "Steffen" --ai-name "Jeremy"

  # Fresh install with Anthropic
  bun cli/quick-install.ts --preset anthropic --api-key "sk-ant-..."

  # Migrate v2→v3
  bun cli/quick-install.ts --migrate

  # Update to latest
  bun cli/quick-install.ts --update

For interactive GUI installation, run: bash install.sh
`);
	process.exit(0);
}

// ═══════════════════════════════════════════════════════════
// Progress Handler
// ═══════════════════════════════════════════════════════════

function onProgress(percent: number, message: string): void {
	const bar = "█".repeat(Math.floor(percent / 5)) + "░".repeat(20 - Math.floor(percent / 5));
	console.log(`[${bar}] ${percent.toString().padStart(3)}% ${message}`);
}

// ═══════════════════════════════════════════════════════════
// Fresh Install Flow
// ═══════════════════════════════════════════════════════════

async function runFreshInstall(): Promise<void> {
	console.log("🚀 PAI-OpenCode Fresh Install (Headless)\n");
	
	const state = createFreshState("cli");
	
	// Step 1: Welcome (instant)
	console.log("Welcome to PAI-OpenCode!");
	
	// Step 2: Prerequisites
	onProgress(10, "Checking prerequisites...");
	const prereqs = await stepPrerequisites(state, onProgress);
	
	if (!prereqs.git || !prereqs.bun) {
		console.error("❌ Missing prerequisites:");
		if (!prereqs.git) console.error("  - Git not found");
		if (!prereqs.bun) console.error("  - Bun not found");
		process.exit(1);
	}
	
	// Step 3: Build OpenCode
	if (!values["skip-build"]) {
		onProgress(10, "Building OpenCode binary...");
		const buildResult = await stepBuildOpenCode(
			state,
			onProgress,
			false
		);
		
		if (!buildResult.success) {
			console.error("❌ Build failed:", buildResult.error);
			console.error("Use --skip-build to use standard OpenCode");
			process.exit(1);
		}
	} else {
		onProgress(70, "Skipped OpenCode build");
	}
	
	// Step 4: Provider Config
	onProgress(75, "Configuring provider...");
	const preset = values.preset || "zen";
	const models = preset === "zen" ? ZEN_FREE_MODELS : {
		quick: "claude-haiku-3.5",
		standard: "claude-sonnet-4.6",
		advanced: "claude-opus-4.6",
	};
	
	await stepProviderConfig(
		state,
		{
			provider: preset as any,
			apiKey: values["api-key"] || "",
			modelTier: "standard",
			models,
		},
		onProgress
	);
	
	// Step 5: Identity
	onProgress(80, "Setting identity...");
	await stepIdentity(
		state,
		{
			principalName: values.name || "User",
			aiName: values["ai-name"] || "PAI",
			timezone: values.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
		},
		onProgress
	);
	
	// Step 6: Voice (optional)
	if (!values["no-voice"]) {
		onProgress(85, "Configuring voice...");
		await stepVoice(
			state,
			{
				enabled: !!values["elevenlabs-key"],
				provider: values["elevenlabs-key"] ? "elevenlabs" : "none",
				apiKey: values["elevenlabs-key"],
			},
			onProgress
		);
	}
	
	// Step 7: Install
	onProgress(90, "Installing PAI files...");
	await stepInstallPAI(state, onProgress);
	
	onProgress(100, "✅ Installation complete!");
	console.log("\nNext steps:");
	console.log(`  1. Add to .zshrc: alias ${state.collected.aiName?.toLowerCase() || "pai"}="/usr/local/bin/${state.collected.aiName?.toLowerCase() || "pai"}-wrapper"`);
	console.log(`  2. Restart terminal or run: source ~/.zshrc`);
	console.log(`  3. Launch with: ${state.collected.aiName?.toLowerCase() || "pai"}`);
}

// ═══════════════════════════════════════════════════════════
// Migration Flow
// ═══════════════════════════════════════════════════════════

async function runMigration(): Promise<void> {
	console.log("🔄 PAI-OpenCode v2→v3 Migration (Headless)\n");
	
	const state = createFreshState("cli");
	
	// Step 1: Detect
	onProgress(0, "Detecting migration needs...");
	const detection = await stepDetectMigration(state, onProgress);
	
	if (!detection.needed) {
		console.log("✅ No migration needed:", detection.reason);
		process.exit(0);
	}
	
	console.log(`Found ${detection.flatSkills?.length || 0} skills to migrate`);
	
	if (values["dry-run"]) {
		console.log("\n🧪 DRY RUN MODE — No changes will be made\n");
	}
	
	// Step 2: Backup
	onProgress(10, "Creating backup...");
	const backupResult = await stepCreateBackup(
		state,
		values["backup-dir"] || "",
		onProgress
	);
	
	if (!backupResult.success) {
		console.error("❌ Backup failed:", backupResult.error);
		process.exit(1);
	}
	
	console.log("📦 Backup created:", backupResult.backupPath);
	
	// Step 3: Migrate
	const migrationResult = await stepMigrate(state, onProgress, values["dry-run"]);
	
	if (migrationResult.errors.length > 0) {
		console.error("❌ Migration errors:");
		for (const error of migrationResult.errors) {
			console.error("  -", error);
		}
		process.exit(1);
	}
	
	console.log(`✅ Migrated ${migrationResult.migrated.length} skills`);
	
	// Step 4: Binary update (optional)
	if (!values["dry-run"]) {
		onProgress(70, "Building OpenCode binary...");
		await stepBinaryUpdate(state, onProgress, false);
	}
	
	// Step 5: Done
	await stepMigrationDone(state, migrationResult, onProgress);
	
	onProgress(100, "✅ Migration complete!");
	
	if (!values["dry-run"]) {
		console.log("\nBackup location:", backupResult.backupPath);
		console.log("If anything went wrong, restore with:");
		console.log(`  rm -rf ~/.opencode && cp -R ${backupResult.backupPath} ~/.opencode`);
	}
}

// ═══════════════════════════════════════════════════════════
// Update Flow
// ═══════════════════════════════════════════════════════════

async function runUpdate(): Promise<void> {
	console.log("⬆️  PAI-OpenCode Update (Headless)\n");
	
	const state = createFreshState("cli");
	
	// Step 1: Detect
	const detection = await stepDetectUpdate(state, onProgress);
	
	if (!detection.needed) {
		console.log("✅", detection.reason);
		process.exit(0);
	}
	
	console.log(`Updating ${detection.currentVersion} → ${detection.targetVersion}`);
	
	// Step 2: Apply update
	const result = await stepApplyUpdate(state, onProgress, false);
	
	if (!result.success) {
		console.error("❌ Update failed:", result.error);
		process.exit(1);
	}
	
	// Step 3: Done
	await stepUpdateDone(state, result, onProgress);
	
	onProgress(100, "✅ Update complete!");
	console.log("\nChanges applied:", result.changesApplied.join(", "));
	if (result.binaryUpdated) {
		console.log("OpenCode binary updated");
	}
}

// ═══════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════

async function main(): Promise<void> {
	// Determine mode
	const mode = values.migrate ? "migrate" : values.update ? "update" : "fresh";
	
	// Auto-detect if not specified
	if (!values.fresh && !values.migrate && !values.update) {
		const paiDir = join(homedir(), ".opencode");
		
		if (!existsSync(paiDir)) {
			// Fresh install
			await runFreshInstall();
		} else {
			// Check if migration needed
			const { isMigrationNeeded } = await import("../engine/migrate");
			const migrationCheck = isMigrationNeeded();
			
			if (migrationCheck.needed) {
				console.log("Detected v2 installation — running migration");
				await runMigration();
			} else {
				// Check for updates
				const { isUpdateNeeded } = await import("../engine/update");
				const updateCheck = isUpdateNeeded();
				
				if (updateCheck.needed) {
					console.log("Update available — running update");
					await runUpdate();
				} else {
					console.log("PAI-OpenCode is up to date");
					process.exit(0);
				}
			}
		}
	} else {
		// Explicit mode
		switch (mode) {
			case "migrate":
				await runMigration();
				break;
			case "update":
				await runUpdate();
				break;
			default:
				await runFreshInstall();
				break;
		}
	}
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
