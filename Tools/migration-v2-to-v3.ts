#!/usr/bin/env bun
/**
 * PAI-OpenCode v2 → v3 Migration Tool
 *
 * Automatically migrates existing v2.x installations to v3.0 structure.
 *
 * Usage:
 *   bun tools/migration-v2-to-v3.ts              # Run migration
 *   bun tools/migration-v2-to-v3.ts --dry-run  # Preview only
 *   bun tools/migration-v2-to-v3.ts --force     # Skip version check
 *   bun tools/migration-v2-to-v3.ts --backup-dir /custom/path
 */

import { existsSync, statSync, copyFileSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename } from "node:path";
import { spawn } from "bun";

// ═══════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════

const PAI_DIR = join(homedir(), ".opencode");
const BACKUP_PREFIX = ".opencode-backup-";
// Use timestamp with milliseconds for uniqueness (YYYYMMDD-HHMMSS-mmm)
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "-").slice(0, -5);

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface MigrationReport {
  version: string;
  backupPath: string;
  migrated: string[];
  skipped: string[];
  manualReview: string[];
  errors: string[];
}

interface Options {
  dryRun: boolean;
  force: boolean;
  backupDir: string;
}

// ═══════════════════════════════════════════════════════════
// CLI Argument Parsing
// ═══════════════════════════════════════════════════════════

function parseArgs(): Options {
	const args = process.argv.slice(2);
	let backupDir = PAI_DIR;

	// Handle both --backup-dir=/path and --backup-dir /path
	const backupIndex = args.findIndex((a) => a === "--backup-dir" || a.startsWith("--backup-dir="));
	if (backupIndex !== -1) {
		if (args[backupIndex].includes("=")) {
			backupDir = args[backupIndex].split("=")[1];
		} else if (args[backupIndex + 1]) {
			backupDir = args[backupIndex + 1];
		}
	}

	return {
		dryRun: args.includes("--dry-run"),
		force: args.includes("--force"),
		backupDir,
	};
}

function log(message: string, level: "info" | "success" | "warn" | "error" = "info") {
  const icons = { info: "ℹ", success: "✓", warn: "⚠", error: "✗" };
  const colors = { info: "\x1b[36m", success: "\x1b[32m", warn: "\x1b[33m", error: "\x1b[31m" };
  const reset = "\x1b[0m";
  console.log(`${colors[level]}${icons[level]}${reset} ${message}`);
}

// ═══════════════════════════════════════════════════════════
// Version Detection
// ═══════════════════════════════════════════════════════════

async function detectVersion(): Promise<string> {
	const opencodeJson = join(PAI_DIR, "opencode.json");
	const settingsJson = join(PAI_DIR, "settings.json");

	// Check settings.json for v3 dual-config pattern
	if (existsSync(settingsJson)) {
		try {
			const content = await Bun.file(settingsJson).text();
			const parsed = JSON.parse(content);
			// v3 has settings.json with pai section OR dual-config structure
			if (parsed.pai?.version?.startsWith("3")) {
				return parsed.pai.version;
			}
			// Check for v3 indicators: context, agent, or daidentity sections
			if (parsed.context || parsed.agent || parsed.daidentity) {
				return "v3-dual-config";
			}
		} catch {
			// Continue to other checks
		}
	}

	// Fallback to opencode.json (legacy v2 marker)
	if (existsSync(opencodeJson)) {
		try {
			const content = await Bun.file(opencodeJson).text();
			const parsed = JSON.parse(content);
			// Only use pai.version if it looks like a real version
			if (parsed.pai?.version && parsed.pai.version !== "unknown") {
				return parsed.pai.version;
			}
		} catch {
			return "unknown";
		}
	}

	return "unknown";
}

// ═══════════════════════════════════════════════════════════
// Backup
// ═══════════════════════════════════════════════════════════

