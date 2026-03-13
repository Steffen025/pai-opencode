/**
 * Database Utilities for PAI-OpenCode
 *
 * DB health checks, size monitoring, and session archiving.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { fileLog } from "./file-logger";

const PAI_DIR = join(homedir(), ".opencode");
const DB_PATH = join(PAI_DIR, "conversations.db");

export interface Session {
	id: string;
	created_at: string;
	updated_at: string;
	title?: string;
}

/**
 * Get database size in megabytes
 */
export async function getDbSizeMB(): Promise<number> {
	try {
		const file = Bun.file(DB_PATH);
		const size = await file.size;
		return Math.round((size / 1024 / 1024) * 100) / 100; // MB with 2 decimals
	} catch {
		return 0;
	}
}

/**
 * Get sessions older than specified days
 */
export async function getSessionsOlderThan(days: number): Promise<Session[]> {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - days);

	// Query via bun:sqlite
	const db = getDb();
	if (!db) return [];

	try {
		const rows = db
			.query(
				`SELECT id, created_at, updated_at, title\n    FROM conversations\n    WHERE updated_at < ?1\n    ORDER BY updated_at ASC`
			)
			.all(cutoffDate.toISOString());

		const sessions: Session[] = rows.map((row: Record<string, unknown>) => ({
			id: row.id as string,
			created_at: row.created_at as string,
			updated_at: row.updated_at as string,
			title: row.title as string | undefined,
		}));

		return sessions;
	} finally {
		db.close();
	}
}

/**
 * Archive sessions to separate database file
 */
export async function archiveSessions(sessions: Session[], archivePath: string): Promise<number> {
	if (sessions.length === 0) return 0;

	// Open writable DB connection for read + delete
	// biome-ignore lint/suspicious/noExplicitAny: bun:sqlite Database type varies by environment
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: bun:sqlite Database type varies by environment
	let archiveDb: any;
	try {
		const { Database } = await import("bun:sqlite");
		db = new Database(DB_PATH, { readonly: false });
		archiveDb = new Database(archivePath);
	} catch {
		return 0;
	}

	// Create schema
	archiveDb.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      title TEXT,
      messages TEXT
    )
  `);

	let archived = 0;

	try {
		for (const session of sessions) {
			try {
				// Get full conversation data
				const messages = db
					.query("SELECT content FROM messages WHERE conversation_id = ?1")
					.all(session.id);

				const messageData = JSON.stringify(messages);

				// Only overwrite archive row when we have messages to preserve.
				// If messages is empty (e.g. on a retry after partial failure), use
				// INSERT OR IGNORE so an existing full archive row is never clobbered.
				if (messages.length > 0) {
					archiveDb.run(
						`INSERT OR REPLACE INTO conversations (id, created_at, updated_at, title, messages)
           VALUES (?, ?, ?, ?, ?)`,
						[session.id, session.created_at, session.updated_at, session.title || null, messageData]
					);
				} else {
					archiveDb.run(
						`INSERT OR IGNORE INTO conversations (id, created_at, updated_at, title, messages)
           VALUES (?, ?, ?, ?, ?)`,
						[session.id, session.created_at, session.updated_at, session.title || null, messageData]
					);
				}

				// Delete from source DB only after successful archive
				db.run("DELETE FROM messages WHERE conversation_id = ?", [session.id]);
				db.run("DELETE FROM conversations WHERE id = ?", [session.id]);

				archived++;
			} catch (sessionError) {
				const msg = sessionError instanceof Error ? sessionError.message : String(sessionError);
				fileLog(`[db-utils] Failed to archive session ${session.id}: ${msg}`, "error");
				// Continue with remaining sessions — don't abort the whole batch
			}
		}
	} finally {
		// Always close both DB handles
		db.close();
		archiveDb.close();
	}

	return archived;
}

/**
 * Vacuum database to reclaim space
 * WARNING: Requires OpenCode to be stopped!
 */
export async function vacuumDb(): Promise<void> {
	// Open writable connection for VACUUM (cannot use readonly getDb())
	// biome-ignore lint/suspicious/noExplicitAny: bun:sqlite Database type varies by environment
	let db: any;
	try {
		const { Database } = require("bun:sqlite");
		db = new Database(DB_PATH, { readonly: false });
	} catch {
		throw new Error("Could not open database for vacuum. Is OpenCode running?");
	}

	try {
		db.run("VACUUM");
		fileLog("✓ Database vacuumed successfully", "info");
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		throw new Error(`Vacuum failed: ${msg}. Is OpenCode running?`);
	} finally {
		db.close();
	}
}

/**
 * Get database connection
 */
function getDb() {
	try {
		const { Database } = require("bun:sqlite");
		return new Database(DB_PATH, { readonly: true });
	} catch {
		return null;
	}
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

/**
 * Check DB health and return warnings
 */
export async function checkDbHealth(): Promise<{
	sizeMB: number;
	oldSessions: number;
	warnings: string[];
}> {
	const warnings: string[] = [];

	// Check size
	const sizeMB = await getDbSizeMB();
	if (sizeMB > 500) {
		warnings.push(
			`Database size is ${sizeMB}MB (>500MB threshold). Consider archiving old sessions.`
		);
	}

	// Check old sessions
	const oldSessions = (await getSessionsOlderThan(90)).length;
	if (oldSessions > 0) {
		warnings.push(`${oldSessions} sessions are older than 90 days. Consider archiving.`);
	}

	return { sizeMB, oldSessions, warnings };
}
