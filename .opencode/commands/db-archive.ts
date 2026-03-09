#!/usr/bin/env bun
/**
 * OpenCode Custom Command: /db-archive
 *
 * Provides in-session access to database archiving functionality.
 * Usage in OpenCode chat: /db-archive [days] [--dry-run] [--vacuum]
 *
 * Shows current DB stats, last archive time, and runs archive operations.
 */

import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync, statSync } from "node:fs";
import {
	getDbSizeMB,
	getSessionsOlderThan,
	formatBytes,
	checkDbHealth,
} from "../plugins/lib/db-utils";

const PAI_DIR = join(homedir(), ".opencode");
const ARCHIVE_DIR = join(PAI_DIR, "archives");
const LAST_ARCHIVE_FILE = join(ARCHIVE_DIR, ".last-archive");

interface CommandArgs {
	days: number;
	dryRun: boolean;
	vacuum: boolean;
	help: boolean;
}

function parseCommandArgs(input: string): CommandArgs {
	const parts = input.trim().split(/\s+/);
	const daysArg = parts.find((p) => /^\d+$/.test(p));

	return {
		days: daysArg ? parseInt(daysArg, 10) : 90,
		dryRun: parts.includes("--dry-run"),
		vacuum: parts.includes("--vacuum"),
		help: parts.includes("--help") || parts.includes("-h"),
	};
}

async function getLastArchiveTime(): Promise<string | null> {
	if (!existsSync(LAST_ARCHIVE_FILE)) return null;
	try {
		const content = await Bun.file(LAST_ARCHIVE_FILE).text();
		const date = new Date(content.trim());
		return date.toLocaleDateString();
	} catch {
		return null;
	}
}

async function getArchiveStats(): Promise<{
	count: number;
	totalSize: string;
}> {
	if (!existsSync(ARCHIVE_DIR)) {
		return { count: 0, totalSize: "0 B" };
	}

	const files = await Array.fromAsync(
		new Bun.Glob("*.db").scan({ cwd: ARCHIVE_DIR }),
	);
	let totalBytes = 0;

	for (const file of files) {
		const path = join(ARCHIVE_DIR, file);
		try {
			const stats = statSync(path);
			totalBytes += stats.size;
		} catch {
			// ignore
		}
	}

	return {
		count: files.length,
		totalSize: formatBytes(totalBytes),
	};
}

export default async function dbArchiveCommand(input: string): Promise<string> {
	const args = parseCommandArgs(input);

	if (args.help) {
		return `
## /db-archive — Database Maintenance Command

**Usage:**
\`\`\`
/db-archive              Show DB stats
/db-archive 180          Archive sessions > 180 days
/db-archive --dry-run   Preview only
/db-archive --vacuum    VACUUM after archiving
\`\`\`

**Thresholds:**
- Warn: DB > 500MB
- Warn: Sessions > 90 days old

**Archives location:** \`~/.opencode/archives/\`
`;
	}

	// Get current stats
	const { sizeMB, oldSessions, warnings } = await checkDbHealth();
	const lastArchive = await getLastArchiveTime();
	const archiveStats = await getArchiveStats();

	let output = "## 📊 Database Health\n\n";

	// Status table
	output += "| Metric | Value |\n";
	output += "|--------|-------|\n";
	output += `| DB Size | ${sizeMB.toFixed(2)} MB |\n`;
	output += `| Sessions > 90 days | ${oldSessions} |\n`;
	output += `| Last archive | ${lastArchive || "Never"} |\n`;
	output += `| Archive files | ${archiveStats.count} (${archiveStats.totalSize}) |\n`;
	output += "\n";

	// Warnings
	if (warnings.length > 0) {
		output += "### ⚠️ Warnings\n\n";
		for (const warning of warnings) {
			output += `- ${warning}\n`;
		}
		output += "\n";
	}

	// Show next steps
	if (oldSessions > 0) {
		output += `**💡 Tip:** Run \`bun Tools/db-archive.ts ${args.days}\` to archive ${oldSessions} old sessions.\n\n`;
	}

	if (args.dryRun || args.vacuum) {
		output +=
			"⚠️ **Note:** Use the standalone tool for --dry-run and --vacuum operations:\n";
		output += "\`\`\`bash\n";
		if (args.dryRun) {
			output += `bun Tools/db-archive.ts ${args.days} --dry-run\n`;
		}
		if (args.vacuum) {
			output += "bun Tools/db-archive.ts --vacuum\n";
		}
		output += "\`\`\`\n";
	}

	return output;
}

// If run directly (for testing)
if (import.meta.main) {
	const input = process.argv.slice(2).join(" ");
	dbArchiveCommand(input).then((output) => {
		// Use stdout directly for standalone mode (outside TUI)
		process.stdout.write(output + "\n");
	});
}
