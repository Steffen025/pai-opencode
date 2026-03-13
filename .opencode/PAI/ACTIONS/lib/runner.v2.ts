#!/usr/bin/env bun
/**
 * ============================================================================
 * PAI ACTIONS v2 - Runner with Capability Injection
 * ============================================================================
 *
 * Loads action packages (action.json + action.ts) and provides capabilities.
 *
 * ============================================================================
 */

import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import type {
  ActionManifest,
  ActionImplementation,
  ActionContext,
  ActionCapabilities,
  ActionResult,
  LLMOptions,
  LLMResponse,
} from "./types.v2";
import { validateSchema } from "./types.v2";

const ACTIONS_DIR = dirname(import.meta.dir);
const USER_ACTIONS_DIR = join(ACTIONS_DIR, "..", "USER", "ACTIONS");

// Regex for valid A_ flat-format action names (no path traversal possible)
const FLAT_ACTION_NAME_RE = /^A_[A-Z0-9_]+$/;

// Regex for valid legacy category/name segments (no dots, no slashes, no traversal)
const LEGACY_SEGMENT_RE = /^[A-Za-z0-9_-]+$/;

/**
 * Local LLM provider using PAI's Inference tool
 */
async function createLocalLLM(): Promise<ActionCapabilities["llm"]> {
  const inferenceModule = await import(
    join(process.env.HOME ?? "/root", ".opencode/PAI/Tools/Inference.ts")
  );
  const { inference } = inferenceModule;

  return async (prompt: string, options?: LLMOptions): Promise<LLMResponse> => {
    const tierMap = { fast: "fast", standard: "standard", smart: "smart" } as const;

    const result = await inference({
      userPrompt: prompt,
      systemPrompt: options?.system,
      level: tierMap[options?.tier || "fast"],
      expectJson: options?.json,
      maxTokens: options?.maxTokens,
    });

    if (!result.success) {
      throw new Error(result.error || "LLM inference failed");
    }

    return {
      text: result.output || "",
      json: result.parsed,
      usage: result.usage,
    };
  };
}

/**
 * Create capability providers for local execution
 */
async function createLocalCapabilities(
  required: ActionManifest["requires"] = []
): Promise<ActionCapabilities> {
  const capabilities: ActionCapabilities = {};

  for (const cap of required) {
    switch (cap) {
      case "llm":
        capabilities.llm = await createLocalLLM();
        break;
      case "fetch":
        capabilities.fetch = fetch;
        break;
      case "shell":
        capabilities.shell = async (cmd: string) => {
          const { $ } = await import("bun");
          try {
            // Use Bun Shell directly (cross-platform) instead of "sh -c" wrapper.
            // Bun Shell handles Windows/POSIX transparently.
            const result = await $.raw`${cmd}`.quiet();
            return { stdout: result.text(), stderr: "", code: 0 };
          } catch (err: unknown) {
            const e = err as { stderr?: { toString(): string }; exitCode?: number };
            return {
              stdout: "",
              stderr: e.stderr?.toString() || String(err),
              code: e.exitCode || 1,
            };
          }
        };
        break;
      case "readFile":
        capabilities.readFile = async (path: string) => {
          return Bun.file(path).text();
        };
        break;
      case "writeFile":
        capabilities.writeFile = async (path: string, content: string) => {
          await Bun.write(path, content);
        };
        break;
      // kv would need a backend - skip for now
    }
  }

  return capabilities;
}

/**
 * Load an action manifest from a directory
 */
export async function loadManifest(actionPath: string): Promise<ActionManifest> {
  const manifestPath = join(actionPath, "action.json");
  const content = await readFile(manifestPath, "utf-8");
  return JSON.parse(content) as ActionManifest;
}

/**
 * Load an action implementation
 */
export async function loadImplementation<TInput, TOutput>(
  actionPath: string
): Promise<ActionImplementation<TInput, TOutput>> {
  const implPath = join(actionPath, "action.ts");
  const module = await import(implPath);
  return module.default as ActionImplementation<TInput, TOutput>;
}

