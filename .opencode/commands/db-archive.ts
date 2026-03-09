#!/usr/bin/env bun
/**
 * OpenCode Custom Command: /db-archive
 *
 * Shows database health statistics and provides archiving recommendations.
 * Usage in OpenCode chat: /db-archive [days] [--dry-run] [--vacuum]
 *
 * This command displays current DB stats, last archive time, and suggests
 * actions. For actual archiving operations, use: bun Tools/db-archive.ts
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
## /db-archive — Database Health Report

**Purpose:** Shows database statistics and archiving recommendations.

**Usage:**
\`\`\`
/db-archive              Show DB health stats
/db-archive 180          Show sessions > 180 days old
/db-archive --dry-run    Preview what would be archived
/db-archive --vacuum     Show VACUUM instructions
\`\`\`

**Note:** This command only *displays* information. To actually archive sessions, run:
\`\`\`bash
bun Tools/db-archive.ts <days>
\`\`\`

**Thresholds:**
- Warn: DB > 500MB
- Warn: Sessions > 90 days old

**Archives location:** \`~/.opencode/archives/\`
`;
	}

	// Get stats using the requested days threshold
	const { sizeMB, warnings } = await checkDbHealth();
	const oldSessions = (await getSessionsOlderThan(args.days)).length;
	const lastArchive = await getLastArchiveTime();
	const archiveStats = await getArchiveStats();

	let output = "## 📊 Database Health\n\n";

	// Status table
	output += "| Metric | Value |\n";
	output += "|--------|-------|\n";
	output += `| DB Size | ${sizeMB.toFixed(2)} MB |\n`;
	output += `| Sessions > ${args.days} days | ${oldSessions} |\n`;
	output += `| Last archive | ${lastArchive || "Never"} |\n`;
	output += `| Archive files | ${archiveStats.count} (${archiveStats.totalSize}) |\n`;
	output += "\n";

	// Show warnings if any
	if (warnings.length > 0) {
		output += "### ⚠️ Warnings\n\n";
		for (const warning of warnings) {
			output += `- ${warning}\n`;
		}
		output += "\n";
	}

	// Show preview if dry-run requested
	if (args.dryRun && oldSessions > 0) {
		output += "### 🔍 Dry Run Preview\n\n";
		output += `${oldSessions} sessions would be archived (>${args.days} days).\n\n`;
	}

	// Show vacuum note if requested
	if (args.vacuum) {
		output += "⚠️ **Note:** VACUUM requires the standalone tool:\n";
		output += "\`\`\`bash\n";
		output += "bun Tools/db-archive.ts --vacuum\n";
		output += "\`\`\`\n";
		output += "*(Requires OpenCode to be stopped)*\n\n";
	}

	// Show next steps if not vacuum
	if (!args.vacuum && oldSessions > 0) {
		output += `**💡 Tip:** Run \`bun Tools/db-archive.ts ${args.days}\` to archive ${oldSessions} old sessions.\n\n`;
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
