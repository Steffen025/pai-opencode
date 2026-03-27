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

import { exec, execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, symlinkSync, unlinkSync, chmodSync, copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// ═══════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════

const OPENCODE_FORK_URL = "https://github.com/Steffen025/opencode.git";
const MODEL_TIERS_BRANCH = "feature/model-tiers";
const BUILD_DIR = "/tmp/opencode-build-" + Date.now();
const LOCAL_BIN_DIR = join(homedir(), ".local", "bin");
const LOCAL_BIN_PATH = join(LOCAL_BIN_DIR, "opencode");
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
		const { stdout } = await execFileAsync("git", ["log", "--oneline", "-1"], {
			cwd: buildDir,
		});
		return stdout.trim();
	} catch {
		return "unknown";
	}
}

async function getBinaryVersion(binaryPath: string): Promise<string> {
	try {
		const { stdout } = await execFileAsync(binaryPath, ["--version"]);
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
	
  // Check if already exists at either location
  if (skipIfExists && !forceRebuild) {
    const existsAtLocal = existsSync(LOCAL_BIN_PATH);
    const existsAtLegacy = existsSync(PAI_BIN_PATH);

    if (existsAtLocal || existsAtLegacy) {
      const existingPath = existsAtLocal ? LOCAL_BIN_PATH : PAI_BIN_PATH;
      const version = await getBinaryVersion(existingPath);
      await onProgress("Custom OpenCode binary already exists", 100);
      return {
        success: true,
        skipped: true,
        version,
        binaryPath: existingPath,
      };
    }
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
		
    // Step 6: Install to ~/.local/bin and compatibility path (90%)
    await onProgress("Installing to ~/.local/bin/opencode...", 90);

    mkdirSync(LOCAL_BIN_DIR, { recursive: true });
    copyFileSync(distBinary, LOCAL_BIN_PATH);
    chmodSync(LOCAL_BIN_PATH, 0o755);

    // Compatibility copy for tools that still reference ~/.opencode/tools/opencode
    mkdirSync(PAI_BIN_DIR, { recursive: true });
    if (existsSync(PAI_BIN_PATH)) {
      unlinkSync(PAI_BIN_PATH);
    }
    copyFileSync(LOCAL_BIN_PATH, PAI_BIN_PATH);
    chmodSync(PAI_BIN_PATH, 0o755);
		
		// Get version BEFORE cleanup (needs BUILD_DIR)
		const version = await getBuildVersion(BUILD_DIR);
		
		// Done (100%)
		await onProgress("Build complete!", 100);
		
		return {
			success: true,
			version,
      binaryPath: LOCAL_BIN_PATH,
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
  const exists = existsSync(LOCAL_BIN_PATH) || existsSync(PAI_BIN_PATH);
  const resolvedPath = existsSync(LOCAL_BIN_PATH) ? LOCAL_BIN_PATH : PAI_BIN_PATH;
  const version = exists ? await getBinaryVersion(resolvedPath) : undefined;

  return {
		exists,
		version,
		path: resolvedPath,
		brewPath: BREW_BIN_PATH,
	};
}

// ═══════════════════════════════════════════════════════════
// Escape Hatch: Check Homebrew Availability
// ═══════════════════════════════════════════════════════════

export async function isHomebrewAvailable(): Promise<boolean> {
	return existsSync(BREW_BIN_PATH);
}