/**
 * Last Response Cache Handler
 *
 * Ported from PAI v4.0.3 LastResponseCache.hook.ts
 * Triggered by: message.updated (assistant role, event bus)
 *
 * PURPOSE:
 * Caches the last assistant response text to disk so RatingCapture
 * (which fires on user message) can access the previous response
 * for context-aware rating analysis.
 *
 * This bridges the gap where the rating arrives AFTER the response —
 * RatingCapture needs to know WHAT it's rating.
 *
 * STORAGE: MEMORY/STATE/last-response.txt (max 2000 chars, trimmed)
 *
 * @module last-response-cache
 */

import * as fs from "fs";
import * as path from "path";
import { fileLog, fileLogError } from "../lib/file-logger";
import { getStateDir, ensureDir } from "../lib/paths";

const MAX_CACHE_LENGTH = 2000;
const CACHE_FILENAME = "last-response.txt";

/**
 * Cache the assistant response for later use by RatingCapture.
 *
 * @param responseText - Full assistant response text
 */
export async function cacheLastResponse(responseText: string): Promise<void> {
	if (!responseText || responseText.trim().length === 0) return;

	try {
		const stateDir = getStateDir();
		await ensureDir(stateDir);

		const cachePath = path.join(stateDir, CACHE_FILENAME);
		const truncated = responseText.slice(0, MAX_CACHE_LENGTH);

		await fs.promises.writeFile(cachePath, truncated, "utf-8");
		fileLog(
			`[LastResponseCache] Cached ${truncated.length} chars`,
			"debug",
		);
	} catch (error) {
		fileLogError("[LastResponseCache] Failed to write cache", error);
		// Non-blocking — rating capture will just work without context
	}
}

/**
 * Read the cached last response (for use by RatingCapture).
 *
 * @returns Cached response text, or null if not available
 */
export async function readLastResponse(): Promise<string | null> {
	try {
		const cachePath = path.join(getStateDir(), CACHE_FILENAME);
		if (!fs.existsSync(cachePath)) return null;
		return await fs.promises.readFile(cachePath, "utf-8");
	} catch {
		return null;
	}
}
