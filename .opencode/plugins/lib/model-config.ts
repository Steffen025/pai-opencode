import { fileLog } from "./file-logger";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";

/**
 * PAI Model Configuration Schema
 *
 * Providers:
 * - "zen": OpenCode ZEN free models (no API key required!)
 * - "anthropic": Claude models (requires ANTHROPIC_API_KEY)
 * - "openai": GPT models (requires OPENAI_API_KEY)
 *
 * ZEN Free Models (as of Jan 2026):
 * - opencode/big-pickle (Free)
 * - opencode/grok-code (Free - Grok Code Fast 1)
 * - opencode/glm-4.7-free (Free - GLM 4.7)
 * - opencode/minimax-m2-1-free (Free - MiniMax M2.1)
 * - opencode/gpt-5-nano (Free)
 *
 * See: https://opencode.ai/docs/zen/
 */
export interface PaiModelConfig {
  model_provider: "zen" | "anthropic" | "openai";
  models: {
    default: string;
    validation: string;
    agents: {
      intern: string;
      architect: string;
      engineer: string;
      explorer: string;
      reviewer: string;
    };
  };
}

/**
 * Provider Presets
 * Default model configurations for each provider
 *
 * ZEN models are FREE and don't require API keys!
 */
const PROVIDER_PRESETS: Record<"zen" | "anthropic" | "openai", PaiModelConfig["models"]> = {
  zen: {
    // Using grok-code as default (fast, free, good for coding)
    default: "opencode/grok-code",
    validation: "opencode/grok-code",
    agents: {
      intern: "opencode/gpt-5-nano",        // Fast, lightweight
      architect: "opencode/big-pickle",      // Best reasoning
      engineer: "opencode/grok-code",        // Optimized for code
      explorer: "opencode/grok-code",        // Fast exploration
      reviewer: "opencode/big-pickle",       // Thorough review
    },
  },
  anthropic: {
    default: "anthropic/claude-sonnet-4-5",
    validation: "anthropic/claude-sonnet-4-5",
    agents: {
      intern: "anthropic/claude-haiku-4-5",
      architect: "anthropic/claude-sonnet-4-5",
      engineer: "anthropic/claude-sonnet-4-5",
      explorer: "anthropic/claude-sonnet-4-5",
      reviewer: "anthropic/claude-opus-4-5",
    },
  },
  openai: {
    default: "openai/gpt-4o",
    validation: "openai/gpt-4o",
    agents: {
      intern: "openai/gpt-4o-mini",
      architect: "openai/gpt-4o",
      engineer: "openai/gpt-4o",
      explorer: "openai/gpt-4o",
      reviewer: "openai/gpt-4o",
    },
  },
};

/**
 * Get the provider preset configuration
 */
export function getProviderPreset(
  provider: "zen" | "anthropic" | "openai"
): PaiModelConfig["models"] {
  return PROVIDER_PRESETS[provider];
}

/**
 * Read opencode.json configuration
 * Returns null if file doesn't exist or can't be parsed
 *
 * IMPORTANT: This function searches multiple locations for opencode.json:
 * 1. Parent directory of .opencode (standard location)
 * 2. Current working directory (project root)
 * 3. Inside .opencode directory (fallback)
 */
function readOpencodeConfig(): any | null {
  try {
    // Try multiple locations for opencode.json
    const cwd = process.cwd();
    const possiblePaths = [
      join(dirname(cwd), "opencode.json"),     // Parent of .opencode
      join(cwd, "opencode.json"),               // Project root (if cwd is project root)
      join(cwd, "..", "opencode.json"),         // Up one level
    ];

    let configPath: string | null = null;
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        configPath = path;
        break;
      }
    }

    if (!configPath) {
      fileLog("model-config", `No opencode.json found in any of: ${possiblePaths.join(", ")}, using defaults`);
      return null;
    }

    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content);

    fileLog("model-config", `Loaded opencode.json from ${configPath}`);
    return config;
  } catch (error) {
    fileLog("model-config", `Error reading opencode.json: ${error}`);
    return null;
  }
}

/**
 * Detect provider from model name
 * @example "anthropic/claude-sonnet-4-5" -> "anthropic"
 * @example "openai/gpt-4o" -> "openai"
 */
