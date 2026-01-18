/**
 * PAI-OpenCode Shared Types
 *
 * Common TypeScript interfaces for plugin handlers and adapters.
 *
 * @module types
 */

/**
 * Security validation result
 *
 * Returned by security-validator.ts to indicate what action to take
 */
export interface SecurityResult {
  /** Action to take: block (deny), confirm (ask), or allow */
  action: "block" | "confirm" | "allow";
  /** Reason for the action (for logging) */
  reason: string;
  /** Optional detailed message for user */
  message?: string;
}

/**
 * Context loading result
 *
 * Returned by context-loader.ts
 */
export interface ContextResult {
  /** The context string to inject */
  context: string;
  /** Whether loading was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Tool execution input (from OpenCode plugin API)
 */
export interface ToolInput {
  /** Tool name (Bash, Read, Write, etc.) */
  tool: string;
  /** Tool arguments */
  args: Record<string, unknown>;
  /** Session ID */
  sessionId?: string;
}

/**
 * Permission check input (from OpenCode plugin API)
 */
export interface PermissionInput {
  /** Tool name */
  tool: string;
  /** Tool arguments */
  args: Record<string, unknown>;
  /** Permission type being requested */
  permission?: string;
}

/**
 * Event input (from OpenCode plugin API)
 */
export interface EventInput {
  /** Event object */
  event: {
    /** Event type (e.g., "session.ended", "session.created") */
    type: string;
    /** Event data */
    data?: Record<string, unknown>;
  };
}

/**
 * Chat system transform output
 *
 * Used for experimental.chat.system.transform hook
 */
export interface SystemTransformOutput {
  /** Array of system messages to inject */
  system: string[];
}

/**
 * Permission check output
 *
 * Used for permission.ask hook
 */
export interface PermissionOutput {
  /** Status: "ask" (prompt user), "deny" (block), or "allow" */
  status: "ask" | "deny" | "allow";
}

/**
 * Tool execution before output
 *
 * Used for tool.execute.before hook
 */
export interface ToolBeforeOutput {
  /** Modified arguments (can be mutated) */
  args: Record<string, unknown>;
}

/**
 * Tool execution after output
 *
 * Used for tool.execute.after hook
 */
export interface ToolAfterOutput {
  /** Tool result (read-only in most cases) */
  result?: unknown;
}

/**
 * PAI Hook type mapping
 *
 * Maps PAI hook events to their OpenCode equivalents
 */
export const PAI_TO_OPENCODE_HOOKS = {
  SessionStart: "experimental.chat.system.transform",
  PreToolUse: "tool.execute.before",
  PreToolUseBlock: "permission.ask",
  PostToolUse: "tool.execute.after",
  Stop: "event",
  SubagentStop: "tool.execute.after", // Filter for Task tool
} as const;

/**
 * Dangerous command patterns for security validation
 *
 * These patterns will trigger a BLOCK action
 */
export const DANGEROUS_PATTERNS = [
  // Destructive file operations
  /rm\s+-rf\s+\/(?!tmp)/,  // rm -rf / (root) but allow /tmp
  /rm\s+-rf\s+~\//,        // rm -rf ~/ (home)
  /rm\s+-rf\s+\*/,         // rm -rf * (wildcard)
  /rm\s+-rf\s+\.\./,       // rm -rf .. (parent traversal - any path starting with ..)
  /mkfs\./,
  /dd\s+if=.*of=\/dev\//,

  // System compromise
  /chmod\s+777\s+\//,
  /chown\s+-R\s+.*\s+\//,

  // Reverse shells
  /bash\s+-i\s+>&/,
  /nc\s+-e\s+\/bin\/(ba)?sh/,
  /python.*socket.*connect/,

  // Remote code execution
  /curl.*\|\s*(ba)?sh/,
  /wget.*\|\s*(ba)?sh/,

  // Credential theft
  /cat.*\.ssh\/id_/,
  /cat.*\.aws\/credentials/,
  /cat.*\.env/,
] as const;

/**
 * Warning command patterns for security validation
 *
 * These patterns will trigger a CONFIRM action
 */
export const WARNING_PATTERNS = [
  // Git operations that could be destructive
  /git\s+push\s+--force/,
  /git\s+reset\s+--hard/,

  // Package installs
  /npm\s+install\s+-g/,
  /pip\s+install/,

  // Docker operations
  /docker\s+rm/,
  /docker\s+rmi/,
] as const;
