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
		// OpenCode Zen — big-pickle for ALL tiers at install time.
		//
		// Why big-pickle everywhere? Free model availability on Zen changes
		// periodically (e.g. qwen3.6-plus-free and gpt-5-nano were removed in
		// a past rotation). big-pickle is the permanent Zen flagship — always
		// available, always free. Shipping a single model removes the risk of
		// users hitting "model not found" errors out of the box.
		//
		// After install, users can optimise per-agent routing via:
		//   bun run .opencode/tools/switch-provider.ts zen-free
		// which applies the zen-free profile with current model assignments.
		// Check https://opencode.ai/docs/zen/ for the up-to-date free model list.
		quick: "opencode/big-pickle",
		standard: "opencode/big-pickle",
		advanced: "opencode/big-pickle",
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