async function createBackup(backupPath: string, dryRun: boolean): Promise<void> {
	// Validate backup path is not inside source directory
	const relativePath = require("node:path").relative(PAI_DIR, backupPath);
	if (!relativePath.startsWith("..") && !require("node:path").isAbsolute(relativePath)) {
		throw new Error(`Backup path cannot be inside source directory: ${backupPath}`);
	}

	if (dryRun) {
		log(`[DRY-RUN] Would backup ${PAI_DIR} → ${backupPath}`, "info");
		return;
	}

	if (!existsSync(PAI_DIR)) {
		throw new Error(`PAI directory not found: ${PAI_DIR}`);
	}

	log(`Creating backup at ${backupPath}...`, "info");

	// Ensure backup directory parent exists
	const backupParent = require("node:path").dirname(backupPath);
	if (!existsSync(backupParent)) {
		mkdirSync(backupParent, { recursive: true });
	}

	// Create backup directory
	mkdirSync(backupPath, { recursive: true });

	// Copy all files recursively (using cp -R for simplicity)
	const proc = spawn({
		cmd: ["cp", "-R", join(PAI_DIR, "."), backupPath],
		stdout: "pipe",
		stderr: "pipe",
	});

	const exitCode = await proc.exited;
	if (exitCode !== 0) {
		throw new Error(`Backup failed with exit code ${exitCode}`);
	}

	log(`Backup created: ${backupPath}`, "success");
}

// ═══════════════════════════════════════════════════════════
// Migration Steps
// ═══════════════════════════════════════════════════════════

async function migrateSkills(report: MigrationReport, dryRun: boolean): Promise<void> {
	const skillsDir = join(PAI_DIR, "skills");
	if (!existsSync(skillsDir)) {
		report.skipped.push("skills directory not found");
		return;
	}

	log("Detecting skill structure...", "info");

	// Detect flat skills (v2) vs hierarchical (v3)
	const entries = require("node:fs").readdirSync(skillsDir, { withFileTypes: true });
	const flatSkills = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));

	// Check if any skill is flat (has SKILL.md directly in skill dir, not in subdir)
	let migratedCount = 0;
	let alreadyHierarchical = 0;

	for (const skill of flatSkills) {
		const skillPath = join(skillsDir, skill.name);
		const skillFiles = require("node:fs").readdirSync(skillPath);

		// If SKILL.md exists directly in skill dir, it's flat (v2)
		if (skillFiles.includes("SKILL.md")) {
			// Check if it already has hierarchical structure (Tools/ or Workflows/)
			if (skillFiles.includes("Tools") || skillFiles.includes("Workflows")) {
				alreadyHierarchical++;
				continue;
			}

		if (dryRun) {
			log(`[DRY-RUN] Would migrate flat skill: ${skill.name}`, "info");
		} else {
			// Check if already in hierarchical location (parent dir is Category name)
			const parentDir = basename(skillPath);
			const isAlreadyHierarchical = skillFiles.includes("Tools") || skillFiles.includes("Workflows");
			const isInCategoryDir = parentDir !== skill.name && parentDir !== "skills";
			
			if (isAlreadyHierarchical || isInCategoryDir) {
				// Already in correct location, just updateMinimalBootstrap
				log(`Skill already in hierarchical location: ${skill.name}`, "info");
			} else {
				// Migrate flat to hierarchical: create skill dir with same name
				const hierarchicalDir = join(skillPath, skill.name);
				mkdirSync(hierarchicalDir, { recursive: true });

				// Move SKILL.md into subdirectory
				renameSync(join(skillPath, "SKILL.md"), join(hierarchicalDir, "SKILL.md"));

				// Move any other .md files
				for (const file of skillFiles) {
					if (file.endsWith(".md") && file !== "SKILL.md") {
						renameSync(join(skillPath, file), join(hierarchicalDir, file));
					}
				}
			}
			log(`Migrated flat skill to hierarchical: ${skill.name}`, "success");
			}
			migratedCount++;
		} else {
			// Already hierarchical (SKILL.md is in subdir)
			alreadyHierarchical++;
		}
	}

	if (migratedCount > 0) {
		report.migrated.push(`${migratedCount} flat skills migrated to hierarchical structure`);
	}
	if (alreadyHierarchical > 0) {
		report.skipped.push(`${alreadyHierarchical} skills already in v3 hierarchical format`);
	}
	if (migratedCount === 0 && alreadyHierarchical === 0) {
		report.skipped.push("No skills to migrate");
	}
}

