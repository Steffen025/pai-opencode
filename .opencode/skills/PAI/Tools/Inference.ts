#!/usr/bin/env bun
/**
 * ============================================================================
 * INFERENCE - Provider-agnostic inference via OpenAI-compatible API
 * ============================================================================
 *
 * PURPOSE:
 * Side-channel LLM calls for plugins and tools (sentiment analysis, evals,
 * tab titles) without depending on any specific CLI or provider.
 *
 * Uses the OpenAI-compatible /v1/chat/completions endpoint that virtually
 * every LLM provider supports (OpenAI, Anthropic via proxy, OpenRouter,
 * Ollama, LM Studio, Groq, Together, etc.).
 *
 * CONFIGURATION:
 * Reads from opencode.json in the project root:
 *
 *   {
 *     "pai": {
 *       "inference": {
 *         "baseURL": "https://openrouter.ai/api/v1",
 *         "apiKey": "sk-or-...",
 *         "models": {
 *           "fast": "openai/gpt-4o-mini",
 *           "standard": "anthropic/claude-sonnet-4-5",
 *           "smart": "anthropic/claude-opus-4-6"
 *         }
 *       }
 *     }
 *   }
 *
 * For Ollama (no API key needed):
 *   {
 *     "pai": {
 *       "inference": {
 *         "baseURL": "http://localhost:11434/v1",
 *         "models": {
 *           "fast": "llama3.2",
 *           "standard": "llama3.2",
 *           "smart": "llama3.2"
 *         }
 *       }
 *     }
 *   }
 *
 * FALLBACK:
 * If no pai.inference config exists, all calls return { success: false }
 * with a descriptive error. Consumers handle this gracefully.
 *
 * USAGE:
 *   import { inference } from './Inference';
 *   const result = await inference({ systemPrompt, userPrompt, level: 'fast' });
 *
 * CLI:
 *   bun Inference.ts --level fast <system_prompt> <user_prompt>
 *   bun Inference.ts --json --level fast <system_prompt> <user_prompt>
 *
 * ============================================================================
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

export type InferenceLevel = 'fast' | 'standard' | 'smart';

export interface InferenceOptions {
  systemPrompt: string;
  userPrompt: string;
  level?: InferenceLevel;
  expectJson?: boolean;
  timeout?: number;
}

export interface InferenceResult {
  success: boolean;
  output: string;
  parsed?: unknown;
  error?: string;
  latencyMs: number;
  level: InferenceLevel;
}

// --- Config types ---

interface InferenceConfig {
  baseURL: string;
  apiKey?: string;
  models: Record<InferenceLevel, string>;
}

// Default timeouts per level
const DEFAULT_TIMEOUTS: Record<InferenceLevel, number> = {
  fast: 15000,
  standard: 30000,
  smart: 90000,
};

// --- Config loading ---

let _cachedConfig: InferenceConfig | null | undefined = undefined;

/**
 * Load inference config from opencode.json → pai.inference
 * Returns null if not configured (graceful fallback)
 */
function loadConfig(): InferenceConfig | null {
  if (_cachedConfig !== undefined) return _cachedConfig;

  try {
    // Walk up from this file to find opencode.json in project root
    const candidates = [
      join(process.cwd(), 'opencode.json'),
      join(process.cwd(), '.opencode', 'opencode.json'),
    ];

    // Also check relative to this file's location (skills/PAI/Tools/ → project root)
    const fileDir = import.meta.dir || __dirname || '';
    if (fileDir) {
      // .opencode/skills/PAI/Tools/ → go up 4 levels to project root
      const projectRoot = join(fileDir, '..', '..', '..', '..');
      candidates.unshift(join(projectRoot, 'opencode.json'));
    }

    for (const configPath of candidates) {
      if (!existsSync(configPath)) continue;

      const raw = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(raw);
      const paiInference = config?.pai?.inference;

      if (!paiInference?.baseURL) continue;

      // Resolve API key from env var reference (e.g., "$OPENROUTER_API_KEY")
      let apiKey = paiInference.apiKey || undefined;
      if (apiKey && apiKey.startsWith('$')) {
        apiKey = process.env[apiKey.slice(1)] || apiKey;
      }
      // Also check env directly if no apiKey in config
      if (!apiKey) {
        apiKey = process.env.PAI_INFERENCE_API_KEY || undefined; // pragma: allowlist secret
      }

      // Build models map with sensible defaults
      const models = paiInference.models || {};
      const defaultModel = paiInference.model || models.standard || models.fast || 'gpt-4o-mini';

      _cachedConfig = {
        baseURL: paiInference.baseURL.replace(/\/+$/, ''), // strip trailing slash
        apiKey,
        models: {
          fast: models.fast || defaultModel,
          standard: models.standard || defaultModel,
          smart: models.smart || defaultModel,
        },
      };

      return _cachedConfig;
    }
  } catch {
    // Config read failed — fall through to null
  }

  _cachedConfig = null;
  return null;
}

