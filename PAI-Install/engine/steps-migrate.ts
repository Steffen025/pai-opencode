#!/usr/bin/env bun
/**
 * PAI-OpenCode Installer — Migration Steps (v2→v3)
 * 
 * 5-step migration flow with explicit user consent and backup.
 */

import { existsSync, cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { InstallState } from "./types";
import { PAI_VERSION } from "./types";
import { migrateV2ToV3, isMigrationNeeded } from "./migrate";
import { buildOpenCodeBinary } from "./build-opencode";
import type { MigrationResult } from "./migrate";

// ═══════════════════════════════════════════════════════════
// Step 1: Detected
// ═══════════════════════════════════════════════════════════

export interface MigrationDetectionResult {
	needed: boolean;
	reason?: string;
	flatSkills?: string[];
	backupPath?: string;
}

export async function stepDetectMigration(
	state: InstallState,
	onProgress: (percent: number, message: string) => void
): Promise<MigrationDetectionResult> {
	onProgress(0, "Detecting existing installation...");
	
	const detection = isMigrationNeeded();
	
	if (!detection.needed) {
		return {
			needed: false,
			reason: detection.reason,
		};
	}
	
	return {
		needed: true,
		reason: detection.reason,
		flatSkills: detection.flatSkills,
	};
}

// ═══════════════════════════════════════════════════════════
// Step 2: Backup
// ═══════════════════════════════════════════════════════════

export async function stepCreateBackup(
	state: InstallState,
	backupDir: string,
	onProgress: (percent: number, message: string) => void
): Promise<{ success: boolean; backupPath: string; error?: string }> {
	onProgress(10, "Creating backup...");
	
	const paiDir = join(homedir(), ".opencode");
	
	// Check if backup already exists
	const finalBackupDir = backupDir || join(
		homedir(),
		`.opencode-backup-${Date.now()}`
	);
	
	if (existsSync(finalBackupDir)) {
		return {
			success: false,
			backupPath: finalBackupDir,
			error: `Backup already exists at ${finalBackupDir}`,
		};
	}
	
	// Create the backup directory
	onProgress(30, "Creating backup directory...");
	try {
		mkdirSync(finalBackupDir, { recursive: true });
	} catch (err) {
		return {
			success: false,
			backupPath: finalBackupDir,
			error: `Failed to create backup directory: ${err instanceof Error ? err.message : String(err)}`,
		};
	}
	
	// Copy the entire .opencode directory to backup
	if (existsSync(paiDir)) {
		onProgress(50, "Copying files to backup location...");
		try {
			cpSync(paiDir, finalBackupDir, { recursive: true });
			onProgress(80, "Backup created successfully");
		} catch (err) {
			return {
				success: false,
				backupPath: finalBackupDir,
				error: `Failed to copy files to backup: ${err instanceof Error ? err.message : String(err)}`,
			};
		}
	} else {
		onProgress(80, "No existing installation to backup");
	}
	
	// Store backup path in state
	state.collected.backupPath = finalBackupDir;
	
	return {
		success: true,
		backupPath: finalBackupDir,
	};
}

// ═══════════════════════════════════════════════════════════
// Step 3: Migrate
// ═══════════════════════════════════════════════════════════

export async function stepMigrate(
	state: InstallState,
	onProgress: (percent: number, message: string) => void,
	dryRun: boolean = false
): Promise<MigrationResult> {
	onProgress(20, "Starting migration...");
	
	const result = await migrateV2ToV3({
		dryRun,
		backupDir: state.collected.backupPath,
		onProgress: async (message, percent) => {
			// Map migration progress (10-100) to step progress (20-70)
			const mappedPercent = 20 + (percent * 0.5);
			onProgress(Math.round(mappedPercent), message);
		},
	});
	
	return result;
}

// ═══════════════════════════════════════════════════════════
// Step 4: Binary Update (Optional)
// ═══════════════════════════════════════════════════════════

export async function stepBinaryUpdate(
	state: InstallState,
	onProgress: (percent: number, message: string) => void,
	skipBuild: boolean = false
): Promise<{ success: boolean; skipped: boolean; error?: string }> {
	if (skipBuild) {
		onProgress(90, "Skipped OpenCode binary update");
		return { success: true, skipped: true };
	}
	
	onProgress(70, "Building OpenCode binary...");
	
	const buildResult = await buildOpenCodeBinary({
		onProgress: (message, percent) => {
			const mappedPercent = 70 + (percent * 0.2);
			onProgress(Math.round(mappedPercent), message);
		},
		skipIfExists: true,
	});
	
	if (!buildResult.success) {
		return {
			success: false,
			skipped: false,
			error: buildResult.error || "Build failed",
		};
	}
	
	return { success: true, skipped: buildResult.skipped || false };
}

// ═══════════════════════════════════════════════════════════
// Step 5: Done
// ═══════════════════════════════════════════════════════════

export async function stepMigrationDone(
	state: InstallState,
	result: MigrationResult,
	onProgress: (percent: number, message: string) => void
): Promise<void> {
	const paiDir = join(homedir(), ".opencode");
	
	onProgress(95, "Finalizing migration...");
	
	// 1. Write/update version marker
	onProgress(96, "Writing version marker...");
	const versionFile = join(paiDir, ".version");
	try {
		writeFileSync(versionFile, `${PAI_VERSION}\n`, "utf-8");
	} catch (err) {
		// Non-fatal - version can be detected from settings.json
		console.warn("Could not write version file:", err);
	}
	
	// 2. Install CLI wrapper
	onProgress(97, "Installing CLI wrapper...");
	const wrapperDir = join(homedir(), ".local", "bin");
	const wrapperPath = join(wrapperDir, "pai");
	const wrapperContent = `#!/bin/bash
# PAI-OpenCode CLI Wrapper
exec bun "${join(paiDir, "PAI", "Tools", "pai.ts")}" "$@"
`;
	try {
		mkdirSync(wrapperDir, { recursive: true });
		writeFileSync(wrapperPath, wrapperContent, { mode: 0o755 });
	} catch (err) {
		// Non-fatal - shell alias will still work
		console.warn("Could not install CLI wrapper:", err);
	}
	
	// 3. Update shell rc file with alias/PATH
	onProgress(98, "Updating shell configuration...");
	const userShell = process.env.SHELL || "/bin/zsh";
	const isFish = userShell.includes("fish");
	const rcFile = userShell.includes("bash") ? ".bashrc" : isFish ? ".config/fish/config.fish" : ".zshrc";
	const rcPath = join(homedir(), rcFile);
	// Escape internal single quotes using POSIX '\'' technique.
	// escapedPath is used directly inside a single-quoted string in aliasLine —
	// the outer single quotes come from aliasLine itself, NOT from escapedPath.
	const rawPath = join(paiDir, "PAI", "Tools", "pai.ts");
	const escapedPath = rawPath.replace(/'/g, "'\\''");
	const aliasLine = isFish
		? `alias pai 'bun ${escapedPath}'`
		: `alias pai='bun ${escapedPath}'`;
	const startMarker = "# PAI shell setup — added by PAI installer";
	const endMarker = "# end PAI shell setup";
	
	try {
		let content = "";
		if (existsSync(rcPath)) {
			content = readFileSync(rcPath, "utf-8");
			content = content.replace(/\n?# PAI shell setup — added by PAI installer[\s\S]*?# end PAI shell setup\n?/g, "");
			// Remove old PAI aliases
			content = content.replace(/^#\s*(?:PAI|CORE)\s*alias.*\n.*alias pai=.*\n?/gm, "");
			content = content.replace(/^alias pai=.*\n?/gm, "");
			content = content.replace(/^alias pai\s+.*\n?/gm, "");
		}
		content = content.trimEnd() + `\n\n${startMarker}\n${aliasLine}\n${endMarker}\n`;
		writeFileSync(rcPath, content);
	} catch (err) {
		console.warn("Could not update shell rc file:", err);
	}
	
	onProgress(100, "Migration complete!");
}

// ═══════════════════════════════════════════════════════════
// Orchestrator: Migration Flow
// ═══════════════════════════════════════════════════════════

export async function runMigration(
  state: InstallState,
  emit: (event: any) => Promise<void>,
  requestInput: (id: string, prompt: string, type: "text" | "password" | "key", placeholder?: string) => Promise<string>,
  requestChoice: (id: string, prompt: string, choices: { label: string; value: string; description?: string }[]) => Promise<string>
): Promise<void> {
  // Step 1: Detect Migration
  await emit({ event: "step_start", step: "detect" });
  const detection = await stepDetectMigration(state, (percent, message) => {
    void emit({ event: "progress", step: "detect", percent, detail: message }).catch(() => {});
  });
  await emit({ event: "step_complete", step: "detect" });

  // Early return if no migration is needed
  if (!detection.needed || (detection.flatSkills || []).length === 0) {
    await emit({ event: "message", content: "No migration needed — installation is already up to date." });
    return;
  }

  // Step 2: Consent — prompt BEFORE opening the backup step so cancel leaves no open step
  await emit({ 
    event: "message", 
    content: MIGRATION_CONSENT_TEXT.title + "\n" + 
             MIGRATION_CONSENT_TEXT.description((detection.flatSkills || []).length)
  });
  
  const consentChoices = [
    { label: MIGRATION_CONSENT_TEXT.buttons.proceed, value: "proceed", description: "Create backup and migrate" },
    { label: MIGRATION_CONSENT_TEXT.buttons.cancel, value: "cancel", description: "Exit without migrating" },
  ];
  const consent = await requestChoice("migration-consent", MIGRATION_CONSENT_TEXT.warning, consentChoices);
  
  if (consent !== "proceed") {
    await emit({ event: "message", content: "Migration cancelled by user." });
    return;
  }

  // Open the backup step only after consent is confirmed
  await emit({ event: "step_start", step: "backup" });

  let backupResult: { success: boolean; backupPath: string; error?: string };
  try {
    backupResult = await stepCreateBackup(state, "", (percent, message) => {
      void emit({ event: "progress", step: "backup", percent, detail: message }).catch(() => {});
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await emit({ event: "message", content: `Backup failed unexpectedly: ${msg}` });
    throw err;
  }

  if (!backupResult.success) {
    await emit({ event: "message", content: `Backup failed: ${backupResult.error || "Unknown error"}` });
    throw new Error(`Backup failed: ${backupResult.error || "Unknown error"}`);
  }
  await emit({ event: "step_complete", step: "backup" });

  // Step 3: Migrate Configuration
  await emit({ event: "step_start", step: "migrate-config" });
  let migrationResult: MigrationResult;
  try {
    migrationResult = await stepMigrate(state, (percent, message) => {
      void emit({ event: "progress", step: "migrate-config", percent, detail: message }).catch(() => {});
    }, false);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await emit({ event: "message", content: `Migration failed unexpectedly: ${msg}` });
    throw err;
  }

  if (!migrationResult.success) {
    await emit({ event: "message", content: `Migration failed: ${migrationResult.error || "Unknown error"}` });
    throw new Error(`Migration failed: ${migrationResult.error || "Unknown error"}`);
  }
  await emit({ event: "step_complete", step: "migrate-config" });

  // Step 4: Build Binary
  await emit({ event: "step_start", step: "build" });
  const binaryResult = await stepBinaryUpdate(state, (percent, message) => {
    void emit({ event: "progress", step: "build", percent, detail: message }).catch(() => {});
  }, false);
  
  if (!binaryResult.success) {
    throw new Error(`Binary build failed: ${binaryResult.error || "Unknown error"}`);
  }
  await emit({ event: "step_complete", step: "build" });

  // Step 5: Verify Migration
  await emit({ event: "step_start", step: "verify" });
  await stepMigrationDone(state, migrationResult, (percent, message) => {
    void emit({ event: "progress", step: "verify", percent, detail: message }).catch(() => {});
  });
  await emit({ event: "step_complete", step: "verify" });
}

// ═══════════════════════════════════════════════════════════
// Migration Consent UI Text
// ═══════════════════════════════════════════════════════════

export const MIGRATION_CONSENT_TEXT = {
	title: "⚠️ Migration Required",
	
	description: (skillCount: number) => 
		`We found PAI-OpenCode v2.x with ${skillCount} skill${skillCount === 1 ? "" : "s"} ` +
		"that need to be reorganized for v3.0 compatibility.",
	
	whatWillHappen: [
		"• Backup created before any changes",
		"• Skills reorganized (flat → hierarchical structure)",
		"• Settings and customizations preserved",
		"• ~5 minutes duration",
	],
	
	backupLocation: (path: string) => `Backup: ${path}`,
	
	warning: "⬇️ BEFORE PROCEEDING:\n" +
		"Your data will be backed up automatically. " +
		"You can restore from backup if anything goes wrong.",
	
	buttons: {
		cancel: "Cancel",
		proceed: "Create Backup & Migrate",
	},
	
	helpLink: "ℹ️ Learn more: docs/MIGRATION.md",
};
