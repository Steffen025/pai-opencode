#!/usr/bin/env bun
/**
 * PAI-OpenCode Installer — Update Steps (v3→v3.x)
 * 
 * 3-step update flow for within v3.x versions.
 */

import type { InstallState } from "./types";
import { updateV3, isUpdateNeeded } from "./update";
import { buildOpenCodeBinary } from "./build-opencode";
import type { UpdateResult } from "./update";

// ═══════════════════════════════════════════════════════════
// Step 1: Detected
// ═══════════════════════════════════════════════════════════

export interface UpdateDetectionResult {
	needed: boolean;
	currentVersion?: string;
	targetVersion: string;
	reason?: string;
}

export async function stepDetectUpdate(
	state: InstallState,
	onProgress: (percent: number, message: string) => void
): Promise<UpdateDetectionResult> {
	onProgress(0, "Checking for updates...");
	
	const detection = isUpdateNeeded();
	
	return {
		needed: detection.needed,
		currentVersion: detection.currentVersion,
		targetVersion: detection.targetVersion,
		reason: detection.reason,
	};
}

// ═══════════════════════════════════════════════════════════
// Step 2: Update
// ═══════════════════════════════════════════════════════════

export async function stepApplyUpdate(
	state: InstallState,
	onProgress: (percent: number, message: string) => void,
	skipBinaryUpdate: boolean = false
): Promise<UpdateResult & { binaryUpdated: boolean }> {
	onProgress(10, "Starting update...");
	
	// Apply core updates
	const updateResult = await updateV3({
		onProgress: async (message, percent) => {
			const mappedPercent = 10 + (percent * 0.7);
			onProgress(Math.round(mappedPercent), message);
		},
		skipBinaryUpdate: true, // We'll handle binary separately
	});
	
	// Update binary if needed
	let binaryUpdated = false;
	if (!skipBinaryUpdate && updateResult.success) {
		onProgress(80, "Checking OpenCode binary...");
		
		const buildResult = await buildOpenCodeBinary({
			onProgress: (message, percent) => {
				const mappedPercent = 80 + (percent * 0.15);
				onProgress(Math.round(mappedPercent), message);
			},
			skipIfExists: true,
		});
		
		binaryUpdated = !buildResult.skipped && buildResult.success;
	}
	
	return {
		...updateResult,
		binaryUpdated,
	};
}

// ═══════════════════════════════════════════════════════════
// Step 3: Done
// ═══════════════════════════════════════════════════════════

export async function stepUpdateDone(
	state: InstallState,
	result: UpdateResult & { binaryUpdated: boolean },
	onProgress: (percent: number, message: string) => void
): Promise<void> {
	onProgress(95, "Finalizing update...");
	
	// Ensure wrapper is up to date
	// Verify installation
	
	onProgress(100, "Update complete!");
}

// ═══════════════════════════════════════════════════════════
// Orchestrator: Update Flow
// ═══════════════════════════════════════════════════════════

export async function runUpdate(
  state: InstallState,
  emit: (event: any) => Promise<void>,
  requestInput: (id: string, prompt: string, type: "text" | "password" | "key", placeholder?: string) => Promise<string>,
  requestChoice: (id: string, prompt: string, choices: { label: string; value: string; description?: string }[]) => Promise<string>
): Promise<void> {
  // Step 1: Detect Update
  emit({ event: "step_start", step: "detect" });
  const updateInfo = await stepDetectUpdate(state, (percent, message) => {
    emit({ event: "progress", step: "detect", percent, detail: message });
  });
  emit({ event: "step_complete", step: "detect" });

  if (!updateInfo.needed) {
    emit({ event: "message", content: UPDATE_UI_TEXT.upToDate.message(updateInfo.currentVersion || "unknown") });
    return;
  }

  // Ask user if they want to update
  const updateChoices = [
    { label: UPDATE_UI_TEXT.updateAvailable.buttons.update, value: "update", description: `Update to ${updateInfo.targetVersion}` },
    { label: UPDATE_UI_TEXT.updateAvailable.buttons.skip, value: "skip", description: "Keep current version" },
  ];
  const choice = await requestChoice("update-choice", UPDATE_UI_TEXT.updateAvailable.message(updateInfo.currentVersion || "unknown", updateInfo.targetVersion), updateChoices);
  
  if (choice === "skip") {
    emit({ event: "message", content: "Update skipped. You can update later by running the installer again." });
    return;
  }

  // Step 2: Apply Update
  emit({ event: "step_start", step: "pull" });
  const updateResult = await stepApplyUpdate(state, (percent, message) => {
    emit({ event: "progress", step: "pull", percent, detail: message });
  });
  emit({ event: "step_complete", step: "pull" });

  // Step 3: Rebuild & Verify
  emit({ event: "step_start", step: "rebuild" });
  const { buildOpenCodeBinary } = await import("./build-opencode");
  await buildOpenCodeBinary({
    onProgress: async (message, percent) => {
      emit({ event: "progress", step: "rebuild", percent, detail: message });
    },
    skipIfExists: false,
  });
  await stepUpdateDone(state, updateResult, (percent, message) => {
    emit({ event: "progress", step: "rebuild", percent, detail: message });
  });
  emit({ event: "step_complete", step: "rebuild" });
}

// ═══════════════════════════════════════════════════════════
// Update UI Text
// ═══════════════════════════════════════════════════════════

export const UPDATE_UI_TEXT = {
	upToDate: {
		title: "✅ Up to Date",
		message: (version: string) => 
			`PAI-OpenCode ${version} is the latest version.`,
		button: "Launch PAI",
	},
	
	updateAvailable: {
		title: "🔄 Update Available",
		message: (current: string, target: string) => 
			`Update from ${current} to ${target}?`,
		details: [
			"• New features and improvements",
			"• Bug fixes",
			"• Settings preserved",
			"• ~2 minutes duration",
		],
		buttons: {
			skip: "Skip for now",
			update: "Update Now",
		},
	},
	
	updating: {
		title: "⏳ Updating...",
		message: "Please wait while we update PAI-OpenCode",
	},
	
	complete: {
		title: "✅ Update Complete",
		message: (version: string, binaryUpdated: boolean) => {
			let msg = `Successfully updated to ${version}`;
			if (binaryUpdated) {
				msg += " with new OpenCode binary";
			}
			return msg;
		},
		button: "Launch PAI",
	},
};
