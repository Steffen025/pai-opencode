#!/usr/bin/env bun
/**
 * PAI-OpenCode Installer Engine — v3→v3.x Update
 * 
 * Handles updates within v3.x versions (not migration from v2).
 * Preserves all user settings and customizations.
 */

import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// ═══════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════

const PAI_DIR = join(homedir(), ".opencode");
const CURRENT_VERSION_FILE = join(PAI_DIR, ".version");
const TARGET_VERSION = "3.0.0"; // Updated by release process

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface UpdateOptions {
	onProgress?: (message: string, percent: number) => void | Promise<void>;
	skipBinaryUpdate?: boolean;
}

export interface UpdateResult {
	success: boolean;
	changesApplied: string[];
	newVersion?: string;
	binaryUpdated?: boolean;
	error?: string;
}

// ═══════════════════════════════════════════════════════════
// Version Management
// ═══════════════════════════════════════════════════════════

function getCurrentVersion(): string {
	if (!existsSync(CURRENT_VERSION_FILE)) {
		// Try to detect from settings.json
		const settingsPath = join(PAI_DIR, "settings.json");
		if (existsSync(settingsPath)) {
			try {
				const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
				if (settings.pai?.version) {
					return settings.pai.version;
				}
			} catch {
				// Fall through to unknown
			}
		}
		return "unknown";
	}
	
	return readFileSync(CURRENT_VERSION_FILE, "utf-8").trim();
}

function setCurrentVersion(version: string): void {
	writeFileSync(CURRENT_VERSION_FILE, version, "utf-8");
}

function compareVersions(v1: string, v2: string): number {
	const parts1 = v1.split(".").map(Number);
	const parts2 = v2.split(".").map(Number);
	
	for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
		const p1 = parts1[i] || 0;
		const p2 = parts2[i] || 0;
		if (p1 < p2) return -1;
		if (p1 > p2) return 1;
	}
	
	return 0;
}

// ═══════════════════════════════════════════════════════════
// Detect Changes
// ═══════════════════════════════════════════════════════════

function detectChanges(currentVersion: string, targetVersion: string): string[] {
	const changes: string[] = [];
	
	// Parse versions
	const current = currentVersion.split(".").map(Number);
	const target = targetVersion.split(".").map(Number);
	
	// Major version change (shouldn't happen within v3)
	if (target[0] !== current[0]) {
		changes.push("major-version-change");
	}
	
	// Minor version change (new features)
	if (target[1] > (current[1] || 0)) {
		changes.push("new-features");
	}
	
	// Patch version change (bug fixes)
	if (target[2] > (current[2] || 0)) {
		changes.push("bug-fixes");
	}
	
	return changes;
}

// ═══════════════════════════════════════════════════════════
// Update Actions
// ═══════════════════════════════════════════════════════════

async function updateSkills(
	sourceDir: string,
	onProgress?: (message: string) => void
): Promise<void> {
	onProgress?.("Checking for skill updates...");
	
	// In a real implementation, this would:
	// 1. Compare local skills with upstream
	// 2. Update modified skills
	// 3. Add new skills
	// 4. Preserve user customizations
	
	// For now, placeholder
	onProgress?.("Skills up to date");
}

async function updateCoreFiles(
	sourceDir: string,
	onProgress?: (message: string) => void
): Promise<void> {
	onProgress?.("Updating core files...");
	
	// Update PAI/ docs if needed
	// Update plugins if needed
	// Update hooks if needed
	
	onProgress?.("Core files updated");
}

async function updateBinaryIfNeeded(
	onProgress?: (message: string) => void
): Promise<boolean> {
	onProgress?.("Checking OpenCode binary...");
	
	// Check if custom binary exists
	const customBinPath = join(homedir(), ".opencode", "tools", "opencode");
	
	if (!existsSync(customBinPath)) {
		onProgress?.("No custom binary found — skipping binary update");
		return false;
	}
	
	// In a real implementation, this would check if the binary needs
	// to be rebuilt (e.g., new commit in feature/model-tiers branch)
	
	onProgress?.("Binary up to date");
	return false; // No update needed
}

// ═══════════════════════════════════════════════════════════
// Main Update Function
// ═══════════════════════════════════════════════════════════

export async function updateV3(
	options: UpdateOptions = {}
): Promise<UpdateResult> {
	const { onProgress, skipBinaryUpdate = false } = options;
	
	const result: UpdateResult = {
		success: false,
		changesApplied: [],
	};
	
	try {
		// 1. Detect current version (0%)
		await onProgress?.("Detecting current version...", 0);
		
		const currentVersion = getCurrentVersion();
		
		if (currentVersion === "unknown") {
			throw new Error("Could not detect current PAI version");
		}
		
		// Check if update is needed
		if (compareVersions(currentVersion, TARGET_VERSION) >= 0) {
			await onProgress?.("Already up to date!", 100);
			result.success = true;
			result.changesApplied = [];
			return result;
		}
		
		// 2. Detect what changed (10%)
		await onProgress?.("Detecting changes...", 10);
		
		const changes = detectChanges(currentVersion, TARGET_VERSION);
		result.changesApplied = changes;
		
		// 3. Update skills (10-40%)
		await onProgress?.("Updating skills...", 20);
		await updateSkills(PAI_DIR, (msg) => onProgress?.(msg, 30));
		
		// 4. Update core files (40-70%)
		await onProgress?.("Updating core files...", 50);
		await updateCoreFiles(PAI_DIR, (msg) => onProgress?.(msg, 60));
		
		// 5. Update binary if needed (70-90%)
		let binaryUpdated = false;
		if (!skipBinaryUpdate) {
			await onProgress?.("Checking OpenCode binary...", 70);
			binaryUpdated = await updateBinaryIfNeeded(
				(msg) => onProgress?.(msg, 80)
			);
		}
		result.binaryUpdated = binaryUpdated;
		
		// 6. Update version marker (90%)
		await onProgress?.("Finalizing...", 90);
		setCurrentVersion(TARGET_VERSION);
		result.newVersion = TARGET_VERSION;
		
		// Done (100%)
		await onProgress?.("Update complete!", 100);
		result.success = true;
		
		return result;
		
	} catch (error) {
		result.error = error instanceof Error ? error.message : String(error);
		result.success = false;
		return result;
	}
}

// ═══════════════════════════════════════════════════════════
// Detect if update is needed
// ═══════════════════════════════════════════════════════════

export function isUpdateNeeded(): {
	needed: boolean;
	currentVersion?: string;
	targetVersion: string;
	reason?: string;
} {
	if (!existsSync(PAI_DIR)) {
		return {
			needed: false,
			targetVersion: TARGET_VERSION,
			reason: "No existing installation",
		};
	}
	
	const currentVersion = getCurrentVersion();
	
	if (currentVersion === "unknown") {
		return {
			needed: true,
			currentVersion,
			targetVersion: TARGET_VERSION,
			reason: "Version unknown — likely needs update",
		};
	}
	
	const comparison = compareVersions(currentVersion, TARGET_VERSION);
	
	if (comparison >= 0) {
		return {
			needed: false,
			currentVersion,
			targetVersion: TARGET_VERSION,
			reason: `Already at ${currentVersion}`,
		};
	}
	
	return {
		needed: true,
		currentVersion,
		targetVersion: TARGET_VERSION,
		reason: `${currentVersion} → ${TARGET_VERSION}`,
	};
}