/**
 * Containment check: ensure resolved path stays under baseDir.
 * Prevents path traversal via symlinks or ".." in name after resolution.
 * Uses path.sep for cross-platform compatibility (works on Windows too).
 */
function isContained(baseDir: string, candidatePath: string): boolean {
  const resolvedBase = resolve(baseDir);
  const resolvedCandidate = resolve(candidatePath);
  return (
    resolvedCandidate.startsWith(resolvedBase + sep) ||
    resolvedCandidate === resolvedBase
  );
}

/**
 * Find action directory by name
 * Resolution order: USER/ACTIONS (personal) → ACTIONS (system/framework)
 * Supports: A_NAME (flat, new) or category/name (legacy)
 *
 * Security: validates name format before any filesystem access to prevent
 * path traversal attacks.
 */
export async function findAction(name: string): Promise<string | null> {
  // New flat format: A_EXTRACT_TRANSCRIPT
  if (name.startsWith("A_")) {
    // Validate: only A_ followed by uppercase letters, digits, underscores
    if (!FLAT_ACTION_NAME_RE.test(name)) return null;

    // Check USER/ACTIONS first (personal actions override system)
    const userPath = join(USER_ACTIONS_DIR, name);
    if (!isContained(USER_ACTIONS_DIR, userPath)) return null;
    try {
      await readFile(join(userPath, "action.json"), "utf-8");
      return userPath;
    } catch {}

    // Fall back to ACTIONS (system/framework)
    const systemPath = join(ACTIONS_DIR, name);
    if (!isContained(ACTIONS_DIR, systemPath)) return null;
    try {
      await readFile(join(systemPath, "action.json"), "utf-8");
      return systemPath;
    } catch {
      return null;
    }
  }

  // Legacy format: category/name → check USER first, then SYSTEM
  const parts = name.split("/");
  if (parts.length !== 2) return null;

  const [category, actionName] = parts;

  // Validate each segment: no "..", no path separators, no special chars
  if (!LEGACY_SEGMENT_RE.test(category) || !LEGACY_SEGMENT_RE.test(actionName)) return null;

  // Check USER/ACTIONS first
  const userPath = join(USER_ACTIONS_DIR, category, actionName);
  if (!isContained(USER_ACTIONS_DIR, userPath)) return null;
  try {
    await readFile(join(userPath, "action.json"), "utf-8");
    return userPath;
  } catch {}

  // Fall back to ACTIONS (system)
  const systemPath = join(ACTIONS_DIR, category, actionName);
  if (!isContained(ACTIONS_DIR, systemPath)) return null;
  try {
    await readFile(join(systemPath, "action.json"), "utf-8");
    return systemPath;
  } catch {
    return null;
  }
}

/**
 * Simple input field spec used in the simplified (non-JSON-Schema) format.
 */
interface SimpleFieldSpec {
  type?: string;
  required?: boolean;
}

/**
 * Validate input against a simplified field spec map.
 * Checks required fields and basic type matching.
 * Returns an array of error strings (empty = valid).
 */
function validateSimplifiedInput(
  input: Record<string, unknown>,
  spec: Record<string, SimpleFieldSpec>
): string[] {
  const errors: string[] = [];
  for (const [field, fieldSpec] of Object.entries(spec)) {
    const value = input[field];
    if (fieldSpec.required && (value === undefined || value === null)) {
      errors.push(`Missing required input: ${field}`);
      continue;
    }
    if (value !== undefined && value !== null && fieldSpec.type) {
      const actualType = Array.isArray(value) ? "array" : typeof value;
      if (actualType !== fieldSpec.type) {
        errors.push(`Invalid type for '${field}': expected ${fieldSpec.type}, got ${actualType}`);
      }
    }
  }
  return errors;
}

/**
 * Run an action with capability injection
 */
