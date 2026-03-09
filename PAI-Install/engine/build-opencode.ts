#!/usr/bin/env bun
/**
 * PAI-OpenCode Installer Engine — Build OpenCode Binary
 * 
 * Builds custom OpenCode binary from Steffen025/opencode fork
 * with feature/model-tiers branch for 60x cost optimization.
 * 
 * Based on: PAIOpenCodeWizard.ts (port)
 * Reference: ~/.opencode/tools/opencode-wrapper (bash implementation)
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, symlinkSync, unlinkSync, chmodSync, copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const execAsync = promisify(exec);

// ═══════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════

const OPENCODE_FORK_URL = "https://github.com/Steffen025/opencode.git";
const MODEL_TIERS_BRANCH = "feature/model-tiers";
const BUILD_DIR = "/tmp/opencode-build-" + Date.now();
const PAI_BIN_DIR = join(homedir(), ".opencode", "tools");
const PAI_BIN_PATH = join(PAI_BIN_DIR, "opencode");
const BREW_BIN_PATH = "/usr/local/bin/opencode";

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface BuildOptions {
	onProgress: (message: string, percent: number) => void | Promise<void>;
	skipIfExists?: boolean;
	forceRebuild?: boolean;
}

export interface BuildResult {
	success: boolean;
	skipped?: boolean;
	version?: string;
	binaryPath?: string;
	error?: string;
}

// ═══════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════

function detectBinaryPath(buildDir: string): string | null {
	const arch = process.arch;
	const platform = process.platform;
	
	let archSuffix: string;
	switch (arch) {
		case "x64":
			archSuffix = "x64";
			break;
		case "arm64":
			archSuffix = "arm64";
			break;
		default:
			return null;
	}
	
	const binaryPath = join(
		buildDir,
		"packages/opencode/dist",
		`opencode-${platform}-${archSuffix}`,
		"bin/opencode"
	);
	
	return existsSync(binaryPath) ? binaryPath : null;
}

async function getBuildVersion(buildDir: string): Promise<string> {
	try {
		const { stdout } = await execAsync("git log --oneline -1", {
			cwd: buildDir,
		});
		return stdout.trim();
	} catch {
		return "unknown";
	}
}

async function getBinaryVersion(binaryPath: string): Promise<string> {
	try {
		const { stdout } = await execAsync(`"${binaryPath}" --version`);
		return stdout.trim();
	} catch {
		return "unknown";
	}
}

// ═══════════════════════════════════════════════════════════
// Main Build Function
// ═══════════════════════════════════════════════════════════

export async function buildOpenCodeBinary(
	options: BuildOptions
): Promise<BuildResult> {
	const { onProgress, skipIfExists = false, forceRebuild = false } = options;
	
	// Check if already exists
	if (existsSync(PAI_BIN_PATH) && skipIfExists && !forceRebuild) {
		const version = await getBinaryVersion(PAI_BIN_PATH);
		await onProgress("Custom OpenCode binary already exists", 100);
		return {
			success: true,
			skipped: true,
			version,
			binaryPath: PAI_BIN_PATH,
		};
	}
	
	try {
		// Step 1: Clone fork (10%)
		await onProgress("Cloning Steffen025/opencode fork...", 10);
		await execAsync(`git clone ${OPENCODE_FORK_URL} ${BUILD_DIR}`, {
			timeout: 120000,
		});
		
		// Step 2: Checkout model-tiers branch (20%)
		await onProgress("Checking out feature/model-tiers branch...", 20);
		await execAsync(`git checkout ${MODEL_TIERS_BRANCH}`, {
			cwd: BUILD_DIR,
			timeout: 30000,
		});
		
		// Step 3: Install dependencies (40%)
		await onProgress(
			"Installing dependencies (this takes 2-3 minutes)...",
			40
		);
		await execAsync("bun install", {
			cwd: BUILD_DIR,
			timeout: 300000, // 5 minute timeout
		});
		
		// Step 4: Build binary (60%)
		await onProgress("Building standalone binary...", 60);
		await execAsync(
			"bun run --filter=opencode build",
			{
				cwd: BUILD_DIR,
				timeout: 300000, // 5 minute timeout
			}
		);
		
		// Step 5: Detect built binary (70%)
		await onProgress("Locating built binary...", 70);
		const distBinary = detectBinaryPath(BUILD_DIR);
		
		if (!distBinary) {
			throw new Error(
				"Built binary not found in expected location. " +
				"Build may have failed silently."
			);
		}
		
		// Step 6: Install to PAI tools directory (90%)
		await onProgress("Installing to ~/.opencode/tools/...", 90);
		
		// Ensure directory exists
		mkdirSync(PAI_BIN_DIR, { recursive: true });
		
		// Remove old binary/symlink if exists
		if (existsSync(PAI_BIN_PATH)) {
			unlinkSync(PAI_BIN_PATH);
		}
		
		// Copy binary to permanent location (BUILD_DIR will be deleted)
		copyFileSync(distBinary, PAI_BIN_PATH);
		chmodSync(PAI_BIN_PATH, 0o755);
		
		// Get version BEFORE cleanup (needs BUILD_DIR)
		const version = await getBuildVersion(BUILD_DIR);
		
		// Done (100%)
		await onProgress("Build complete!", 100);
		
		return {
			success: true,
			version,
			binaryPath: PAI_BIN_PATH,
		};
		
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		return {
			success: false,
			error: errorMessage,
		};
	} finally {
		// Cleanup build directory
		try {
			await execAsync(`rm -rf ${BUILD_DIR}`);
		} catch {
			// Ignore cleanup errors
		}
	}
}

// ═══════════════════════════════════════════════════════════
// Status Check
// ═══════════════════════════════════════════════════════════

export async function getBuildStatus(): Promise<{
	exists: boolean;
	version?: string;
	path: string;
	brewPath: string;
}> {
	const exists = existsSync(PAI_BIN_PATH);
	const version = exists ? await getBinaryVersion(PAI_BIN_PATH) : undefined;
	
	return {
		exists,
		version,
		path: PAI_BIN_PATH,
		brewPath: BREW_BIN_PATH,
	};
}

// ═══════════════════════════════════════════════════════════
// Escape Hatch: Use Homebrew
// ═══════════════════════════════════════════════════════════

export async function useHomebrewVersion(): Promise<boolean> {
	return existsSync(BREW_BIN_PATH);
}
