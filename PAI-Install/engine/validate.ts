/**
 * PAI Installer v4.0 — Validation
 * Verifies installation completeness after all steps run.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { InstallState, ValidationCheck, InstallSummary } from "./types";
import { PAI_VERSION } from "./types";
import { homedir } from "os";

/**
 * Check if voice server is running via HTTP health check.
 */
async function checkVoiceServerHealth(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:8888/health", { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Run all validation checks against the current state.
 */
export async function runValidation(state: InstallState): Promise<ValidationCheck[]> {
	// Use v3 target paths (.opencode) instead of legacy .claude
	const paiDir = state.detection?.paiDir || join(homedir(), ".opencode");
	const configDir = state.detection?.configDir || join(homedir(), ".config", "PAI");
	const checks: ValidationCheck[] = [];

  // 1. settings.json exists and is valid JSON
  const settingsPath = join(paiDir, "settings.json");
  const settingsExists = existsSync(settingsPath);
  let settingsValid = false;
  let settings: any = null;

  if (settingsExists) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
      settingsValid = true;
    } catch {
      settingsValid = false;
    }
  }

  checks.push({
    name: "settings.json",
    passed: settingsExists && settingsValid,
    detail: settingsValid
      ? "Valid configuration file"
      : settingsExists
        ? "File exists but invalid JSON"
        : "File not found",
    critical: true,
  });

  // 2. opencode.json exists and is valid JSON
  const opencodePath = join(paiDir, "opencode.json");
  const opencodeExists = existsSync(opencodePath);
  let opencodeValid = false;

  if (opencodeExists) {
    try {
      JSON.parse(readFileSync(opencodePath, "utf-8"));
      opencodeValid = true;
    } catch {
      opencodeValid = false;
    }
  }

  checks.push({
    name: "opencode.json",
    passed: opencodeExists && opencodeValid,
    detail: opencodeValid
      ? "Valid OpenCode configuration"
      : opencodeExists
        ? "File exists but invalid JSON"
        : "File not found",
    critical: true,
  });
  if (settings) {
    checks.push({
      name: "Principal name",
      passed: !!settings.principal?.name,
      detail: settings.principal?.name ? `Set to: ${settings.principal.name}` : "Not configured",
      critical: true,
    });

    checks.push({
      name: "AI identity",
      passed: !!settings.daidentity?.name,
      detail: settings.daidentity?.name ? `Set to: ${settings.daidentity.name}` : "Not configured",
      critical: true,
    });

    checks.push({
      name: "PAI version",
      passed: !!settings.pai?.version,
      detail: settings.pai?.version ? `v${settings.pai.version}` : "Not set",
      critical: false,
    });

    checks.push({
      name: "Timezone",
      passed: !!settings.principal?.timezone,
      detail: settings.principal?.timezone || "Not configured",
      critical: false,
    });
  }

  // 3. Directory structure
  const requiredDirs = [
    { path: "skills", name: "Skills directory" },
    { path: "MEMORY", name: "Memory directory" },
    { path: "MEMORY/STATE", name: "State directory" },
    { path: "MEMORY/WORK", name: "Work directory" },
    { path: "hooks", name: "Hooks directory" },
    { path: "Plans", name: "Plans directory" },
  ];

  for (const dir of requiredDirs) {
    const fullPath = join(paiDir, dir.path);
    checks.push({
      name: dir.name,
      passed: existsSync(fullPath),
      detail: existsSync(fullPath) ? "Present" : "Missing",
      critical: dir.path === "skills" || dir.path === "MEMORY",
    });
  }

  // 4. PAI skill present
  const skillPath = join(paiDir, "skills", "PAI", "SKILL.md");
  checks.push({
    name: "PAI core skill",
    passed: existsSync(skillPath),
    detail: existsSync(skillPath) ? "Present" : "Not found — clone PAI repo to enable",
    critical: false,
  });

  // 5. ElevenLabs key stored — check all three possible locations
  const envPaths = [
    join(configDir, ".env"),
    join(paiDir, ".env"),
    join(homedir(), ".env"),
  ];
  let elevenLabsKeyStored = false;
  let elevenLabsKeyLocation = "";
  for (const ep of envPaths) {
    if (existsSync(ep)) {
      try {
        const envContent = readFileSync(ep, "utf-8");
        if (envContent.includes("ELEVENLABS_API_KEY=") &&
            !envContent.includes("ELEVENLABS_API_KEY=\n")) {
          elevenLabsKeyStored = true;
          elevenLabsKeyLocation = ep;
          break;
        }
      } catch {}
    }
  }

  checks.push({
    name: "ElevenLabs API key",
    passed: elevenLabsKeyStored,
    detail: elevenLabsKeyStored ? `Stored in ${elevenLabsKeyLocation}` : state.collected.elevenLabsKey ? "Collected but not saved" : "Not configured",
    critical: false,
  });

  // 6. DA voice configured in settings (nested under voices.main.voiceId)
  const voiceId = settings?.daidentity?.voices?.main?.voiceId;
  const voiceIdConfigured = !!voiceId;

  checks.push({
    name: "DA voice ID",
    passed: voiceIdConfigured,
    detail: voiceIdConfigured ? `Voice ID: ${voiceId.substring(0, 8)}...` : "Not configured",
    critical: false,
  });

  // 7. Voice server reachable (live HTTP health check)
  const voiceServerHealthy = await checkVoiceServerHealth();

  checks.push({
    name: "Voice server",
    passed: voiceServerHealthy,
    detail: voiceServerHealthy
      ? "Running (localhost:8888)"
      : "Not reachable — start voice server",
    critical: false,
  });

  // 8. Shell alias configured (check multiple shells)
  const shellConfigs = [
    { path: join(homedir(), ".zshrc"), name: ".zshrc" },
    { path: join(homedir(), ".bashrc"), name: ".bashrc" },
    { path: join(homedir(), ".bash_profile"), name: ".bash_profile" },
    { path: join(homedir(), ".profile"), name: ".profile" },
    { path: join(homedir(), ".config", "fish", "config.fish"), name: "config.fish" },
  ];

  let aliasConfigured = false;
  let aliasSource = "";

  for (const shell of shellConfigs) {
    if (existsSync(shell.path)) {
      try {
        const content = readFileSync(shell.path, "utf-8");
        // Check for PAI alias marker
        if (!content.includes("# PAI alias")) continue;
        
        // POSIX syntax: alias pai=...
        const hasPosixAlias = content.includes("alias pai=");
        // Fish syntax: alias pai '...' or alias pai (...)
        const hasFishAlias = /alias pai\s+['"]/.test(content);
        
        if (hasPosixAlias || hasFishAlias) {
          aliasConfigured = true;
          aliasSource = shell.name;
          break;
        }
      } catch {
        // Continue to next shell
      }
    }
  }

  checks.push({
    name: "Shell alias (pai)",
    passed: aliasConfigured,
    detail: aliasConfigured
      ? `Configured in ${aliasSource}`
      : "Not found — add to your shell config",
    critical: true,
  });

  return checks;
}

/**
 * Generate install summary from state.
 */
export function generateSummary(state: InstallState): InstallSummary {
	return {
		paiVersion: PAI_VERSION,
		principalName: state.collected.principalName || "User",
		aiName: state.collected.aiName || "PAI",
		timezone: state.collected.timezone || "UTC",
		voiceEnabled: state.completedSteps.includes("voice"),
		voiceMode: state.collected.elevenLabsKey ? "elevenlabs" : state.completedSteps.includes("voice") ? "macos-say" : "none",
		catchphrase: state.collected.catchphrase || "",
		installType: state.installType || "fresh",
		completedSteps: state.completedSteps.length,
		totalSteps: 8,
		userShell: state.detection?.userShell,
	};
}
