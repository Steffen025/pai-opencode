#!/usr/bin/env bun
/**
 * PAI-OpenCode Installer Engine — v2→v3 Migration
 * 
 * Migrates existing v2.x installations to v3.0 structure.
 * 
 * Based on: Tools/migration-v2-to-v3.ts (port)
 * Ported with improvements: Better error handling, progress callbacks
 */

import {
	existsSync,
	mkdirSync,
	readdirSync,
	statSync,
	copyFileSync,
	renameSync,
	writeFileSync,
	readFileSync,
} from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// ═══════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════

const PAI_DIR = join(homedir(), ".opencode");
const BACKUP_PREFIX = ".opencode-backup-";

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface MigrationOptions {
	dryRun?: boolean;
	backupDir?: string;
	onProgress?: (message: string, percent: number) => void | Promise<void>;
}

export interface MigrationResult {
	backupPath?: string;
	migrated: string[];
	skipped: string[];
	errors: string[];
	success: boolean;
}

// ═══════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════

function generateTimestamp(): string {
	const now = new Date();
	return now.toISOString().replace(/[:.]/g, "-").replace("T", "-").slice(0, -5);
}

function log(
	message: string,
	level: "info" | "success" | "warn" | "error" = "info"
): void {
	const icons = { info: "ℹ", success: "✓", warn: "⚠", error: "✗" };
	console.log(`${icons[level]} ${message}`);
}

// ═══════════════════════════════════════════════════════════
// Backup Creation
// ═══════════════════════════════════════════════════════════

async function createBackup(
	sourceDir: string,
	backupDir: string,
	onProgress?: (message: string, percent: number) => void
): Promise<void> {
	if (!existsSync(sourceDir)) {
		throw new Error(`Source directory does not exist: ${sourceDir}`);
	}
	
	// Create backup directory
	mkdirSync(backupDir, { recursive: true });
	
	// Use cp -a for backup (preserves dotfiles, permissions)
	await execAsync(`cp -a "${sourceDir}/." "${backupDir}/"`);
}

// ═══════════════════════════════════════════════════════════
// Flat Skill Detection
// ═══════════════════════════════════════════════════════════

function detectFlatSkills(skillsDir: string): string[] {
	if (!existsSync(skillsDir)) return [];
	
	const flatSkills: string[] = [];
	const entries = readdirSync(skillsDir, { withFileTypes: true });
	
	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
		
		const skillPath = join(skillsDir, entry.name);
		const skillFiles = readdirSync(skillPath);
		
		// Check if SKILL.md exists directly in skill dir (not in subdirectory)
		if (skillFiles.includes("SKILL.md")) {
			// Check if it's already hierarchical (has Tools/ or Workflows/)
			const hasTools = skillFiles.includes("Tools");
			const hasWorkflows = skillFiles.includes("Workflows");
			
			if (!hasTools && !hasWorkflows) {
				flatSkills.push(entry.name);
			}
		}
	}
	
	return flatSkills;
}

// ═══════════════════════════════════════════════════════════
// Skill Migration
// ═══════════════════════════════════════════════════════════

