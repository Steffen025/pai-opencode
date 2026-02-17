/**
 * Check Version Handler (v3.0)
 *
 * Checks for PAI-OpenCode updates on startup by comparing
 * local version against latest GitHub release.
 *
 * Ported from PAI v3.0 CheckVersion.hook.ts
 *
 * @module check-version
 */

import * as fs from "fs";
import * as path from "path";
import { fileLog, fileLogError } from "../lib/file-logger";

interface VersionCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion?: string;
}

/**
 * Read current version from package.json
 */
function getCurrentVersion(): string {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      return pkg.version || "0.0.0";
    }
    return "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * Compare two semver strings
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

/**
 * Check for updates from GitHub releases
 */
export async function checkForUpdates(): Promise<VersionCheckResult> {
  const currentVersion = getCurrentVersion();

  try {
    // Skip for subagent contexts
    if (process.env.OPENCODE_PROJECT_DIR?.includes("/Agents/")) {
      return { updateAvailable: false, currentVersion };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      "https://api.github.com/repos/Steffen025/pai-opencode/releases/latest",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "pai-opencode",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      fileLog(
        `[VersionCheck] GitHub API returned ${response.status}`,
        "debug"
      );
      return { updateAvailable: false, currentVersion };
    }

    const data = (await response.json()) as any;
    const latestVersion = (data.tag_name || "").replace(/^v/, "");

    if (!latestVersion) {
      return { updateAvailable: false, currentVersion };
    }

    const updateAvailable = compareSemver(latestVersion, currentVersion) > 0;

    if (updateAvailable) {
      fileLog(
        `[VersionCheck] Update available: ${currentVersion} → ${latestVersion}`,
        "info"
      );
    } else {
      fileLog(
        `[VersionCheck] Up to date: ${currentVersion}`,
        "debug"
      );
    }

    return { updateAvailable, currentVersion, latestVersion };
  } catch (error) {
    // Network errors are expected (offline, rate limited, etc.)
    fileLog("[VersionCheck] Check failed (offline or rate limited)", "debug");
    return { updateAvailable: false, currentVersion };
  }
}

/**
 * Format a user-facing update notification
 */
export function formatUpdateNotification(
  result: VersionCheckResult
): string | null {
  if (!result.updateAvailable) return null;
  return `PAI-OpenCode update available: ${result.currentVersion} → ${result.latestVersion}. Run: git pull && bun install`;
}
