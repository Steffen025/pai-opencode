/**
 * PAI-OpenCode Security Validator
 *
 * Validates tool executions for security threats.
 * Equivalent to PAI's security-validator.ts hook.
 *
 * @module security-validator
 */

import { fileLog, fileLogError } from "../lib/file-logger";
import type {
  SecurityResult,
  PermissionInput,
  ToolInput,
} from "../adapters/types";
import { DANGEROUS_PATTERNS, WARNING_PATTERNS } from "../adapters/types";

/**
 * Check if a command matches any dangerous pattern
 */
function matchesDangerousPattern(command: string): RegExp | null {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return pattern;
    }
  }
  return null;
}

/**
 * Check if a command matches any warning pattern
 */
function matchesWarningPattern(command: string): RegExp | null {
  for (const pattern of WARNING_PATTERNS) {
    if (pattern.test(command)) {
      return pattern;
    }
  }
  return null;
}

/**
 * Extract command from tool input
 */
function extractCommand(input: PermissionInput | ToolInput): string | null {
  // Normalize tool name to lowercase for comparison
  const toolName = input.tool.toLowerCase();

  // Bash tool (handles both "bash" and "Bash")
  if (toolName === "bash" && typeof input.args?.command === "string") {
    return input.args.command;
  }

  // Write tool - check for sensitive paths
  if (toolName === "write" && typeof input.args?.file_path === "string") {
    return `write:${input.args.file_path}`;
  }

  return null;
}

/**
 * Check for prompt injection patterns in content
 */
function checkPromptInjection(content: string): boolean {
  const injectionPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /you\s+are\s+now\s+/i,
    /system\s*:\s*you\s+are/i,
    /override\s+security/i,
    /disable\s+safety/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(content)) {
      return true;
    }
  }

  return false;
}

/**
 * Validate security for a tool execution
 *
 * @param input - The tool or permission input to validate
 * @returns SecurityResult indicating what action to take
 */
export async function validateSecurity(
  input: PermissionInput | ToolInput
): Promise<SecurityResult> {
  try {
    fileLog(`Security check for tool: ${input.tool}`);
    fileLog(`Args: ${JSON.stringify(input.args ?? {}).substring(0, 300)}`, "debug");

    const command = extractCommand(input);

    if (!command) {
      fileLog(`No command extracted from input`, "warn");
      // No command to validate - allow by default
      return {
        action: "allow",
        reason: "No command to validate",
      };
    }

    fileLog(`Extracted command: ${command}`, "info");

    // Check for dangerous patterns (BLOCK)
    const dangerousMatch = matchesDangerousPattern(command);
    if (dangerousMatch) {
      fileLog(`BLOCKED: Dangerous pattern matched: ${dangerousMatch}`, "error");
      return {
        action: "block",
        reason: `Dangerous command pattern detected: ${dangerousMatch}`,
        message:
          "This command has been blocked for security reasons. It matches a known dangerous pattern.",
      };
    }

    // Check for prompt injection in content
    if (input.args?.content && typeof input.args.content === "string") {
      if (checkPromptInjection(input.args.content)) {
        fileLog("BLOCKED: Prompt injection detected", "error");
        return {
          action: "block",
          reason: "Potential prompt injection detected in content",
          message:
            "Content appears to contain prompt injection patterns and has been blocked.",
        };
      }
    }

    // Check for warning patterns (CONFIRM)
    const warningMatch = matchesWarningPattern(command);
    if (warningMatch) {
      fileLog(`CONFIRM: Warning pattern matched: ${warningMatch}`, "warn");
      return {
        action: "confirm",
        reason: `Potentially dangerous command: ${warningMatch}`,
        message:
          "This command may have unintended consequences. Please confirm.",
      };
    }

    // Check for sensitive file writes
    if (input.tool === "Write") {
      const filePath = input.args?.file_path as string;
      const sensitivePaths = [
        /\/etc\//,
        /\/var\/log\//,
        /\.ssh\//,
        /\.aws\//,
        /\.env$/,
        /credentials/i,
        /secret/i,
      ];

      for (const pattern of sensitivePaths) {
        if (pattern.test(filePath)) {
          fileLog(`CONFIRM: Sensitive file write: ${filePath}`, "warn");
          return {
            action: "confirm",
            reason: `Writing to sensitive path: ${filePath}`,
            message: "Writing to a potentially sensitive location. Please confirm.",
          };
        }
      }
    }

    // All checks passed - allow
    fileLog("Security check passed", "debug");
    return {
      action: "allow",
      reason: "All security checks passed",
    };
  } catch (error) {
    fileLogError("Security validation error", error);
    // Fail-open: on error, allow the operation
    // This is a design decision - fail-closed would be safer but more disruptive
    return {
      action: "allow",
      reason: "Security check error - allowing by default",
    };
  }
}
