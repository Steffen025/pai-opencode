/**
 * PAI-OpenCode Installer — Provider Model Maps
 *
 * Defines quick/standard/advanced model strings for each supported provider.
 * The installer substitutes these into the opencode.json template at install time.
 *
 * To add a new provider: add an entry below and handle it in steps-fresh.ts.
 */

export type ProviderName = "anthropic" | "anthropic-max" | "zen" | "openrouter" | "openai";

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
	// Anthropic Max/Pro OAuth — uses existing $20-200/month subscription.
	// No API key required. Token is extracted from macOS Keychain via Claude Code CLI.
	// The installer copies the anthropic-max-bridge plugin which handles auth automatically.
	"anthropic-max": {
		quick: "anthropic/claude-haiku-4-5",
		standard: "anthropic/claude-sonnet-4-6",
		advanced: "anthropic/claude-opus-4-6",
	},
	zen: {
		// OpenCode Zen — cost-optimised tiers (IDs verified against opencode.ai/docs/zen/)
		quick: "zen/minimax-m2.5-free",       // FREE
		standard: "zen/gpt-5.1-codex-mini",   // $0.25/M in+out
		advanced: "zen/claude-3-5-haiku",     // $0.80/M — catalog ID for Claude Haiku 3.5
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
 * Human-readable labels shown in the installer wizard.
 */
export const PROVIDER_LABELS: Record<ProviderName, { label: string; description: string }> = {
	anthropic: {
		label: "Anthropic (Claude)",
		description: "Premium quality — requires Anthropic API key",
	},
	"anthropic-max": {
		label: "Anthropic Max/Pro (OAuth)",
		description: "Use your existing Max/Pro subscription — no API key needed, requires Claude Code CLI",
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
