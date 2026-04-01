#!/usr/bin/env bun
/**
 * PAI-OpenCode Installer — Fresh Install Steps
 *
 * 7-step fresh installation flow with OpenCode-Zen as default provider.
 */

import type { InstallState } from "./types.ts";
import { PAI_VERSION } from "./types.ts";
import { buildOpenCodeBinary } from "./build-opencode.ts";
import type { BuildResult } from "./build-opencode.ts";
import { PROVIDER_MODELS, PROVIDER_LABELS } from "./provider-models.ts";
import type { ProviderName } from "./provider-models.ts";
import { existsSync, mkdirSync, writeFileSync, chmodSync, symlinkSync, unlinkSync, lstatSync, realpathSync, readFileSync, renameSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { spawnSync } from "bun";

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
	
	// Install location: repository root, not process.cwd().
	// Electron launches from PAI-Install/electron, so cwd is not the repo root.
	const installDir = resolve(import.meta.dir, "..", "..");
	const localOpencodeDir = join(installDir, ".opencode");
	const toolsDir = join(localOpencodeDir, "tools");
	const globalOpencodeLink = join(homedir(), ".opencode");

	if (!existsSync(localOpencodeDir)) {
		throw new Error(`Repository .opencode directory not found at ${localOpencodeDir}`);
	}
	
	// Create local .opencode directory structure (including all dirs validate.ts checks)
	const dirsToCreate = [
		localOpencodeDir,
		toolsDir,
		join(localOpencodeDir, "skills"),
		join(localOpencodeDir, "MEMORY"),
		join(localOpencodeDir, "MEMORY", "STATE"),
		join(localOpencodeDir, "MEMORY", "WORK"),
		join(localOpencodeDir, "hooks"),
		join(localOpencodeDir, "Plans"),
	];
	for (const dir of dirsToCreate) {
		mkdirSync(dir, { recursive: true });
	}
	onProgress(92, "Created local directory structure...");
	
	// Generate settings.json (without API keys - those go in .env)
	const settings = {
		principal: {
			name: state.collected.principalName || "User",
			timezone: state.collected.timezone || "UTC",
		},
		daidentity: {
			name: state.collected.aiName || "PAI",
			// Legacy flat field — read by getIdentity() in identity.ts until reader migration lands
			voiceId: state.collected.voiceId || "",
			// Nested schema — read by validate.ts and future callers
			// Note: actions.ts will replace voices.main with full voice settings
			// (voiceId, stability, similarityBoost, style, speed) during voice setup
			voices: {
				main: {
					voiceId: state.collected.voiceId || "",
				},
			},
		},
		pai: {
			version: PAI_VERSION,
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
	const voiceEnvVar = state.collected.voiceProvider === "google" ? "GOOGLE_API_KEY" :
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
		if (state.collected.voiceProvider === "google") {
			envContent += `GOOGLE_TTS_API_KEY=${state.collected.voiceApiKey}\n`;
		}
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
	onProgress(96, "Generated opencode.json...");

	// Install runtime dependencies needed by .opencode/tools scripts (e.g. yaml in switch-provider.ts)
	onProgress(97, "Installing PAI runtime dependencies...");
	const rootInstall = spawnSync({
		cmd: ["bun", "install"],
		cwd: installDir,
		stdout: "pipe",
		stderr: "pipe",
	});
	if (rootInstall.exitCode !== 0) {
		const err = rootInstall.stderr.toString().trim() || rootInstall.stdout.toString().trim();
		throw new Error(`Failed to install repository dependencies: ${err}`);
	}

	const opencodeInstall = spawnSync({
		cmd: ["bun", "install"],
		cwd: localOpencodeDir,
		stdout: "pipe",
		stderr: "pipe",
	});
	if (opencodeInstall.exitCode !== 0) {
		const err = opencodeInstall.stderr.toString().trim() || opencodeInstall.stdout.toString().trim();
		throw new Error(`Failed to install .opencode dependencies: ${err}`);
	}

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
				if (realpathSync(globalOpencodeLink) === localOpencodeDir) {
					console.warn("PAI install directory already matches ~/.opencode; no symlink changes needed.");
				} else {
				// It's a real directory — back it up and replace it so validation reads the new install.
				const backupPath = `${globalOpencodeLink}.backup-${Date.now()}`;
				renameSync(globalOpencodeLink, backupPath);
				symlinkSync(localOpencodeDir, globalOpencodeLink, "dir");
				console.warn(`Warning: Existing ~/.opencode directory moved to ${backupPath}`);
				}
			} else {
				// Regular file (not a symlink or directory) — replace it with the symlink.
				unlinkSync(globalOpencodeLink);
				symlinkSync(localOpencodeDir, globalOpencodeLink, "dir");
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
	
	// Write shell alias so `pai` command works in new terminals
	onProgress(99, "Configuring shell alias...");
	const shellPath = process.env.SHELL || "/bin/zsh";
	const shellName = shellPath.split("/").pop() || "zsh";

	const shellConfigMap: Record<string, string> = {
		zsh:  join(homedir(), ".zshrc"),
		bash: join(homedir(), ".bashrc"),
		fish: join(homedir(), ".config", "fish", "config.fish"),
	};
	const shellConfig = shellConfigMap[shellName] ?? join(homedir(), ".zshrc");

	// Build shell-specific alias/function block.
	// POSIX shells use "$@"; fish uses $argv and function/end syntax.
	const escapedInstallDir = installDir.replaceAll('"', '\\"');
	const marker = "# PAI shell setup";
	const endMarker = "# end PAI shell setup";
	const aliasBlock = shellName === "fish"
		? `set -gx PATH $HOME/.bun/bin $HOME/.local/bin $PATH\n\nfunction opencode\n\tif test -x "$HOME/.local/bin/opencode"\n\t\t$HOME/.local/bin/opencode $argv\n\telse if test -x "$HOME/.opencode/tools/opencode"\n\t\t$HOME/.opencode/tools/opencode $argv\n\telse\n\t\tcommand opencode $argv\n\tend\nend\n\nfunction pai\n\tset -l __pai_oldpwd (pwd)\n\tset -l __pai_bun "$HOME/.bun/bin/bun"\n\tcd "${escapedInstallDir}"\n\tif test -x $__pai_bun\n\t\t$__pai_bun run .opencode/PAI/Tools/pai.ts $argv\n\telse\n\t\tbun run .opencode/PAI/Tools/pai.ts $argv\n\tend\n\tset -l __pai_status $status\n\tcd $__pai_oldpwd\n\treturn $__pai_status\nend`
		: `export PATH="$HOME/.bun/bin:$HOME/.local/bin:$PATH"\n\nopencode() {\n  if [ -x "$HOME/.local/bin/opencode" ]; then\n    "$HOME/.local/bin/opencode" "$@"\n  elif [ -x "$HOME/.opencode/tools/opencode" ]; then\n    "$HOME/.opencode/tools/opencode" "$@"\n  else\n    command opencode "$@"\n  fi\n}\n\npai() {\n  (cd "${escapedInstallDir}" &&\n    if [ -x "$HOME/.bun/bin/bun" ]; then\n      "$HOME/.bun/bin/bun" run .opencode/PAI/Tools/pai.ts "$@"\n    else\n      bun run .opencode/PAI/Tools/pai.ts "$@"\n    fi\n  )\n}`;

	try {
		// Ensure parent directory exists (matters for fish: ~/.config/fish/ may be absent)
		mkdirSync(dirname(shellConfig), { recursive: true });

		const existing = existsSync(shellConfig)
			? readFileSync(shellConfig, "utf-8")
			: "";

		let content = existing;
		content = content.replace(/\n?# PAI shell setup — added by PAI installer[\s\S]*?# end PAI shell setup\n?/g, "");
		content = content.replace(
			/\n?#\s*PAI\s*(?:alias|shell\s*setup|setup|installer|installed|PAI)[^\n]*[\s\S]*?(?=\n(?:#|alias\b|export\b|set\b|source\b|pai\(\)|opencode\(\)|function\s+pai\b|function\s+opencode\b|function\s+\w+\b)|$)/gi,
			""
		);
		content = content.replace(
			/^pai\(\)\s*\{[\s\S]*?^\}\s*(?=\n(?:#|alias\b|export\b|set\b|source\b|pai\(\)|opencode\(\)|function\s+pai\b|function\s+opencode\b|function\s+\w+\b)|$)\n?/gm,
			""
		);
		content = content.replace(
			/^opencode\(\)\s*\{[\s\S]*?^\}\s*(?=\n(?:#|alias\b|export\b|set\b|source\b|pai\(\)|opencode\(\)|function\s+pai\b|function\s+opencode\b|function\s+\w+\b)|$)\n?/gm,
			""
		);
		content = content.replace(
			/^function\s+pai\s*$[\s\S]*?^end\s*(?=\n(?:#|alias\b|export\b|set\b|source\b|pai\(\)|opencode\(\)|function\s+pai\b|function\s+opencode\b|function\s+\w+\b)|$)\n?/gm,
			""
		);
		content = content.replace(
			/^function\s+opencode\s*$[\s\S]*?^end\s*(?=\n(?:#|alias\b|export\b|set\b|source\b|pai\(\)|opencode\(\)|function\s+pai\b|function\s+opencode\b|function\s+\w+\b)|$)\n?/gm,
			""
		);
		content = content.replace(/^alias pai=.*\n?/gm, "");
		content = content.replace(/^alias pai\s+.*\n?/gm, "");

		content = content.trimEnd() + `\n\n${marker} — added by PAI installer\n${aliasBlock}\n${endMarker}\n`;
		writeFileSync(shellConfig, content.endsWith("\n") ? content : `${content}\n`);
	} catch (err) {
		console.error(`Warning: Could not write shell alias to ${shellConfig}: ${err}`);
		console.error(`Add manually: ${marker} — added by PAI installer\n${aliasBlock.trim()}\n${endMarker}`);
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
  const prereqResult = await stepPrerequisites(state, (percent, message) => {
    emit({ event: "progress", step: "prerequisites", percent, detail: message });
  });
  // Emit tool check results to chat so user sees what was found
  const gitStatus = prereqResult.git
    ? `✓ Git ${prereqResult.gitVersion || "found"}`
    : "✗ Git not found — install via xcode-select --install";
  const bunStatus = prereqResult.bun
    ? `✓ Bun ${prereqResult.bunVersion || "found"}`
    : "✗ Bun not found — install via https://bun.sh/install";
  await emit({ event: "message", content: `Prerequisites checked:\n  ${gitStatus}\n  ${bunStatus}` });
  if (!prereqResult.git || !prereqResult.bun) {
    await emit({ event: "message", content: "⚠ Missing prerequisites detected. Please install the tools listed above and re-run the installer." });
  }
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

  const providerEnvMap: Record<ProviderName, string[]> = {
    anthropic: ["ANTHROPIC_API_KEY", "API_KEY"],
    openai: ["OPENAI_API_KEY", "API_KEY"],
    openrouter: ["OPENROUTER_API_KEY", "API_KEY"],
    zen: ["ZEN_API_KEY", "API_KEY"],
  };
  const requiredProviders = new Set<ProviderName>(["openai", "anthropic", "openrouter"]);

  let apiKey = "";
  if (requiredProviders.has(provider)) {
    apiKey = await requestInput("api-key", `Enter your ${provider} API key:`, "key", "sk-...");
  }

  const envCandidates = providerEnvMap[provider] || ["API_KEY"];
  const envKey = envCandidates.map((name) => process.env[name]).find(Boolean) || "";
  const selectedApiKey = apiKey.trim() || envKey;

  if (requiredProviders.has(provider) && !selectedApiKey) {
    throw new Error(`Provider ${provider} requires an API key. Provide --api-key or set ${envCandidates.join("/")}.`);
  }

  await stepProviderConfig(state, {
    provider,
    apiKey: selectedApiKey,
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
  const buildResult = await buildOpenCodeBinary({
    onProgress: async (message, percent) => {
      emit({ event: "progress", step: "repository", percent, detail: message });
    },
    skipIfExists: true, // Skip rebuild if binary already exists — prevents 20-30min hang on re-installs
  });
  if (buildResult.skipped) {
    await emit({ event: "message", content: `OpenCode binary already exists — skipping build (${buildResult.binaryPath || "found"}).` });
  } else if (buildResult.success) {
    await emit({ event: "message", content: `OpenCode binary built successfully (${buildResult.binaryPath || "installed"}).` });
  } else {
    await emit({ event: "message", content: `⚠ OpenCode build failed: ${buildResult.error || "unknown error"}. Build manually: git clone https://github.com/Steffen025/opencode.git && cd opencode && git checkout feature/model-tiers && bun install && bun run ./packages/opencode/script/build.ts --single` });
  }
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

  // Step 8: Validation — run checks and broadcast results so the final step completes
  await emit({ event: "step_start", step: "validation" });
  try {
    const { runValidation } = await import("./validate.ts");
    const checks = await runValidation(state);
    const passed = checks.filter(c => c.passed).length;
    const total = checks.length;
    const failed = checks.filter(c => !c.passed && c.critical);
    await emit({ event: "validation_result", checks });
    if (failed.length > 0) {
      await emit({ event: "message", content: `⚠ ${failed.length} critical check(s) failed. Review the validation report above.` });
    } else {
      await emit({ event: "message", content: `✓ Validation complete: ${passed}/${total} checks passed.` });
    }
  } catch (err: any) {
    await emit({ event: "message", content: `Validation skipped: ${err?.message || "unknown error"}` });
  }
  await emit({ event: "step_complete", step: "validation" });
}

// ═══════════════════════════════════════════════════════════
// Helper
// ═══════════════════════════════════════════════════════════

import { exec as execCallback } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execCallback);
