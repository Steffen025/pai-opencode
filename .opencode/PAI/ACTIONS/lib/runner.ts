#!/usr/bin/env bun
/**
 * ============================================================================
 * PAI ACTIONS - Local Runner
 * ============================================================================
 *
 * Executes actions locally or dispatches to cloud workers.
 * Handles input validation, execution, output validation.
 *
 * USAGE:
 *   # As library
 *   import { runAction } from './runner';
 *   const result = await runAction('parse/topic', { text: 'quantum computing' });
 *
 *   # As CLI (via pai wrapper)
 *   echo '{"text":"quantum"}' | bun runner.ts parse/topic
 *   bun runner.ts parse/topic --input '{"text":"quantum"}'
 *
 * ============================================================================
 */

import { resolve, dirname, join, relative } from "node:path";
import type { ActionSpec, ActionContext, ActionResult } from "./types";

const ACTIONS_DIR = dirname(import.meta.dir);

/**
 * Load an action by name
 * 
 * SECURITY: Validates name to prevent path traversal attacks.
 * Only allows alphanumeric, dash, underscore, and single slash for category/action.
 * Rejects '..' segments and absolute paths.
 */
export async function loadAction(name: string): Promise<ActionSpec> {
  // SECURITY: Validate name format to prevent path traversal
  // Allow only: alphanumeric, dash, underscore, single slash
  const validNamePattern = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/;
  if (!validNamePattern.test(name)) {
    throw new Error(`Invalid action name: ${name}. Must match pattern: category/action (alphanumeric, dash, underscore only)`);
  }

  // Convert category/name to path: parse/topic -> parse/topic.action.ts
  const actionPath = join(ACTIONS_DIR, `${name}.action.ts`);
  
  // SECURITY: Ensure resolved path is within ACTIONS_DIR
  const resolvedPath = resolve(actionPath);
  if (!resolvedPath.startsWith(ACTIONS_DIR)) {
    throw new Error(`Path traversal detected: ${name} resolves outside actions directory`);
  }

  try {
    const module = await import(actionPath);
    const action = module.default || module.action;

    if (!action || !action.execute) {
      throw new Error(`Action ${name} does not export a valid ActionSpec`);
    }

    return action;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND') {
      throw new Error(`Action not found: ${name} (looked in ${actionPath})`);
    }
    throw error;
  }
}

/**
 * Run an action with input validation
 */
export async function runAction<TInput, TOutput>(
  name: string,
  input: TInput,
  options: {
    mode?: "local" | "cloud";
    env?: Record<string, string>;
    traceId?: string;
  } = {}
): Promise<ActionResult<TOutput>> {
  const startTime = Date.now();
  const mode = options.mode || "local";

  try {
    const action = await loadAction(name) as ActionSpec<TInput, TOutput>;

    // Validate input
    const validatedInput = action.inputSchema.parse(input);

    // Build context
    const ctx: ActionContext = {
      mode,
      env: options.env || process.env,
      trace: options.traceId ? {
        traceId: options.traceId,
        spanId: crypto.randomUUID().slice(0, 8),
      } : undefined,
    };

    if (mode === "cloud") {
      return await dispatchToCloud(name, validatedInput, ctx, action);
    }

    // Execute locally
    const output = await action.execute(validatedInput, ctx);

    // Validate output
    const validatedOutput = action.outputSchema.parse(output);

    return {
      success: true,
      output: validatedOutput,
      metadata: {
        durationMs: Date.now() - startTime,
        action: name,
        mode,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      metadata: {
        durationMs: Date.now() - startTime,
        action: name,
        mode,
      },
    };
  }
}

/**
 * Dispatch to cloud worker
 */
async function dispatchToCloud<TInput, TOutput>(
  name: string,
  input: TInput,
  ctx: ActionContext,
  action: ActionSpec<TInput, TOutput>
): Promise<ActionResult<TOutput>> {
  const startTime = Date.now();

  // Worker URL pattern: pai-{category}-{name}.{subdomain}.workers.dev
  // CF_ACCOUNT_SUBDOMAIN is required — a missing/default value produces an invalid URL.
  const subdomain = process.env.CF_ACCOUNT_SUBDOMAIN;
  if (!subdomain) {
    return {
      success: false,
      error: "CF_ACCOUNT_SUBDOMAIN environment variable is required for cloud execution. " +
        "Set it to your Cloudflare account subdomain (e.g. 'myaccount' for myaccount.workers.dev).",
      metadata: { durationMs: Date.now() - startTime, action: name, mode: "cloud" },
    };
  }
  const workerName = name.replace("/", "-");
  const workerUrl = `https://pai-${workerName}.${subdomain}.workers.dev`;

  // Setup timeout with AbortController
  const controller = new AbortController();
  let timeoutMs = 30000; // Default 30s
  if (ctx.env?.ACTION_TIMEOUT_MS) {
    const parsed = parseInt(ctx.env.ACTION_TIMEOUT_MS, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      timeoutMs = parsed;
    }
  }
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ctx.trace && { "X-Trace-Id": ctx.trace.traceId }),
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `Worker error (${response.status}): ${error}`,
        metadata: {
          durationMs: Date.now() - startTime,
          action: name,
          mode: "cloud",
        },
      };
    }

    const result = await response.json();
    
    // SECURITY: Validate cloud response with schema before returning
    const validatedOutput = action.outputSchema.parse(result);

    return {
      success: true,
      output: validatedOutput,
      metadata: {
        durationMs: Date.now() - startTime,
        action: name,
        mode: "cloud",
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: `Cloud action timed out after ${timeoutMs}ms`,
        metadata: {
          durationMs: Date.now() - startTime,
          action: name,
          mode: "cloud",
        },
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      metadata: {
        durationMs: Date.now() - startTime,
        action: name,
        mode: "cloud",
      },
    };
  }
}

