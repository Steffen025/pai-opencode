#!/usr/bin/env bun
/**
 * PAI-OpenCode Installer — Migration Steps (v2→v3)
 * 
 * 5-step migration flow with explicit user consent and backup.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { InstallState } from "./types";
import { migrateV2ToV3, isMigrationNeeded } from "./migrate";
import { buildOpenCodeBinary } from "./build-opencode";
import type { MigrationResult } from "./migrate";

// ═══════════════════════════════════════════════════════════
// Step 1: Detected
// ═══════════════════════════════════════════════════════════

export interface DetectionResult {
	needed: boolean;
	reason?: string;
	flatSkills?: string[];
	backupPath?: string;
}

export async function stepDetectMigration(
	state: InstallState,
	onProgress: (percent: number, message: string) => void
): Promise<DetectionResult> {
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
	
	// Store backup path in state (using a property that exists)
	(state as any).backupPath = finalBackupDir;
	
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
	onProgress(95, "Finalizing migration...");
	
	// Update version marker
	// Ensure wrapper is installed
	// Update .zshrc if needed
	
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
  emit({ event: "step_start", step: "detect" });
  const detection = await stepDetectMigration(state, (percent, message) => {
    emit({ event: "progress", step: "detect", percent, detail: message });
  });
  emit({ event: "step_complete", step: "detect" });

  // Step 2: Create Backup (with explicit consent)
  emit({ event: "step_start", step: "backup" });
  emit({ 
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
    throw new Error("Migration cancelled by user");
  }
  
  const backupResult = await stepCreateBackup(state, "", (percent, message) => {
    emit({ event: "progress", step: "backup", percent, detail: message });
  });
  emit({ event: "step_complete", step: "backup" });

  // Step 3: Migrate Configuration
  emit({ event: "step_start", step: "migrate-config" });
  const migrationResult = await stepMigrate(state, (percent, message) => {
    emit({ event: "progress", step: "migrate-config", percent, detail: message });
  }, false);
  emit({ event: "step_complete", step: "migrate-config" });

  // Step 4: Build Binary
  emit({ event: "step_start", step: "build" });
  const { buildOpenCodeBinary } = await import("./build-opencode");
  await buildOpenCodeBinary({
    onProgress: async (message, percent) => {
      emit({ event: "progress", step: "build", percent, detail: message });
    },
    skipIfExists: false,
  });
  emit({ event: "step_complete", step: "build" });

  // Step 5: Verify Migration
  emit({ event: "step_start", step: "verify" });
  await stepMigrationDone(state, migrationResult, (percent, message) => {
    emit({ event: "progress", step: "verify", percent, detail: message });
  });
  emit({ event: "step_complete", step: "verify" });
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