export async function runAction<TInput = unknown, TOutput = unknown>(
  name: string,
  input: TInput,
  options: { mode?: "local" | "cloud" } = {}
): Promise<ActionResult<TOutput>> {
  const startTime = Date.now();
  const mode = options.mode || "local";

  // Cloud mode is not yet implemented — reject explicitly rather than silently
  // executing locally and misleading the caller about where the action ran.
  if (mode === "cloud") {
    return {
      success: false,
      error: "Cloud execution mode is not yet implemented. Use mode: 'local' or omit the mode option.",
    };
  }

  // Find action
  const actionPath = await findAction(name);
  if (!actionPath) {
    return { success: false, error: `Action not found: ${name}` };
  }

  try {
    // Load manifest and implementation
    const manifest = await loadManifest(actionPath);
    const implementation = await loadImplementation<TInput, TOutput>(actionPath);

    // Validate input
    if (manifest.input && !manifest.input.type) {
      // Simplified format: { field: { type, required } } — validate required + types
      const errors = validateSimplifiedInput(
        input as Record<string, unknown>,
        manifest.input as Record<string, SimpleFieldSpec>
      );
      if (errors.length > 0) {
        return { success: false, error: errors.join("; ") };
      }
    } else if (manifest.input?.type === "object") {
      // Legacy JSON Schema format — use ajv
      const inputValidation = await validateSchema(input, manifest.input);
      if (!inputValidation.valid) {
        return { success: false, error: `Input validation failed: ${inputValidation.errors?.join(", ")}` };
      }
    }

    // Create capabilities
    const capabilities = await createLocalCapabilities(manifest.requires);

    // Create context
    const ctx: ActionContext = {
      capabilities,
      env: { mode },
    };

    // Execute
    const output = await implementation.execute(input, ctx);

    // Validate output against the declared output schema
    if (manifest.output) {
      const outputValidation = await validateSchema(output, manifest.output);
      if (!outputValidation.valid) {
        return {
          success: false,
          error: `Output validation failed for action '${manifest.name}' v${manifest.version || "1.0.0"}: ${outputValidation.errors?.join(", ")}`,
        };
      }
    }

    return {
      success: true,
      output,
      metadata: {
        durationMs: Date.now() - startTime,
        action: manifest.name,
        version: manifest.version || "1.0.0",
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      metadata: {
        durationMs: Date.now() - startTime,
        action: name,
        version: "unknown",
      },
    };
  }
}

/**
 * List all actions from both USER (personal) and SYSTEM (framework) directories.
 * USER actions take precedence over SYSTEM actions with the same name.
 */
export async function listActionsV2(): Promise<ActionManifest[]> {
  const manifests: ActionManifest[] = [];
  const seen = new Set<string>();

  // Scan a directory for actions (A_ flat + legacy nested)
  async function scanDir(baseDir: string) {
    try {
      const entries = await readdir(baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name === "lib") continue;

        if (entry.name.startsWith("A_")) {
          if (seen.has(entry.name)) continue;
          try {
            const manifest = await loadManifest(join(baseDir, entry.name));
            manifests.push(manifest);
            seen.add(entry.name);
          } catch {}
        } else {
          const catPath = join(baseDir, entry.name);
          try {
            const items = await readdir(catPath, { withFileTypes: true });
            for (const item of items) {
              if (!item.isDirectory()) continue;
              const key = `${entry.name}/${item.name}`;
              if (seen.has(key)) continue;
              try {
                const manifest = await loadManifest(join(catPath, item.name));
                manifests.push(manifest);
                seen.add(key);
              } catch {}
            }
          } catch {}
        }
      }
    } catch {}
  }

  // USER first (personal takes precedence), then SYSTEM
  await scanDir(USER_ACTIONS_DIR);
  await scanDir(ACTIONS_DIR);

  return manifests;
}

// CLI support
if (import.meta.main) {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === "list") {
    const actions = await listActionsV2();
    console.log(JSON.stringify({ actions: actions.map(a => a.name) }, null, 2));
  } else if (cmd === "run" && args[1]) {
    const input = args[2] ? JSON.parse(args[2]) : {};
    const result = await runAction(args[1], input);
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("Usage: runner.v2.ts list | run <action> [input-json]");
  }
}