/**
 * List all available actions
 */
export async function listActions(): Promise<string[]> {
  const { glob } = await import("glob");
  const pattern = join(ACTIONS_DIR, "**/*.action.ts");
  const files = await glob(pattern);

  return files.map(f => {
    // Use path.relative for cross-platform compatibility
    const relativePath = relative(ACTIONS_DIR, f);
    // Remove .action.ts extension
    return relativePath.replace(/\.action\.ts$/, "");
  });
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse flags
  let mode: "local" | "cloud" = "local";
  let inputJson: string | undefined;
  let actionName: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--mode" && args[i + 1]) {
      const modeValue = args[i + 1];
      // Validate mode - only allow "local" or "cloud"
      if (modeValue === "local" || modeValue === "cloud") {
        mode = modeValue;
      } else {
        console.error(`Error: Invalid mode "${modeValue}". Must be "local" or "cloud".`);
        process.exit(1);
      }
      i++;
    } else if (args[i] === "--input" && args[i + 1]) {
      inputJson = args[i + 1];
      i++;
    } else if (args[i] === "--list") {
      const actions = await listActions();
      console.log(JSON.stringify({ actions }, null, 2));
      return;
    } else if (!actionName) {
      actionName = args[i];
    }
  }

  if (!actionName) {
    console.error("Usage: bun runner.ts <action-name> [--mode local|cloud] [--input '<json>']");
    console.error("       echo '<json>' | bun runner.ts <action-name>");
    console.error("       bun runner.ts --list");
    process.exit(1);
  }

  // Get input from stdin or --input flag
  let input: unknown;

  if (inputJson) {
    try {
      input = JSON.parse(inputJson);
    } catch (err) {
      console.error(`Error: Invalid JSON in --input: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  } else if (!process.stdin.isTTY) {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const stdinContent = Buffer.concat(chunks).toString().trim();
    if (stdinContent) {
      try {
        input = JSON.parse(stdinContent);
      } catch (err) {
        console.error(`Error: Invalid JSON from stdin: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    }
  }

  // FIX: Check for undefined specifically, not falsy values
  // This allows 0, false, "", null as valid inputs
  if (input === undefined) {
    console.error("Error: No input provided. Use --input or pipe JSON to stdin.");
    process.exit(1);
  }

  const result = await runAction(actionName, input, { mode });

  if (result.success) {
    console.log(JSON.stringify(result.output));
  } else {
    console.error(JSON.stringify({ error: result.error, metadata: result.metadata }));
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
