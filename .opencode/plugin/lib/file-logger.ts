/**
 * PAI-OpenCode File Logger
 *
 * TUI-SAFE LOGGING: NEVER use console.log in OpenCode plugins!
 * Console output corrupts the OpenCode TUI.
 *
 * This module provides file-only logging for debugging plugins.
 *
 * @module file-logger
 */

import { appendFileSync, mkdirSync, existsSync } from "fs";
import { dirname } from "path";

const LOG_PATH = "/tmp/pai-opencode-debug.log";

/**
 * Log a message to file (TUI-safe)
 *
 * IMPORTANT: This function NEVER uses console.log
 * All output goes to /tmp/pai-opencode-debug.log
 *
 * @param message - The message to log
 * @param level - Log level (info, warn, error, debug)
 */
export function fileLog(
  message: string,
  level: "info" | "warn" | "error" | "debug" = "info"
): void {
  try {
    const timestamp = new Date().toISOString();
    const levelPrefix = level.toUpperCase().padEnd(5);
    const logLine = `[${timestamp}] [${levelPrefix}] ${message}\n`;

    const dir = dirname(LOG_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    appendFileSync(LOG_PATH, logLine);
  } catch {
    // Silent fail - NEVER console.log here!
    // TUI corruption is worse than missing logs
  }
}

/**
 * Log an error with stack trace to file
 *
 * @param message - Error context message
 * @param error - The error object
 */
export function fileLogError(message: string, error: unknown): void {
  const errorMessage =
    error instanceof Error
      ? `${error.message}\n${error.stack || ""}`
      : String(error);
  fileLog(`${message}: ${errorMessage}`, "error");
}

/**
 * Get the log file path
 * Useful for telling users where to find logs
 */
export function getLogPath(): string {
  return LOG_PATH;
}

/**
 * Clear the log file
 * Useful at session start
 */
export function clearLog(): void {
  try {
    const { writeFileSync } = require("fs");
    writeFileSync(LOG_PATH, "");
  } catch {
    // Silent fail
  }
}
