#!/usr/bin/env bun
/**
 * Database Archive Tool for PAI-OpenCode
 *
 * Archive old sessions to reclaim disk space.
 *
 * Usage:
 *   bun Tools/db-archive.ts                    # Archive sessions > 90 days
 *   bun Tools/db-archive.ts 180                # Archive sessions > 180 days
 *   bun Tools/db-archive.ts --dry-run          # Preview only
 *   bun Tools/db-archive.ts --vacuum          # VACUUM after archiving
 *   bun Tools/db-archive.ts --restore archive.db  # Restore from archive
 *
 * WARNING: --vacuum requires OpenCode to be stopped!
 */

import { existsSync, statSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import {
	getDbSizeMB,
	getSessionsOlderThan,
	archiveSessions,
	vacuumDb,
	formatBytes,
	checkDbHealth,
} from "../.opencode/plugins/lib/db-utils";

const PAI_DIR = join(homedir(), ".opencode");
const DB_PATH = join(PAI_DIR, "conversations.db");
const ARCHIVE_DIR = join(PAI_DIR, "archives");

interface Options {
	days: number;
	dryRun: boolean;
	vacuum: boolean;
	restore: string | null;
}

function parseArgs(): Options {
	const args = process.argv.slice(2);
	const daysArg = args.find((a) => /^\d+$/.test(a));
	const restoreIdx = args.findIndex((a) => a === "--restore");

	return {
		days: daysArg ? parseInt(daysArg, 10) : 90,
		dryRun: args.includes("--dry-run"),
		vacuum: args.includes("--vacuum"),
		restore:
			args.find((a) => a.startsWith("--restore="))?.split("=")[1] ||
			(restoreIdx !== -1 ? args[restoreIdx + 1] || null : null),
	};
}

function log(
	message: string,
	level: "info" | "success" | "warn" | "error" = "info",
) {
	const icons = { info: "ℹ", success: "✓", warn: "⚠", error: "✗" };
	const colors = {
		info: "\x1b[36m",
		success: "\x1b[32m",
		warn: "\x1b[33m",
		error: "\x1b[31m",
	};
	const reset = "\x1b[0m";
	console.log(`${colors[level]}${icons[level]}${reset} ${message}`);
}

async function previewArchiving(days: number): Promise<void> {
	log("Previewing archive operation...", "info");

	const currentSize = await getDbSizeMB();
	const sessions = await getSessionsOlderThan(days);

	console.log("\n┌─ Database Status ──────────────────────────────────────┐");
	console.log(`│ Current size:      ${currentSize.toFixed(2)} MB`);
	console.log(`│ Sessions > ${days} days: ${sessions.length} sessions`);
	console.log("└─────────────────────────────────────────────────────────┘");

	if (sessions.length === 0) {
		log("No sessions to archive.", "info");
		return;
	}

	console.log("\nSessions that would be archived:");
	sessions.slice(0, 10).forEach((s) => {
		console.log(
			`  - ${s.id} (${s.updated_at.split("T")[0]}): ${s.title || "Untitled"}`,
		);
	});
	if (sessions.length > 10) {
		console.log(`  ... and ${sessions.length - 10} more`);
	}

	console.log("\nArchive location:");
	console.log(
		`  ${join(ARCHIVE_DIR, `sessions-${new Date().toISOString().split("T")[0]}.db`)}`,
	);
}

async function performArchiving(days: number): Promise<void> {
	const sessions = await getSessionsOlderThan(days);

	if (sessions.length === 0) {
		log("No sessions to archive.", "info");
		return;
	}

	// Ensure archive directory exists
	if (!existsSync(ARCHIVE_DIR)) {
		mkdirSync(ARCHIVE_DIR, { recursive: true });
		await Bun.write(join(ARCHIVE_DIR, ".gitkeep"), "");
	}

	const archivePath = join(
		ARCHIVE_DIR,
		`sessions-${new Date().toISOString().split("T")[0]}.db`,
	);

	log(`Archiving ${sessions.length} sessions to ${archivePath}...`, "info");

	const archived = await archiveSessions(sessions, archivePath);

	log(`Archived ${archived} sessions.`, "success");

	// Update last archive timestamp
	const timestampFile = join(ARCHIVE_DIR, ".last-archive");
	await Bun.write(timestampFile, new Date().toISOString());
}

async function performVacuum(): Promise<void> {
	log("IMPORTANT: VACUUM requires OpenCode to be stopped!", "warn");
	log("If OpenCode is running, this will fail.", "warn");

	// Check if DB is locked (simple heuristic)
	try {
		const testDb = new (await import("bun:sqlite")).Database(DB_PATH, {
			readonly: true,
		});
		testDb.close();
	} catch {
		log(
			"Database appears to be in use. Stop OpenCode before vacuuming.",
			"error",
		);
		process.exit(1);
	}

	const beforeSize = await getDbSizeMB();
	log(`Database size before VACUUM: ${beforeSize.toFixed(2)} MB`, "info");

	await vacuumDb();

	const afterSize = await getDbSizeMB();
	const saved = beforeSize - afterSize;
	log(`Database size after VACUUM: ${afterSize.toFixed(2)} MB`, "success");
	if (saved > 0) {
		log(`Reclaimed ${saved.toFixed(2)} MB`, "success");
	}
}

async function performRestore(archivePath: string): Promise<void> {
	if (!existsSync(archivePath)) {
		log(`Archive not found: ${archivePath}`, "error");
		process.exit(1);
	}

	log(`Restoring from ${archivePath}...`, "info");
	log("Restore functionality requires manual SQL operations.", "warn");
	log(
		"Archive schema: conversations(id, created_at, updated_at, title, messages)",
		"info",
	);
	console.log("\nTo restore manually:");
	console.log(`  1. sqlite3 ${archivePath}`);
	console.log("  2. .tables");
	console.log("  3. SELECT * FROM conversations;");
	console.log(`  4. Copy needed data to ${DB_PATH}`);
}

async function main(): Promise<void> {
	const options = parseArgs();

	console.log("\n╔══════════════════════════════════════════════════════════╗");
	console.log("║   PAI-OpenCode Database Archive Tool                     ║");
	console.log("╚══════════════════════════════════════════════════════════╝\n");

	if (options.restore) {
		await performRestore(options.restore);
		return;
	}

	// Check DB health first
	const { sizeMB, oldSessions, warnings } = await checkDbHealth();
	console.log("┌─ Current Database Status ───────────────────────────────┐");
	console.log(`│ Size:              ${sizeMB.toFixed(2)} MB`);
	console.log(`│ Old sessions (>90d): ${oldSessions}`);
	if (warnings.length > 0) {
		console.log("│ Warnings:");
		warnings.forEach((w) => console.log(`│   ⚠ ${w}`));
	}
	console.log("└─────────────────────────────────────────────────────────┘\n");

	if (options.dryRun) {
		await previewArchiving(options.days);
		console.log("\n✓ Dry run complete. Run without --dry-run to archive.");
		return;
	}

	// Confirm archiving
	await previewArchiving(options.days);
	console.log("");

	// Perform archiving
	await performArchiving(options.days);

	// Vacuum if requested
	if (options.vacuum) {
		console.log("");
		await performVacuum();
	}

	// Show final status
	const finalSize = await getDbSizeMB();
	console.log("\n┌─ Final Status ──────────────────────────────────────────┐");
	console.log(`│ Database size: ${finalSize.toFixed(2)} MB`);
	console.log(`│ Archives:       ${ARCHIVE_DIR}`);
	console.log("└─────────────────────────────────────────────────────────┘");

	log("Archive operation complete!", "success");
}

// Run if main
if (import.meta.main) {
	main().catch((err) => {
		log(`Error: ${err.message}`, "error");
		process.exit(1);
	});
}

export { previewArchiving, performArchiving, performVacuum };
