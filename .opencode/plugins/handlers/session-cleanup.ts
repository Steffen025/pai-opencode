/**
 * Session Cleanup Handler
 *
 * Ported from PAI v4.0.3 SessionCleanup.hook.ts
 * Triggered by: session.ended / session.idle (event bus)
 *
 * PURPOSE:
 * Finalizes a session by:
 * 1. Marking the current work directory as COMPLETED in PRD.md / META.yaml
 * 2. Clearing the current-work.json state file
 * 3. Cleaning up session-names.json entries (prevents ghost entries)
 *
 * COORDINATES WITH: learning-capture.ts (both run at session end)
 * MUST RUN AFTER: learning-capture.ts (learning capture uses state before clear)
 *
 * @module session-cleanup
 */

import * as fs from "fs";
import * as path from "path";
import { fileLog, fileLogError } from "../lib/file-logger";
import { getStateDir, getWorkDir } from "../lib/paths";

/**
 * Mark the active work directory as COMPLETED and clear session state.
 *
 * @param sessionId - OpenCode session ID
 */
export async function cleanupSession(sessionId?: string): Promise<void> {
	try {
		const stateDir = getStateDir();

		// Locate state file (session-scoped first, then legacy)
		let stateFile: string | null = null;
		if (sessionId) {
			const scoped = path.join(stateDir, `current-work-${sessionId}.json`);
			if (fs.existsSync(scoped)) stateFile = scoped;
		}
		if (!stateFile) {
			const legacy = path.join(stateDir, "current-work.json");
			if (fs.existsSync(legacy)) stateFile = legacy;
		}

		if (!stateFile) {
			fileLog("[SessionCleanup] No current work state to clean up", "debug");
			return;
		}

		// Read state
		const stateContent = fs.readFileSync(stateFile, "utf-8");
		const state = JSON.parse(stateContent);

		// Guard: don't process another session's state
		if (sessionId && state.session_id && state.session_id !== sessionId) {
			fileLog(
				"[SessionCleanup] State belongs to different session — skipping",
				"warn",
			);
			return;
		}

		const workDir = state.work_dir || state.session_dir;

		if (workDir) {
			const workPath = path.join(getWorkDir(), workDir);
			const completedAt = new Date().toISOString();
			let marked = false;

			// Primary: update PRD.md frontmatter
			const prdPath = path.join(workPath, "PRD.md");
			if (fs.existsSync(prdPath)) {
				let content = fs.readFileSync(prdPath, "utf-8");
				content = content.replace(/^status: ACTIVE$/m, "status: COMPLETED");
				content = content.replace(
					/^completed_at: null$/m,
					`completed_at: "${completedAt}"`,
				);
				fs.writeFileSync(prdPath, content, "utf-8");
				marked = true;
				fileLog(`[SessionCleanup] Marked PRD.md as COMPLETED: ${workDir}`, "info");
			}

			// Legacy fallback: META.yaml
			const metaPath = path.join(workPath, "META.yaml");
			if (fs.existsSync(metaPath)) {
				let content = fs.readFileSync(metaPath, "utf-8");
				content = content.replace(/^status: "ACTIVE"$/m, 'status: "COMPLETED"');
				content = content.replace(
					/^completed_at: null$/m,
					`completed_at: "${completedAt}"`,
				);
				fs.writeFileSync(metaPath, content, "utf-8");
				if (!marked) {
					marked = true;
					fileLog(
						`[SessionCleanup] Marked META.yaml as COMPLETED: ${workDir}`,
						"info",
					);
				}
			}

			if (!marked) {
				fileLog(
					`[SessionCleanup] No PRD.md or META.yaml found in ${workPath}`,
					"debug",
				);
			}
		}

		// Delete state file
		fs.unlinkSync(stateFile);
		fileLog("[SessionCleanup] Cleared session work state", "info");

		// Clean session-names.json entry (prevents ghost entries in dashboard)
		const sid = sessionId || state.session_id;
		if (sid) {
			const snPath = path.join(stateDir, "session-names.json");
			try {
				if (fs.existsSync(snPath)) {
					const names = JSON.parse(fs.readFileSync(snPath, "utf-8"));
					if (names[sid]) {
						delete names[sid];
						fs.writeFileSync(snPath, JSON.stringify(names, null, 2), "utf-8");
						fileLog(`[SessionCleanup] Removed session ${sid} from session-names.json`, "info");
					}
				}
			} catch (err) {
				fileLogError("[SessionCleanup] Failed to clean session-names.json", err);
			}
		}

		fileLog("[SessionCleanup] Session cleanup complete", "info");
	} catch (error) {
		fileLogError("[SessionCleanup] Cleanup failed (non-blocking)", error);
		// Don't rethrow — session end must not be disrupted
	}
}
