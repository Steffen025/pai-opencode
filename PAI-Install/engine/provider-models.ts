/**
 * PAI-OpenCode Installer — Provider Model Maps
 *
 * Defines quick/standard/advanced model strings for each supported provider.
 * The installer substitutes these into the opencode.json template at install time.
 *
 * To add a new provider: add an entry below and handle it in steps-fresh.ts.
 */

export type ProviderName = "anthropic" | "zen" | "openrouter" | "openai";

export interface ModelTierMap {
	quick: string;
	standard: string;
	advanced: string;
}

/**
 * Model strings per provider, formatted as "provider/model-name" ready for
 * insertion into opencode.json agent entries.
 */
export const PROVIDER_MODELS: Record<ProviderName, ModelTierMap> = {
	anthropic: {
		quick: "anthropic/claude-haiku-4-5",
		standard: "anthropic/claude-sonnet-4-5",
		advanced: "anthropic/claude-opus-4-6",
	},
	zen: {
		// OpenCode Zen — ALL FREE models (no API key required for out-of-box experience)
		// Users upgrade to paid models post-install via /connect in OpenCode
		quick: "opencode/gpt-5-nano",              // FREE — fastest
		standard: "opencode/qwen3.6-plus-free",    // FREE — capable general/coding
		advanced: "opencode/big-pickle",            // FREE — Zen flagship, heaviest
	},
	openrouter: {
		quick: "openrouter/google/gemini-flash-1.5",
		standard: "openrouter/anthropic/claude-4.5-sonnet",
		advanced: "openrouter/anthropic/claude-opus-4-6",
	},
	openai: {
		quick: "openai/gpt-4o-mini",
		standard: "openai/gpt-4o",
		advanced: "openai/gpt-5",
	},
};

/**
 * Human-readable labels shown in the installer.
 */
export const PROVIDER_LABELS: Record<ProviderName, { label: string; description: string }> = {
	anthropic: {
		label: "Anthropic (Claude)",
		description: "Premium quality — requires Anthropic API key",
	},
	zen: {
		label: "OpenCode Zen (recommended)",
		description: "Free tier available — 60× cost optimisation vs direct Anthropic",
	},
	openrouter: {
		label: "OpenRouter",
		description: "Multi-provider flexibility — one API key for many models",
	},
	openai: {
		label: "OpenAI",
		description: "GPT-4o and GPT-5 — requires OpenAI API key",
	},
};
