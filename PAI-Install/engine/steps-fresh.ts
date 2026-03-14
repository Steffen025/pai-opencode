#!/usr/bin/env bun
/**
 * PAI-OpenCode Installer — Fresh Install Steps
 *
 * 7-step fresh installation flow with OpenCode-Zen as default provider.
 */

import type { InstallState } from "./types.ts";
import { buildOpenCodeBinary } from "./build-opencode.ts";
import type { BuildResult } from "./build-opencode.ts";
import { PROVIDER_MODELS, PROVIDER_LABELS } from "./provider-models.ts";
import type { ProviderName } from "./provider-models.ts";
import { existsSync, mkdirSync, writeFileSync, chmodSync, symlinkSync, unlinkSync, lstatSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

// ═══════════════════════════════════════════════════════════
// Step 1: Welcome
// ═══════════════════════════════════════════════════════════

export async function stepWelcome(
	state: InstallState,
	onProgress: (percent: number, message: string) => void
): Promise<void> {
	onProgress(0, "Welcome to PAI-OpenCode!");
	
	// Show welcome screen — no actual work here
	// UI will display value proposition and next steps
	
	await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate UI delay
}

// ═══════════════════════════════════════════════════════════
// Step 2: Prerequisites
// ═══════════════════════════════════════════════════════════

export interface PrerequisitesResult {
	git: boolean;
	bun: boolean;
	gitVersion?: string;
	bunVersion?: string;
}

export async function stepPrerequisites(
	state: InstallState,
	onProgress: (percent: number, message: string) => void
): Promise<PrerequisitesResult> {
	onProgress(10, "Checking prerequisites...");
	
	const result: PrerequisitesResult = {
		git: false,
		bun: false,
	};
	
	// Check git
	try {
		const { stdout } = await exec("git --version");
		result.git = true;
		result.gitVersion = stdout.trim();
	} catch {
		result.git = false;
	}
	
	// Check bun
	try {
		const { stdout } = await exec("bun --version");
		result.bun = true;
		result.bunVersion = stdout.trim();
	} catch {
		result.bun = false;
	}
	
	// If missing, UI should offer to install
	// This function just reports — installation handled by UI
	
	return result;
}

// ═══════════════════════════════════════════════════════════
// Step 3: Build OpenCode Binary
// ═══════════════════════════════════════════════════════════

export async function stepBuildOpenCode(
	state: InstallState,
	onProgress: (percent: number, message: string) => void,
	skipBuild: boolean = false
): Promise<BuildResult> {
	if (skipBuild) {
		onProgress(70, "Skipped OpenCode build — using standard version");
		return {
			success: true,
			skipped: true,
			binaryPath: "/usr/local/bin/opencode", // Homebrew path
		};
	}
	
	// Progress range: 10% → 70%
	const buildResult = await buildOpenCodeBinary({
		onProgress: (message, percent) => {
			// Map build progress (10-100) to step progress (10-70)
			const mappedPercent = 10 + (percent * 0.6);
			onProgress(Math.round(mappedPercent), message);
		},
		skipIfExists: true,
	});
	
	return buildResult;
}

// ═══════════════════════════════════════════════════════════
// Step 4: AI Provider Configuration
// ═══════════════════════════════════════════════════════════

export interface ProviderConfig {
	provider: ProviderName;
	apiKey: string;
}

// Re-export for consumers that imported these from this module
export { PROVIDER_MODELS, PROVIDER_LABELS } from "./provider-models.ts";

// Legacy aliases kept for CLI quick-install.ts compatibility.
// Spread into new objects so mutations by consumers cannot corrupt PROVIDER_MODELS.
export const ZEN_FREE_MODELS = { ...PROVIDER_MODELS.zen };
export const ANTHROPIC_MODELS = { ...PROVIDER_MODELS.anthropic };
export const OPENROUTER_MODELS = { ...PROVIDER_MODELS.openrouter };
export const OPENAI_MODELS = { ...PROVIDER_MODELS.openai };

export async function stepProviderConfig(
	state: InstallState,
	config: ProviderConfig,
	onProgress: (percent: number, message: string) => void
): Promise<void> {
	onProgress(75, "Configuring AI provider...");

	// Save provider + key; model strings are resolved from PROVIDER_MODELS at write time
	state.collected.provider = config.provider;
	state.collected.apiKey = config.apiKey;

	// API key will be saved to .env by the install step
}

// ═══════════════════════════════════════════════════════════
// Step 5: Identity
// ═══════════════════════════════════════════════════════════

export interface IdentityConfig {
	principalName: string;
	aiName: string;
	timezone: string;
}

export async function stepIdentity(
	state: InstallState,
	config: IdentityConfig,
	onProgress: (percent: number, message: string) => void
): Promise<void> {
	onProgress(80, "Setting up identity...");
	
	state.collected.principalName = config.principalName;
	state.collected.aiName = config.aiName;
	state.collected.timezone = config.timezone;
}

// ═══════════════════════════════════════════════════════════
// Step 6: Voice Setup (Optional)
// ═══════════════════════════════════════════════════════════

export interface VoiceConfig {
	enabled: boolean;
	provider?: "elevenlabs" | "google" | "macos" | "none";
	apiKey?: string;
	voiceId?: string;
}

export async function stepVoice(
	state: InstallState,
	config: VoiceConfig,
	onProgress: (percent: number, message: string) => void
): Promise<void> {
	onProgress(85, "Configuring voice...");
	
	state.collected.voiceEnabled = config.enabled;
	state.collected.voiceProvider = config.provider || "none";
	state.collected.voiceApiKey = config.apiKey;
	state.collected.voiceId = config.voiceId;
}

// ═══════════════════════════════════════════════════════════
// Step 7: Install PAI Files
// ═══════════════════════════════════════════════════════════

export async function stepInstallPAI(
	state: InstallState,
	onProgress: (percent: number, message: string) => void
): Promise<void> {
	onProgress(90, "Installing PAI-OpenCode files...");
	
	// Install location: current working directory (where install.sh was run)
	const installDir = process.cwd();
	const localOpencodeDir = join(installDir, ".opencode");
	const toolsDir = join(localOpencodeDir, "tools");
	const globalOpencodeLink = join(homedir(), ".opencode");
	
	// Create local .opencode directory structure
	mkdirSync(localOpencodeDir, { recursive: true });
	mkdirSync(toolsDir, { recursive: true });
	onProgress(92, "Created local directory structure...");
	
	// Generate settings.json (without API keys - those go in .env)
	const settings = {
		principal: {
			name: state.collected.principalName || "User",
			timezone: state.collected.timezone || "UTC",
		},
		daidentity: {
			name: state.collected.aiName || "PAI",
			voice: {
				enabled: state.collected.voiceEnabled || false,
				provider: state.collected.voiceProvider || "none",
				voiceId: state.collected.voiceId || "default",
			},
		},
		providers: {
			default: state.collected.provider || "zen",
			[state.collected.provider || "zen"]: {
				// apiKey is stored in .env, not here
				// model strings are written to opencode.json via PROVIDER_MODELS
			},
		},
	};
	writeFileSync(
		join(localOpencodeDir, "settings.json"),
		JSON.stringify(settings, null, 2)
	);
	onProgress(94, "Generated settings.json...");
	
	// Create .env file with API keys (restricted permissions)
	const providerEnvVar = `${(state.collected.provider || "zen").toUpperCase()}_API_KEY`;
	const voiceEnvVar = state.collected.voiceProvider === "google" ? "GOOGLE_TTS_API_KEY" :
		state.collected.voiceProvider === "elevenlabs" ? "ELEVENLABS_API_KEY" :
		state.collected.voiceProvider === "macos" ? "" : "";
	
	let envContent = `# PAI-OpenCode Environment Variables
# Generated by installer - DO NOT COMMIT THIS FILE
${providerEnvVar}=${state.collected.apiKey || ""}

# Optional: Enable experimental LSP code navigation tools
# Uncomment to activate goToDefinition, findReferences, hover, callHierarchy
# OPENCODE_EXPERIMENTAL_LSP_TOOL=true
`;
	
	if (voiceEnvVar && state.collected.voiceApiKey) {
		envContent += `${voiceEnvVar}=${state.collected.voiceApiKey}\n`;
	}
	
	const envPath = join(localOpencodeDir, ".env");
	writeFileSync(envPath, envContent);
	chmodSync(envPath, 0o600);
	onProgress(95, "Created .env with secure permissions...");
	
	// Generate opencode.json — full agent-tier structure matching the repo template
	const provider = (state.collected.provider || "zen") as ProviderName;
	const tiers = PROVIDER_MODELS[provider] ?? PROVIDER_MODELS.zen;

	/**
	 * Build a standard agent entry with quick/standard/advanced tiers.
	 * The top-level `model` mirrors the standard tier so opencode has a
	 * sensible default when no tier is specified by a caller.
	 */
	function agentEntry(standard: string, quick: string, advanced: string) {
		return {
			model: standard,
			model_tiers: {
				quick: { model: quick },
				standard: { model: standard },
				advanced: { model: advanced },
			},
		};
	}

	const opencode = {
		$schema: "https://opencode.ai/config.json",
		theme: "dark",
		model: tiers.standard,
		snapshot: true,
		username: state.collected.principalName || "User",
		permission: {
			"*": "allow",
			websearch: "allow",
			codesearch: "allow",
			webfetch: "allow",
			doom_loop: "ask",
			external_directory: "ask",
		},
		mode: {
			build: {
				prompt: "You are a Personal AI assistant powered by PAI-OpenCode infrastructure.",
			},
			plan: {
				prompt: "You are a Personal AI assistant powered by PAI-OpenCode infrastructure.",
			},
		},
		agent: {
			// Algorithm agent always uses the highest-quality model for orchestration
			Algorithm: { model: tiers.advanced },
			Architect: agentEntry(tiers.standard, tiers.quick, tiers.advanced),
			Engineer: agentEntry(tiers.standard, tiers.quick, tiers.advanced),
			general: agentEntry(tiers.standard, tiers.quick, tiers.advanced),
			// explore is always the quick model — speed matters more than quality
			explore: { model: tiers.quick },
			Intern: agentEntry(tiers.quick, tiers.quick, tiers.standard),
			Writer: agentEntry(tiers.standard, tiers.quick, tiers.advanced),
			DeepResearcher: agentEntry(tiers.standard, tiers.quick, tiers.advanced),
			// Specialised researchers keep their primary model but fall back to provider tiers
			GeminiResearcher: agentEntry(tiers.standard, tiers.quick, tiers.advanced),
			GrokResearcher: agentEntry(tiers.standard, tiers.quick, tiers.advanced),
			PerplexityResearcher: agentEntry(tiers.standard, tiers.quick, tiers.advanced),
			CodexResearcher: agentEntry(tiers.standard, tiers.quick, tiers.advanced),
			// QATester has no tier override — single model is intentional
			QATester: { model: tiers.standard },
			Pentester: agentEntry(tiers.standard, tiers.quick, tiers.advanced),
			Designer: agentEntry(tiers.standard, tiers.quick, tiers.advanced),
			Artist: agentEntry(tiers.standard, tiers.quick, tiers.advanced),
		},
	};

	writeFileSync(
		join(localOpencodeDir, "opencode.json"),
		JSON.stringify(opencode, null, 2),
	);
	onProgress(97, "Generated opencode.json...");
	
	// Create symlink from ~/.opencode to local .opencode
	onProgress(98, "Creating symlink ~/.opencode → ./.opencode...");
	
	try {
		// Check if ~/.opencode exists
		if (existsSync(globalOpencodeLink)) {
			const stats = lstatSync(globalOpencodeLink);

			if (stats.isSymbolicLink()) {
				// It's already a symlink - check if it points to our location
				let currentTarget: string;
				try {
					currentTarget = realpathSync(globalOpencodeLink);
				} catch {
					// Symlink target doesn't exist (broken symlink) — remove and recreate
					unlinkSync(globalOpencodeLink);
					symlinkSync(localOpencodeDir, globalOpencodeLink, "dir");
					// Assign so the subsequent check sees a defined, correct value
					// and doesn't attempt a redundant remove+recreate
					currentTarget = localOpencodeDir;
				}

				if (currentTarget !== localOpencodeDir) {
					// Remove old symlink and create new one
					unlinkSync(globalOpencodeLink);
					symlinkSync(localOpencodeDir, globalOpencodeLink, "dir");
				}
				// If it already points to our location, nothing to do
			} else if (stats.isDirectory()) {
				// It's a real directory - backup and replace with symlink
				const backupPath = `${globalOpencodeLink}.backup-${Date.now()}`;
				// Note: In production, this would need proper backup logic
				// For now, we just warn and don't overwrite
				throw new Error(
					`~/.opencode is a directory (not a symlink). ` +
					`Please backup and remove it manually, then re-run the installer.`
				);
			}
		} else {
			// No ~/.opencode exists - create symlink
			symlinkSync(localOpencodeDir, globalOpencodeLink, "dir");
		}
	} catch (error) {
		// Log error but don't fail - user can fix manually or wrapper can assist
		console.error(`Warning: Could not create symlink: ${error}`);
		console.error(`You can manually create it with: ln -s ${localOpencodeDir} ~/.opencode`);
	}
	
	onProgress(100, "Installation complete!");
}

// ═══════════════════════════════════════════════════════════
// Orchestrator: Fresh Install Flow
// ═══════════════════════════════════════════════════════════

export async function runFreshInstall(
  state: InstallState,
  emit: (event: any) => Promise<void>,
  requestInput: (id: string, prompt: string, type: "text" | "password" | "key", placeholder?: string) => Promise<string>,
  requestChoice: (id: string, prompt: string, choices: { label: string; value: string; description?: string }[]) => Promise<string>
): Promise<void> {
  // Step 1: Welcome / System Detection
  await emit({ event: "step_start", step: "system-detect" });
  const { detectSystem } = await import("./detect");
  state.detection = detectSystem();
  await emit({ event: "step_complete", step: "system-detect" });

  // Step 2: Prerequisites
  await emit({ event: "step_start", step: "prerequisites" });
  await stepPrerequisites(state, (percent, message) => {
    emit({ event: "progress", step: "prerequisites", percent, detail: message });
  });
  await emit({ event: "step_complete", step: "prerequisites" });

  // Step 3: Provider Configuration (API Keys)
  await emit({ event: "step_start", step: "api-keys" });
  // Collect provider config via interactive callbacks
  const providerChoices = Object.entries(PROVIDER_LABELS).map(([value, { label, description }]) => ({
    label,
    value,
    description,
  }));
  const provider = (await requestChoice("provider", "Choose your AI provider:", providerChoices)) as ProviderName || "zen";
  const apiKey = await requestInput("api-key", `Enter your ${provider} API key:`, "key", "sk-...");

  await stepProviderConfig(state, {
    provider,
    apiKey: apiKey || "",
  }, (percent, message) => {
    emit({ event: "progress", step: "api-keys", percent, detail: message });
  });
  await emit({ event: "step_complete", step: "api-keys" });

  // Step 4: Identity
  await emit({ event: "step_start", step: "identity" });
  const principalName = await requestInput("principal-name", "What's your name?", "text", "User");
  const aiName = await requestInput("ai-name", "What would you like to name your AI?", "text", "PAI");
  
  await stepIdentity(state, {
    principalName: principalName || "User",
    aiName: aiName || "PAI",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  }, (percent, message) => {
    emit({ event: "progress", step: "identity", percent, detail: message });
  });
  await emit({ event: "step_complete", step: "identity" });

  // Step 5: Build OpenCode
  await emit({ event: "step_start", step: "repository" });
  await buildOpenCodeBinary({
    onProgress: async (message, percent) => {
      emit({ event: "progress", step: "repository", percent, detail: message });
    },
    skipIfExists: false,
  });
  await emit({ event: "step_complete", step: "repository" });

  // Step 6: Voice Setup
  await emit({ event: "step_start", step: "voice" });
  const voiceChoices = [
    { label: "No voice (text only)", value: "none", description: "Skip voice setup" },
    { label: "PAI Voice Server (Google TTS)", value: "google", description: "Use PAI voice server with Google TTS (recommended)" },
    { label: "ElevenLabs (premium voices)", value: "elevenlabs", description: "High quality AI voices" },
    { label: "macOS (built-in)", value: "macos", description: "Use macOS system voices" },
  ];
  const voiceProvider = await requestChoice("voice-provider", "Choose voice provider (optional):", voiceChoices);
  
  let voiceConfig: VoiceConfig = { enabled: false };
  if (voiceProvider && voiceProvider !== "none") {
    const voiceKey = await requestInput("voice-api-key", `Enter ${voiceProvider} API key (optional):`, "key");
    voiceConfig = {
      enabled: true,
      provider: voiceProvider as "elevenlabs" | "google" | "macos" | "none",
      apiKey: voiceKey || undefined,
      voiceId: "default",
    };
  }
  
  await stepVoice(state, voiceConfig, (percent, message) => {
    emit({ event: "progress", step: "voice", percent, detail: message });
  });
  await emit({ event: "step_complete", step: "voice" });

  // Step 7: Install PAI
  await emit({ event: "step_start", step: "configuration" });
  await stepInstallPAI(state, (percent, message) => {
    emit({ event: "progress", step: "configuration", percent, detail: message });
  });
  await emit({ event: "step_complete", step: "configuration" });
}

// ═══════════════════════════════════════════════════════════
// Helper
// ═══════════════════════════════════════════════════════════

import { exec as execCallback } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execCallback);
