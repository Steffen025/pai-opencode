/**
 * Relationship Memory Handler
 *
 * Ported from PAI v4.0.3 RelationshipMemory.hook.ts
 * Triggered by: session.ended / session.idle (event bus)
 *
 * PURPOSE:
 * Analyzes the session's assistant responses to extract relationship-relevant
 * learnings and appends them to a daily relationship log in MEMORY/RELATIONSHIP/.
 * This builds persistent context about the user's preferences, frustrations,
 * and session outcomes — making each session feel connected to the last.
 *
 * NOTE TYPES:
 * - W (World): Objective facts about the user's situation
 * - B (Biographical): What the AI did/accomplished this session
 * - O (Opinion): Inferred preference/belief with confidence score
 *
 * STORAGE: MEMORY/RELATIONSHIP/YYYY-MM/YYYY-MM-DD.md
 *
 * @module relationship-memory
 */

import * as fs from "fs";
import * as path from "path";
import { fileLog, fileLogError } from "../lib/file-logger";
import { getMemoryDir, ensureDir, getDateString, getYearMonth } from "../lib/paths";

interface RelationshipNote {
	type: "W" | "B" | "O";
	entity: string;
	content: string;
	confidence?: number;
}

// Patterns that signal relationship-relevant content
const PATTERNS = {
	preference: /(?:prefer|like|want|appreciate|enjoy|love|hate|dislike)\s+(?:when|that|to)/i,
	frustration: /(?:frustrat|annoy|bother|irritat)/i,
	positive: /(?:great|awesome|perfect|excellent|good job|well done|nice work|danke|super)/i,
	milestone: /(?:first time|finally|breakthrough|success|accomplish|geschafft|fertig)/i,
	summary: /(?:📋\s*SUMMARY|SUMMARY:|✅\s*RESULTS)/i,
};

/**
 * Analyze captured response texts for relationship-relevant content.
 */
function analyzeForRelationship(
	userMessages: string[],
	assistantMessages: string[],
): RelationshipNote[] {
	const notes: RelationshipNote[] = [];

	let sessionSummaries: string[] = [];
	let positiveCount = 0;
	let frustrationCount = 0;

	// Analyze user messages for preferences and emotions
	for (const text of userMessages) {
		if (PATTERNS.positive.test(text)) positiveCount++;
		if (PATTERNS.frustration.test(text)) frustrationCount++;
	}

	// Extract summaries from assistant messages
	for (const text of assistantMessages) {
		const summaryMatch = text.match(/(?:📋\s*SUMMARY:|SUMMARY:)\s*([^\n]+)/i);
		if (summaryMatch) {
			sessionSummaries.push(summaryMatch[1].trim().slice(0, 150));
		}
		if (PATTERNS.milestone.test(text)) {
			const snippet = text.match(
				/[^.]*(?:first time|finally|breakthrough|success|geschafft|fertig)[^.]*/i,
			)?.[0];
			if (snippet) sessionSummaries.push(snippet.trim().slice(0, 150));
		}
	}

	// B notes — what the AI accomplished
	const uniqueSummaries = [...new Set(sessionSummaries)].slice(0, 3);
	for (const summary of uniqueSummaries) {
		notes.push({ type: "B", entity: "@Jeremy", content: summary });
	}

	// O notes — inferred user preferences
	if (positiveCount >= 2) {
		notes.push({
			type: "O",
			entity: "@Steffen",
			content: "Responded positively to this session's approach",
			confidence: 0.7,
		});
	}

	if (frustrationCount >= 2) {
		notes.push({
			type: "O",
			entity: "@Steffen",
			content: "Experienced friction during this session (tooling or complexity)",
			confidence: 0.75,
		});
	}

	return notes;
}

/**
 * Format notes as markdown for the daily log.
 */
function formatNotes(notes: RelationshipNote[]): string {
	if (notes.length === 0) return "";

	const time = new Date().toLocaleTimeString("de-DE", {
		hour: "2-digit",
		minute: "2-digit",
	});
	const lines: string[] = [`\n## ${time}\n`];

	for (const note of notes) {
		const conf = note.confidence ? `(c=${note.confidence.toFixed(2)})` : "";
		lines.push(`- ${note.type}${conf} ${note.entity}: ${note.content}`);
	}

	return lines.join("\n") + "\n";
}

/**
 * Write relationship notes for this session to the daily log.
 *
 * @param userMessages - User messages from this session
 * @param assistantMessages - Assistant messages from this session
 */
export async function captureRelationshipMemory(
	userMessages: string[],
	assistantMessages: string[],
): Promise<void> {
	try {
		if (userMessages.length === 0 && assistantMessages.length === 0) return;

		const notes = analyzeForRelationship(userMessages, assistantMessages);
		if (notes.length === 0) {
			fileLog("[RelationshipMemory] No relationship notes to capture", "debug");
			return;
		}

		// Ensure MEMORY/RELATIONSHIP/YYYY-MM/ exists
		const yearMonth = getYearMonth();
		const relDir = path.join(getMemoryDir(), "RELATIONSHIP", yearMonth);
		await ensureDir(relDir);

		const dateStr = getDateString();
		const filepath = path.join(relDir, `${dateStr}.md`);

		// Initialize daily file if needed
		if (!fs.existsSync(filepath)) {
			const header = `# Relationship Notes: ${dateStr}\n\n*Auto-captured from sessions.*\n\n---\n`;
			await fs.promises.writeFile(filepath, header, "utf-8");
		}

		// Append notes
		const formatted = formatNotes(notes);
		await fs.promises.appendFile(filepath, formatted, "utf-8");

		fileLog(
			`[RelationshipMemory] Captured ${notes.length} notes → ${filepath}`,
			"info",
		);
	} catch (error) {
		fileLogError("[RelationshipMemory] Failed to capture (non-blocking)", error);
	}
}