async function updateMinimalBootstrap(report: MigrationReport, dryRun: boolean): Promise<void> {
  const bootstrapPath = join(PAI_DIR, "MINIMAL_BOOTSTRAP.md");
  if (!existsSync(bootstrapPath)) {
    report.skipped.push("MINIMAL_BOOTSTRAP.md not found");
    return;
  }

  log("Checking MINIMAL_BOOTSTRAP.md...", "info");

  // Read and check for outdated paths
  const content = await Bun.file(bootstrapPath).text();
  const hasOldPaths = content.includes("/USMetrics/USMetrics/") || content.includes("/Telos/Telos/");

  if (hasOldPaths) {
    if (dryRun) {
      log("[DRY-RUN] Would update MINIMAL_BOOTSTRAP.md paths", "info");
    } else {
      // Update paths
      const updated = content
        .replace(/\/USMetrics\/USMetrics\//g, "/USMetrics/")
        .replace(/\/Telos\/Telos\//g, "/Telos/");
      writeFileSync(bootstrapPath, updated);
      report.migrated.push("MINIMAL_BOOTSTRAP.md paths updated");
    }
  } else {
    report.skipped.push("MINIMAL_BOOTSTRAP.md already up-to-date");
  }
}

// ═══════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const options = parseArgs();
  const backupPath = join(options.backupDir, `${BACKUP_PREFIX}${TIMESTAMP}`);

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   PAI-OpenCode v2 → v3 Migration Tool                  ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  if (options.dryRun) {
    log("DRY-RUN MODE: No changes will be made", "warn");
    console.log("");
  }

  // Detect version
  log("Detecting current version...", "info");
  const version = await detectVersion();
  log(`Detected version: ${version}`, version.startsWith("3") ? "success" : "info");

  if ((version.startsWith("3") || version === "v3-dual-config") && !options.force) {
    log("Already on v3.x. Use --force to run anyway.", "warn");
    process.exit(0);
  }

  // Initialize report
  const report: MigrationReport = {
    version,
    backupPath,
    migrated: [],
    skipped: [],
    manualReview: [],
    errors: [],
  };

  try {
    // Step 1: Backup
    await createBackup(backupPath, options.dryRun);

    // Step 2: Migrate skills
    await migrateSkills(report, options.dryRun);

    // Step 3: Update documentation
    await updateMinimalBootstrap(report, options.dryRun);

    // Print report
    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log("║   Migration Report                                       ║");
    console.log("╚══════════════════════════════════════════════════════════╝\n");

    log(`Version: ${report.version}`, "info");
    log(`Backup: ${report.backupPath}`, "info");
    console.log("");

    if (report.migrated.length > 0) {
      console.log("✓ Migrated:");
      report.migrated.forEach((item) => console.log(`  - ${item}`));
      console.log("");
    }

    if (report.skipped.length > 0) {
      console.log("○ Skipped:");
      report.skipped.forEach((item) => console.log(`  - ${item}`));
      console.log("");
    }

    if (report.manualReview.length > 0) {
      console.log("⚠ Manual Review Required:");
      report.manualReview.forEach((item) => console.log(`  - ${item}`));
      console.log("");
    }

    if (report.errors.length > 0) {
      console.log("✗ Errors:");
      report.errors.forEach((item) => console.log(`  - ${item}`));
      process.exit(1);
    }

    if (options.dryRun) {
      log("Dry-run complete. Run without --dry-run to apply changes.", "success");
    } else {
      log("Migration complete!", "success");
    }

    console.log("\nNext steps:");
    console.log("  1. Run: bun run skills:validate");
    console.log("  2. Test with: opencode");
    console.log("  3. If issues: restore from backup at", backupPath);

  } catch (error) {
    log(`Migration failed: ${error.message}`, "error");
    report.errors.push(error.message);
    process.exit(1);
  }
}

// Run if main
if (import.meta.main) {
  main();
}

export { detectVersion, createBackup, migrateSkills };