function detectProviderFromModel(model: string): "zen" | "anthropic" | "openai" | null {
  if (model.startsWith("anthropic/")) return "anthropic";
  if (model.startsWith("openai/")) return "openai";
  if (model.startsWith("opencode/")) return "zen";
  return null;
}

/**
 * Get the full model configuration
 * Reads from opencode.json or uses "zen" defaults
 *
 * Supports multiple configuration formats:
 * 1. Explicit PAI config: { "pai": { "model_provider": "anthropic" } }
 * 2. OpenCode standard: { "model": "anthropic/claude-sonnet-4-5" } - auto-detects provider
 * 3. No config: falls back to "zen" free models
 */
export function getModelConfig(): PaiModelConfig {
  const config = readOpencodeConfig();

  // Check for PAI section in config (preferred method)
  const paiConfig = config?.pai;

  if (paiConfig?.model_provider) {
    const provider = paiConfig.model_provider as "zen" | "anthropic" | "openai";

    // Validate provider
    if (!["zen", "anthropic", "openai"].includes(provider)) {
      fileLog("model-config", `Invalid provider "${provider}", falling back to zen`);
      return {
        model_provider: "zen",
        models: PROVIDER_PRESETS.zen,
      };
    }

    // If user provided custom models, merge with preset
    const preset = PROVIDER_PRESETS[provider];
    const customModels = paiConfig.models || {};

    const models: PaiModelConfig["models"] = {
      default: customModels.default || preset.default,
      validation: customModels.validation || preset.validation,
      agents: {
        intern: customModels.agents?.intern || preset.agents.intern,
        architect: customModels.agents?.architect || preset.agents.architect,
        engineer: customModels.agents?.engineer || preset.agents.engineer,
        explorer: customModels.agents?.explorer || preset.agents.explorer,
        reviewer: customModels.agents?.reviewer || preset.agents.reviewer,
      },
    };

    fileLog("model-config", `Using provider "${provider}" from pai config with models: ${JSON.stringify(models)}`);

    return {
      model_provider: provider,
      models,
    };
  }

  // Fallback: Try to detect provider from "model" field in opencode.json
  // This supports the standard OpenCode config format: { "model": "anthropic/claude-sonnet-4-5" }
  if (config?.model) {
    const detectedProvider = detectProviderFromModel(config.model);
    if (detectedProvider) {
      fileLog("model-config", `Auto-detected provider "${detectedProvider}" from model field: ${config.model}`);
      return {
        model_provider: detectedProvider,
        models: PROVIDER_PRESETS[detectedProvider],
      };
    }
  }

  // Final fallback: zen defaults
  fileLog("model-config", "No PAI config or model field found, using zen defaults");
  return {
    model_provider: "zen",
    models: PROVIDER_PRESETS.zen,
  };
}

/**
 * Get a specific model by purpose
 * Supports dot notation for nested paths (e.g., "agents.intern")
 */
export function getModel(
  purpose:
    | "default"
    | "validation"
    | "agents.intern"
    | "agents.architect"
    | "agents.engineer"
    | "agents.explorer"
    | "agents.reviewer"
): string {
  const config = getModelConfig();
  const models = config.models;

  // Handle nested paths (agents.*)
  if (purpose.startsWith("agents.")) {
    const agentType = purpose.split(".")[1] as keyof PaiModelConfig["models"]["agents"];
    return models.agents[agentType];
  }

  // Handle top-level paths
  if (purpose === "default" || purpose === "validation") {
    return models[purpose];
  }

  // Fallback to default
  fileLog("model-config", `Unknown purpose "${purpose}", falling back to default`);
  return models.default;
}

/**
 * Get all agent models as a map
 */
export function getAgentModels(): Record<string, string> {
  const config = getModelConfig();
  return config.models.agents;
}

/**
 * Check if API key is required for current provider
 */
export function requiresApiKey(): boolean {
  const config = getModelConfig();
  return config.model_provider !== "zen";
}

/**
 * Get the current provider name
 */
export function getProvider(): "zen" | "anthropic" | "openai" {
  const config = getModelConfig();
  return config.model_provider;
}