/**
 * Run inference via OpenAI-compatible API
 *
 * Interface is identical to the previous spawn-based implementation.
 * All existing consumers work without code changes.
 */
export async function inference(options: InferenceOptions): Promise<InferenceResult> {
  const level = options.level || 'standard';
  const startTime = Date.now();
  const timeout = options.timeout || DEFAULT_TIMEOUTS[level];

  // Load config
  const config = loadConfig();
  if (!config) {
    return {
      success: false,
      output: '',
      error: 'No inference provider configured. Add pai.inference to opencode.json (see .opencode/skills/PAI/Tools/Inference.ts for format).',
      latencyMs: Date.now() - startTime,
      level,
    };
  }

  const model = config.models[level];
  const url = `${config.baseURL}/chat/completions`;

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  // Build request body (OpenAI-compatible format)
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userPrompt },
    ],
    temperature: 0.3,
    max_tokens: options.expectJson ? 1000 : 2000,
  };

  // Request JSON mode if available (OpenAI/OpenRouter support this)
  if (options.expectJson) {
    body.response_format = { type: 'json_object' };
  }

  try {
    // Race fetch against timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown');
      return {
        success: false,
        output: '',
        error: `HTTP ${response.status}: ${errorBody.slice(0, 500)}`,
        latencyMs,
        level,
      };
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    // Handle API-level errors
    if (data.error) {
      return {
        success: false,
        output: '',
        error: data.error.message || 'API error',
        latencyMs,
        level,
      };
    }

    const output = (data.choices?.[0]?.message?.content || '').trim();

    if (!output) {
      return {
        success: false,
        output: '',
        error: 'Empty response from API',
        latencyMs,
        level,
      };
    }

    // Parse JSON if requested
    if (options.expectJson) {
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return { success: true, output, parsed, latencyMs, level };
        } catch {
          return {
            success: false,
            output,
            error: 'Failed to parse JSON response',
            latencyMs,
            level,
          };
        }
      }
      return {
        success: false,
        output,
        error: 'No JSON found in response',
        latencyMs,
        level,
      };
    }

    return { success: true, output, latencyMs, level };

  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = err instanceof Error
      ? (err.name === 'AbortError' ? `Timeout after ${timeout}ms` : err.message)
      : 'Unknown error';

    return {
      success: false,
      output: '',
      error: errorMessage,
      latencyMs,
      level,
    };
  }
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse flags
  let expectJson = false;
  let timeout: number | undefined;
  let level: InferenceLevel = 'standard';
  const positionalArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') {
      expectJson = true;
    } else if (args[i] === '--level' && args[i + 1]) {
      const requestedLevel = args[i + 1].toLowerCase();
      if (['fast', 'standard', 'smart'].includes(requestedLevel)) {
        level = requestedLevel as InferenceLevel;
      } else {
        console.error(`Invalid level: ${args[i + 1]}. Use fast, standard, or smart.`);
        process.exit(1);
      }
      i++;
    } else if (args[i] === '--timeout' && args[i + 1]) {
      timeout = parseInt(args[i + 1], 10);
      i++;
    } else {
      positionalArgs.push(args[i]);
    }
  }

  if (positionalArgs.length < 2) {
    console.error('Usage: bun Inference.ts [--level fast|standard|smart] [--json] [--timeout <ms>] <system_prompt> <user_prompt>');
    process.exit(1);
  }

  const [systemPrompt, userPrompt] = positionalArgs;

  const result = await inference({
    systemPrompt,
    userPrompt,
    level,
    expectJson,
    timeout,
  });

  if (result.success) {
    if (expectJson && result.parsed) {
      console.log(JSON.stringify(result.parsed));
    } else {
      console.log(result.output);
    }
  } else {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}
