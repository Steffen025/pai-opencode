#!/usr/bin/env bun
/**
 * ============================================================================
 * PAI CLI - Unified Actions & Pipelines Interface
 * ============================================================================
 *
 * The main entry point for running PAI actions and pipelines.
 *
 * USAGE:
 *   # Run an action
 *   pai action A_EXAMPLE_SUMMARIZE --input '{"text":"quantum computing"}'
 *   echo '{"text":"quantum"}' | pai action A_EXAMPLE_SUMMARIZE
 *
 *   # Run a pipeline
 *   pai pipeline P_EXAMPLE_SUMMARIZE_AND_FORMAT --topic "quantum computing"
 *
 *   # Piping actions together
 *   pai action A_EXAMPLE_SUMMARIZE | pai action A_EXAMPLE_FORMAT
 *
 *   # List available actions/pipelines
 *   pai actions
 *   pai pipelines
 *
 *   # Show action/pipeline info
 *   pai info A_EXAMPLE_SUMMARIZE
 *
 * OPTIONS:
 *   --mode local|cloud    Execution mode (default: local)
 *   --input '<json>'      Input as JSON string
 *   --verbose             Show execution details
 *
 * ============================================================================
 */

import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { findAction, listActionsV2, loadManifest, runAction } from "./lib/runner.v2";

const PIPELINES_DIR = join(dirname(import.meta.dir), "PIPELINES");

interface CLIOptions {
  mode: "local" | "cloud";
  verbose: boolean;
  input?: string;
}

function parseArgs(args: string[]): { command: string; target?: string; options: CLIOptions; extra: Record<string, string> } {
  const options: CLIOptions = { mode: "local", verbose: false };
  const extra: Record<string, string> = {};
  let command = "";
  let target: string | undefined;
  let expectingValue: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (expectingValue) {
      if (expectingValue === "mode") {
        // Validate mode value — only "local" or "cloud" accepted
        if (arg === "local" || arg === "cloud") {
          options.mode = arg;
        } else {
          console.error(`Error: Invalid mode "${arg}". Must be "local" or "cloud".`);
          process.exit(1);
        }
      } else if (expectingValue === "input") {
        options.input = arg;
      } else {
        extra[expectingValue] = arg;
      }
      expectingValue = null;
      continue;
    }

    if (arg === "--mode") { expectingValue = "mode"; continue; }
    if (arg === "--input") { expectingValue = "input"; continue; }
    if (arg === "--verbose" || arg === "-v") { options.verbose = true; continue; }
    if (arg.startsWith("--")) { expectingValue = arg.slice(2); continue; }

    if (!command) { command = arg; continue; }
    if (!target) { target = arg; }
  }

  return { command, target, options, extra };
}

async function readStdin(): Promise<string | null> {
  if (process.stdin.isTTY) return null;

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const content = Buffer.concat(chunks).toString().trim();
  return content || null;
}

/**
 * List pipeline files using the current P_*.yaml naming convention.
 */
async function listPipelines(): Promise<string[]> {
  try {
    const files = await readdir(PIPELINES_DIR);
    return files
      .filter(f => /^P_[A-Z0-9_]+\.ya?ml$/.test(f))
      .map(f => f.replace(/\.ya?ml$/, ""));
  } catch {
    return [];
  }
}

async function showHelp() {
  console.log(`
PAI - Personal AI Actions & Pipelines

USAGE:
  pai action <name> [--input '<json>']     Run an action
  pai pipeline <name> [--<param> <value>]  Run a pipeline (not yet implemented)
  pai actions                               List all actions
  pai pipelines                             List all pipelines
  pai info <name>                           Show action details

OPTIONS:
  --mode local|cloud    Execution mode (default: local)
  --input '<json>'      Input as JSON string
  --verbose, -v         Show execution details

EXAMPLES:
  pai action A_EXAMPLE_SUMMARIZE --input '{"text":"quantum computing"}'
  echo '{"text":"AI"}' | pai action A_EXAMPLE_SUMMARIZE
  pai action A_EXAMPLE_SUMMARIZE | pai action A_EXAMPLE_FORMAT
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    await showHelp();
    return;
  }

  const { command, target, options, extra } = parseArgs(args);

  switch (command) {
    case "action": {
      if (!target) {
        console.error("Error: Action name required. Usage: pai action <name>");
        process.exit(1);
      }

      // Get input from stdin, --input flag, or extra params
      let input: unknown;
      const stdinContent = await readStdin();

      if (stdinContent) {
        input = JSON.parse(stdinContent);
      } else if (options.input) {
        input = JSON.parse(options.input);
      } else if (Object.keys(extra).length > 0) {
        input = extra;
      } else {
        console.error("Error: No input provided. Use --input, pipe JSON, or pass --<param> <value>");
        process.exit(1);
      }

      if (options.verbose) {
        console.error(`[pai] Running action: ${target}`);
        console.error(`[pai] Mode: ${options.mode}`);
        console.error(`[pai] Input: ${JSON.stringify(input)}`);
      }

      const result = await runAction(target, input, { mode: options.mode });

      if (result.success) {
        console.log(JSON.stringify(result.output));
        if (options.verbose && result.metadata) {
          console.error(`[pai] Duration: ${result.metadata.durationMs}ms`);
        }
      } else {
        console.error(JSON.stringify({ error: result.error }));
        process.exit(1);
      }
      break;
    }

    case "pipeline": {
      if (!target) {
        console.error("Error: Pipeline name required. Usage: pai pipeline <name>");
        process.exit(1);
      }
      // TODO: Pipeline runner not yet implemented — use individual actions for now
      console.error(`Pipeline execution not yet implemented: ${target}`);
      console.error(`Use 'pai action <name>' to run individual actions.`);
      process.exit(1);
      break;
    }

    case "actions": {
      const actions = await listActionsV2();
      console.log(JSON.stringify({ actions: actions.map(a => a.name) }, null, 2));
      break;
    }

    case "pipelines": {
      const pipelines = await listPipelines();
      console.log(JSON.stringify({ pipelines }, null, 2));
      break;
    }

    case "info": {
      if (!target) {
        console.error("Error: Name required. Usage: pai info <action-name>");
        process.exit(1);
      }

      // Load action using v2 runner
      const actionPath = await findAction(target);
      if (!actionPath) {
        console.error(`Not found: ${target}`);
        process.exit(1);
      }

      try {
        const manifest = await loadManifest(actionPath);
        console.log(JSON.stringify({
          type: "action",
          name: manifest.name,
          version: manifest.version,
          description: manifest.description,
          tags: manifest.tags,
          requires: manifest.requires,
          deployment: manifest.deployment,
          input: manifest.input,
          output: manifest.output,
        }, null, 2));
      } catch (err) {
        console.error(`Error loading action info: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      await showHelp();
      process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(err => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}