function migrateFlatSkill(
	skillsDir: string,
	skillName: string,
	dryRun: boolean
): { migrated: boolean; error?: string } {
	try {
		const skillPath = join(skillsDir, skillName);
		const skillFiles = readdirSync(skillPath);
		
		// Create hierarchical directory (SkillName/SkillName/)
		const hierarchicalDir = join(skillPath, skillName);
		
		if (!dryRun) {
			mkdirSync(hierarchicalDir, { recursive: true });
			
			// Move SKILL.md into subdirectory
			renameSync(
				join(skillPath, "SKILL.md"),
				join(hierarchicalDir, "SKILL.md")
			);
			
			// Move any other .md files
			for (const file of skillFiles) {
				if (file.endsWith(".md") && file !== "SKILL.md") {
					renameSync(
						join(skillPath, file),
						join(hierarchicalDir, file)
					);
				}
			}
		}
		
		return { migrated: true };
	} catch (error) {
		return {
			migrated: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

// ═══════════════════════════════════════════════════════════
// MINIMAL_BOOTSTRAP Update
// ═══════════════════════════════════════════════════════════

function updateMinimalBootstrap(paiDir: string, dryRun: boolean): void {
	const bootstrapPath = join(paiDir, "MINIMAL_BOOTSTRAP.md");
	if (!existsSync(bootstrapPath)) return;
	
	let content = readFileSync(bootstrapPath, "utf-8");
	
	// Update old paths (USMetrics/USMetrics/ → USMetrics/)
	content = content.replace(/\/([^/]+)\/\1\//g, "/$1/");
	
	// Update Telos paths
	content = content.replace(/\/Telos\/Telos\//g, "/Telos/");
	
	if (!dryRun) {
		writeFileSync(bootstrapPath, content, "utf-8");
	}
}

// ═══════════════════════════════════════════════════════════
// Main Migration Function
// ═══════════════════════════════════════════════════════════

export async function migrateV2ToV3(
	options: MigrationOptions = {}
): Promise<MigrationResult> {
	const {
		dryRun = false,
		backupDir: customBackupDir,
		onProgress,
	} = options;
	
	const result: MigrationResult = {
		migrated: [],
		skipped: [],
		errors: [],
		success: false,
	};
	
	try {
		// 1. Create Backup (10%)
		await onProgress?.("Creating backup...", 10);
		
		const backupDir = customBackupDir || join(
			homedir(),
			`${BACKUP_PREFIX}${generateTimestamp()}`
		);
		
		if (!dryRun) {
			// Check if backup already exists
			if (existsSync(backupDir)) {
				throw new Error(
					`Backup already exists at ${backupDir}. ` +
					`Please remove it or specify a different backup location.`
				);
			}
			
			await createBackup(PAI_DIR, backupDir, onProgress);
			result.backupPath = backupDir;
		}
		
		// 2. Detect flat skills (20%)
		await onProgress?.("Detecting flat skill structure...", 20);
		
		const skillsDir = join(PAI_DIR, "skills");
		const flatSkills = detectFlatSkills(skillsDir);
		
		if (flatSkills.length === 0) {
			result.skipped.push("No flat skills found — already hierarchical");
			await onProgress?.("No migration needed — already v3 structure", 100);
			result.success = true;
			return result;
		}
		
		// 3. Migrate each skill (20-70%)
		let progress = 20;
		const progressPerSkill = 50 / flatSkills.length;
		
		for (const skill of flatSkills) {
			await onProgress?.(`Migrating ${skill}...`, progress);
			
			const { migrated, error } = migrateFlatSkill(
				skillsDir,
				skill,
				dryRun
			);
			
			if (migrated) {
				result.migrated.push(skill);
			} else if (error) {
				result.errors.push(`Failed to migrate ${skill}: ${error}`);
			}
			
			progress += progressPerSkill;
		}
		
		// 4. Update MINIMAL_BOOTSTRAP.md (80%)
		await onProgress?.("Updating bootstrap file...", 80);
		
		if (!dryRun) {
			updateMinimalBootstrap(PAI_DIR, dryRun);
		}
		
		// 5. Validate (90%)
		await onProgress?.("Validating migration...", 90);
		
		const remainingFlat = detectFlatSkills(skillsDir);
		if (remainingFlat.length > 0) {
			result.errors.push(
				`Some skills still flat after migration: ${remainingFlat.join(", ")}`
			);
		}
		
		// Done (100%)
		await onProgress?.("Migration complete!", 100);
		result.success = result.errors.length === 0;
		
		if (dryRun) {
			log("[DRY-RUN] Would migrate:", "info");
			for (const skill of result.migrated) {
				log(`  - ${skill}`, "info");
			}
		}
		
		return result;
		
	} catch (error) {
		result.errors.push(error instanceof Error ? error.message : String(error));
		result.success = false;
		return result;
	}
}

// ═══════════════════════════════════════════════════════════
// Detect if migration is needed
// ═══════════════════════════════════════════════════════════

export function isMigrationNeeded(): {
	needed: boolean;
	reason?: string;
	flatSkills?: string[];
} {
	if (!existsSync(PAI_DIR)) {
		return { needed: false, reason: "No existing installation" };
	}
	
	const skillsDir = join(PAI_DIR, "skills");
	if (!existsSync(skillsDir)) {
		return { needed: false, reason: "No skills directory" };
	}
	
	const flatSkills = detectFlatSkills(skillsDir);
	
	if (flatSkills.length === 0) {
		return { needed: false, reason: "Already hierarchical" };
	}
	
	return {
		needed: true,
		reason: `Found ${flatSkills.length} flat skills`,
		flatSkills,
	};
}
