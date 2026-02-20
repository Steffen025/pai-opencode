#!/usr/bin/env bun
/**
 * PAI-OpenCode Installation Wizard v2.0
 *
 * Simplified 6-step setup for Personal AI Infrastructure:
 * - 4 presets: Anthropic, ZEN PAID, ZEN FREE, Ollama
 * - OpenCode dev build as prerequisite
 * - model_tiers support for cost-aware agent routing
 * - Creates opencode.json, settings.json, and identity files
 *
 * Usage:
 *   bun run PAIOpenCodeWizard.ts    # Run the interactive wizard
 *   bun run PAIOpenCodeWizard.ts --help  # Show help and exit
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, lstatSync, symlinkSync, unlinkSync, realpathSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { homedir, userInfo } from 'os';
import { execSync } from 'child_process';
import * as readline from 'readline';
import { parse as parseYaml } from 'yaml';

// ANSI colors
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  blue: '\x1b[38;2;59;130;246m',
  green: '\x1b[38;2;34;197;94m',
  yellow: '\x1b[38;2;234;179;8m',
  red: '\x1b[38;2;239;68;68m',
  cyan: '\x1b[38;2;6;182;212m',
  gray: '\x1b[38;2;100;116;139m',
  magenta: '\x1b[38;2;168;85;247m',
  dim: '\x1b[2m',
};

// Paths
const HOME = homedir();
const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const OPENCODE_DIR = SCRIPT_DIR; // Wizard lives inside .opencode/
const PROJECT_ROOT = dirname(OPENCODE_DIR);
const PROFILES_DIR = join(OPENCODE_DIR, 'profiles');

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

const PRESETS = [
  {
    name: 'Anthropic',
    id: 'anthropic',
    profile: 'anthropic',
    description: 'Claude models — best quality, works with API key or Anthropic subscription (Pro/Max)',
    authType: 'apikey-or-oauth' as const,
    authNote: 'Set ANTHROPIC_API_KEY in your .env file, or run /connect in OpenCode to authenticate with your Anthropic subscription.',
  },
  {
    name: 'ZEN PAID',
    id: 'zen-paid',
    profile: 'zen-paid',
    description: 'Budget-friendly pay-as-you-go — privacy-preserving, no subscription',
    authType: 'oauth' as const,
    authNote: 'Run /connect in OpenCode → choose ZEN to authenticate.',
  },
  {
    name: 'ZEN FREE',
    id: 'zen-free',
    profile: 'zen',
    description: 'Free community models — no cost, data may be used for improvement',
    authType: 'none' as const,
    authNote: 'No authentication needed. Free community models.',
  },
  {
    name: 'Ollama (Local)',
    id: 'local',
    profile: 'local',
    description: 'Fully offline with local models — private, no API keys, customize models after install',
    authType: 'none' as const,
    authNote: 'No authentication needed. Make sure Ollama is running (ollama serve). Customize models in opencode.json.',
  },
];

interface PresetConfig {
  PRINCIPAL_NAME: string;
  TIMEZONE: string;
  AI_NAME: string;
  CATCHPHRASE: string;
  PRESET: (typeof PRESETS)[number];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function print(msg: string) { console.log(msg); }
function printSuccess(msg: string) { print(`  ${c.green}✓${c.reset} ${msg}`); }
function printWarning(msg: string) { print(`  ${c.yellow}!${c.reset} ${msg}`); }
function printError(msg: string) { print(`  ${c.red}✗${c.reset} ${msg}`); }
function printInfo(msg: string) { print(`  ${c.gray}→${c.reset} ${msg}`); }

function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function prompt(question: string, defaultValue?: string): Promise<string> {
  const displayDefault = defaultValue ? ` ${c.gray}[${defaultValue}]${c.reset}` : '';
  const rl = createReadline();

  return new Promise((resolve) => {
    rl.question(`  ${question}${displayDefault}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

async function promptChoice(question: string, choices: string[], defaultIdx = 0): Promise<number> {
  print(`  ${question}`);
  choices.forEach((choice, i) => {
    const marker = i === defaultIdx ? `${c.cyan}→${c.reset}` : ' ';
    print(`    ${marker} ${['A', 'B', 'C', 'D', 'E'][i]}. ${choice}`);
  });

  const rl = createReadline();
  return new Promise((resolve) => {
    rl.question(`  ${c.gray}Enter A-${String.fromCharCode(64 + choices.length)} [${String.fromCharCode(65 + defaultIdx)}]:${c.reset} `, (answer) => {
      rl.close();
      const letter = answer.trim().toUpperCase();
      const num = letter.charCodeAt(0) - 65;
      if (num >= 0 && num < choices.length) {
        resolve(num);
      } else {
        resolve(defaultIdx);
      }
    });
  });
}

function execCommand(cmd: string, options: { cwd?: string; silent?: boolean } = {}): { success: boolean; output: string; error?: string } {
  try {
    const output = execSync(cmd, {
      encoding: 'utf-8',
      cwd: options.cwd,
      stdio: options.silent ? 'pipe' : 'inherit',
    });
    return { success: true, output: (output ?? '').trim() };
  } catch (err: any) {
    return { success: false, output: '', error: err.message };
  }
}

// ============================================================================
// STEP 0: PREREQUISITES CHECK
// ============================================================================

interface PrereqCheck {
  bun: boolean;
  bunVersion: string;
  git: boolean;
}

function checkPrerequisites(): PrereqCheck {
  print('');
  print(`${c.bold}Step 0: Prerequisites Check${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);

  const results: PrereqCheck = { bun: false, bunVersion: '', git: false };

  // Check bun with version requirement (1.3.9+ required — matches OpenCode monorepo packageManager)
  try {
    const bunVersion = execSync('bun --version 2>/dev/null', { encoding: 'utf-8' }).trim();
    const versionMatch = bunVersion.match(/(\d+)\.(\d+)\.(\d+)/);
    if (versionMatch) {
      const major = parseInt(versionMatch[1]);
      const minor = parseInt(versionMatch[2]);
      const patch = parseInt(versionMatch[3]);
      if (major > 1 || (major === 1 && minor > 3) || (major === 1 && minor === 3 && patch >= 9)) {
        printSuccess(`Bun ${bunVersion} found`);
        results.bun = true;
        results.bunVersion = bunVersion;
      } else {
        printError(`Bun ${bunVersion} found — version 1.3.9+ required`);
        printInfo('Upgrade Bun: bun upgrade');
      }
    }
  } catch {
    printError('Bun not found');
    printInfo('Install Bun: curl -fsSL https://bun.sh/install | bash');
  }

  // Check git
  try {
    const gitVersion = execSync('git --version 2>/dev/null', { encoding: 'utf-8' }).trim();
    printSuccess(`${gitVersion} found`);
    results.git = true;
  } catch {
    printError('Git not found');
    printInfo('Install Git: https://git-scm.com/downloads');
  }

  return results;
}

// ============================================================================
// STEP 1: BUILD OPENCODE FROM DEV SOURCE
// ============================================================================

async function buildOpenCode(): Promise<boolean> {
  print('');
  print(`${c.bold}Step 1: Build OpenCode from Dev Source${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);
  print('');
  print(`  ${c.cyan}PAI-OpenCode requires a custom OpenCode build with model tier support${c.reset}`);
  print(`  ${c.gray}(built from our fork using Bun's native compiler — no Go needed)${c.reset}`);
  print('');

  // Check if opencode is already installed
  const whichResult = execCommand('which opencode', { silent: true });
  let existingVersion = '';

  if (whichResult.success) {
    const versionResult = execCommand('opencode --version', { silent: true });
    if (versionResult.success) {
      existingVersion = versionResult.output;
      printInfo(`Found OpenCode: ${existingVersion}`);
    }
  }

  print('');
  print('  Do you want to build OpenCode from the development branch?');
  print('');

  const choices = [
    'Yes, build now (Recommended)',
    existingVersion ? `Skip — I already have a dev build (${existingVersion})` : 'Skip — I already have a dev build',
    'Skip — I\'ll use stable (model tiers won\'t work)',
  ];

  const choice = await promptChoice('', choices, 0);

  if (choice === 1) {
    // Skip - user has dev build
    printSuccess('Using existing OpenCode installation');
    return true;
  }

  if (choice === 2) {
    // Skip - will use stable
    printWarning('Using stable release — model_tiers will not work');
    printInfo('To enable model tiers later, rebuild from dev source:');
    printInfo('  bun run .opencode/PAIOpenCodeWizard.ts');
    return true;
  }

  // Build from dev source
  print('');
  print(`${c.cyan}Building OpenCode from development branch...${c.reset}`);
  print(`${c.gray}This uses Bun's native compiler to produce a standalone binary.${c.reset}`);
  print('');

  const buildDir = '/tmp/opencode-build';
  const cloneUrl = 'https://github.com/Steffen025/opencode.git';

  try {
    // Clean up any existing build
    execCommand(`rm -rf ${buildDir}`, { silent: true });

    // Clone the repo
    printInfo('Cloning OpenCode repository...');
    const cloneResult = execCommand(
      `git clone ${cloneUrl} ${buildDir}`,
      { silent: false }
    );

    if (!cloneResult.success) {
      printError('Failed to clone repository');
      return false;
    }

    // Checkout feature/model-tiers branch (development branch with model tier support)
    printInfo('Checking out feature/model-tiers branch...');
    const checkoutResult = execCommand('git checkout feature/model-tiers', { cwd: buildDir, silent: false });

    if (!checkoutResult.success) {
      printError('Failed to checkout feature/model-tiers branch');
      return false;
    }

    // Install dependencies (monorepo workspace — must run from root)
    printInfo('Installing monorepo dependencies with bun (this may take a minute)...');
    const installResult = execCommand('bun install', { cwd: buildDir, silent: false });

    if (!installResult.success) {
      printError('Failed to install dependencies');
      return false;
    }

    // Build standalone binary using Bun's native compiler
    printInfo('Building OpenCode standalone binary with Bun compiler...');
    const buildResult = execCommand(
      'bun run ./packages/opencode/script/build.ts --single',
      { cwd: buildDir, silent: false }
    );

    if (!buildResult.success) {
      printError('Build failed');
      printInfo('Make sure you have Bun 1.3.9+ installed: bun upgrade');
      return false;
    }

    // Locate binary using deterministic platform-based path
    // Bun.build() outputs to: dist/opencode-{os}-{arch}/bin/opencode
    printInfo('Locating built binary...');
    const binaryPath = locateBuildBinary(buildDir);

    if (!binaryPath) {
      printError(`Binary not found for platform ${process.platform}-${process.arch}`);
      printInfo('Expected at: packages/opencode/dist/opencode-{os}-{arch}/bin/opencode');
      printInfo('Check build output above for errors.');
      return false;
    }

    printSuccess(`Found binary: ${binaryPath.replace(buildDir + '/', '')}`);

    // Determine install location (local or system)
    const localBin = join(HOME, '.local', 'bin');
    const usrLocalBin = '/usr/local/bin';
    let installPath: string;

    // Prefer ~/.local/bin — create it if it doesn't exist
    if (!existsSync(localBin)) {
      try {
        mkdirSync(localBin, { recursive: true });
      } catch {
        // Fall through to /usr/local/bin
      }
    }

    if (existsSync(localBin)) {
      installPath = join(localBin, 'opencode');
    } else {
      installPath = join(usrLocalBin, 'opencode');
    }

    // Copy binary to install location
    printInfo(`Installing to ${installPath}...`);
    const copyResult = execCommand(
      `cp "${binaryPath}" "${installPath}"`,
      { silent: true }
    );

    if (!copyResult.success) {
      printWarning('May need sudo to install to system path');
      printInfo('Trying with sudo...');
      const sudoResult = execCommand(
        `sudo cp "${binaryPath}" "${installPath}"`,
        { silent: false }
      );
      if (!sudoResult.success) {
        printError(`Installation failed — you can manually copy the binary:`);
        printInfo(`  cp "${binaryPath}" ~/.local/bin/opencode`);
        return false;
      }
    }

    // Make binary executable
    try {
      execSync(`chmod +x "${installPath}"`, { stdio: 'pipe' });
    } catch (e) {
      printWarning('Failed to set executable permissions');
    }

    // Verify
    const verifyResult = execCommand('opencode --version', { silent: true });
    if (verifyResult.success) {
      printSuccess(`OpenCode ${verifyResult.output} installed`);
    } else {
      printWarning('Installation may have succeeded but version check failed');
      printInfo('If "opencode" is not in PATH, add ~/.local/bin to your PATH');
    }

    // Clean up
    execCommand(`rm -rf ${buildDir}`, { silent: true });
    printSuccess('Cleaned up build directory');

    return true;
  } catch (err: any) {
    printError(`Build error: ${err.message}`);
    return false;
  }
}

/**
 * Locate the built binary using deterministic platform-based path.
 * Bun.build({ compile: true }) outputs to: dist/opencode-{os}-{arch}/bin/opencode
 */
function locateBuildBinary(buildDir: string): string | null {
  const os = process.platform;   // 'darwin', 'linux', 'win32'
  const arch = process.arch;     // 'arm64', 'x64'

  const osName = os === 'win32' ? 'windows' : os;
  const binaryName = os === 'win32' ? 'opencode.exe' : 'opencode';

  // Primary: exact platform match
  const primaryPath = join(buildDir, 'packages', 'opencode', 'dist', `opencode-${osName}-${arch}`, 'bin', binaryName);
  if (existsSync(primaryPath)) {
    return primaryPath;
  }

  // Fallback: try baseline variant (x64 without AVX2)
  const baselinePath = join(buildDir, 'packages', 'opencode', 'dist', `opencode-${osName}-${arch}-baseline`, 'bin', binaryName);
  if (existsSync(baselinePath)) {
    return baselinePath;
  }

  // Last resort: search dist directory for any matching binary
  try {
    const findResult = execCommand(
      `find packages/opencode/dist -name "${binaryName}" -type f 2>/dev/null | head -1`,
      { cwd: buildDir, silent: true }
    );
    if (findResult.success && findResult.output) {
      return join(buildDir, findResult.output);
    }
  } catch {
    // Find failed, return null
  }

  return null;
}

// ============================================================================
// STEP 2: CHOOSE SETUP PRESET
// ============================================================================

async function selectPreset(): Promise<(typeof PRESETS)[number]> {
  print('');
  print(`${c.bold}Step 2: Choose Your Setup${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);
  print('');
  print('  Choose how you want to power your AI agents:');
  print('');

  const choices = PRESETS.map(p => {
    const name = `${p.name}`;
    const desc = p.description;
    return `${c.bold}${name}${c.reset}\n      ${c.gray}${desc}${c.reset}`;
  });

  const choice = await promptChoice('', choices, 0);
  const selected = PRESETS[choice];

  print('');
  printSuccess(`Selected: ${selected.name}`);

  if (selected.authNote) {
    print('');
    print(`  ${c.bold}Authentication:${c.reset}`);
    print(`  ${c.gray}${selected.authNote}${c.reset}`);
  }

  print('');
  print(`  ${c.gray}💡 Other providers (OpenAI, Google, etc.) can be configured later in opencode.json${c.reset}`);

  return selected;
}

// ============================================================================
// STEP 3: YOUR IDENTITY
// ============================================================================

async function setupIdentity(): Promise<{ name: string; timezone: string }> {
  print('');
  print(`${c.bold}Step 3: Your Identity${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);

  const name = await prompt('What is your name?', 'User');
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  printInfo(`Detected timezone: ${detectedTimezone}`);
  const timezone = await prompt('Timezone (press Enter to accept)', detectedTimezone);

  return { name, timezone };
}

// ============================================================================
// STEP 4: YOUR AI ASSISTANT
// ============================================================================

async function setupAIAssistant(): Promise<{ name: string; catchphrase: string }> {
  print('');
  print(`${c.bold}Step 4: Your AI Assistant${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);

  const name = await prompt('Name your AI assistant', 'PAI');
  const catchphrase = await prompt('Startup catchphrase', `${name} here, ready to help.`);

  return { name, catchphrase };
}

// ============================================================================
// STEP 5: WRITE CONFIGURATION
// ============================================================================

// Profile structure from YAML
interface AgentTier {
  quick?: string;
  standard?: string;
  advanced?: string;
}

interface AgentConfig {
  model: string;
  tiers?: AgentTier;
}

interface ProfileData {
  name: string;
  description: string;
  default_model: string;
  agents: Record<string, AgentConfig>;
}

function loadProfile(profileName: string): ProfileData | null {
  const profilePath = join(PROFILES_DIR, `${profileName}.yaml`);

  if (!existsSync(profilePath)) {
    printError(`Profile not found: ${profilePath}`);
    return null;
  }

  try {
    const content = readFileSync(profilePath, 'utf-8');
    return parseYaml(content) as ProfileData;
  } catch (err: any) {
    printError(`Failed to parse profile: ${err.message}`);
    return null;
  }
}

function generateOpencodeJson(profile: ProfileData, username: string): object {
  const agentBlock: Record<string, any> = {};

  // Convert profile agents to opencode.json format
  for (const [agentName, agentConfig] of Object.entries(profile.agents)) {
    const agentEntry: Record<string, any> = {
      model: agentConfig.model,
    };

    // Add model_tiers if present
    if (agentConfig.tiers) {
      agentEntry.model_tiers = {};
      for (const [tierName, tierModel] of Object.entries(agentConfig.tiers)) {
        if (tierModel) {
          agentEntry.model_tiers[tierName] = { model: tierModel };
        }
      }
    }

    agentBlock[agentName] = agentEntry;
  }

  return {
    $schema: 'https://opencode.ai/config.json',
    theme: 'dark',
    model: profile.default_model,
    snapshot: true,
    username: username,
    agent: agentBlock,
  };
}

function generateSettingsJson(config: PresetConfig): object {
  return {
    paiVersion: '2.5-opencode',
    env: {
      PAI_DIR: OPENCODE_DIR,
      OPENCODE_MAX_OUTPUT_TOKENS: '80000',
      BASH_DEFAULT_TIMEOUT_MS: '600000',
    },
    contextFiles: [
      'skills/PAI/SKILL.md',
      'skills/PAI/SYSTEM/AISTEERINGRULES.md',
      'skills/PAI/USER/AISTEERINGRULES.md',
      'skills/PAI/USER/DAIDENTITY.md',
    ],
    daidentity: {
      name: config.AI_NAME,
      fullName: `${config.AI_NAME} - Personal AI`,
      displayName: config.AI_NAME,
      color: '#3B82F6',
      startupCatchphrase: config.CATCHPHRASE,
    },
    principal: {
      name: config.PRINCIPAL_NAME,
      timezone: config.TIMEZONE,
    },
    pai: {
      source: 'github.com/Steffen025/pai-opencode',
      upstream: 'github.com/danielmiessler/PAI',
      version: '2.5',
    },
    techStack: {
      browser: 'arc',
      terminal: 'terminal',
      packageManager: 'bun',
      language: 'TypeScript',
    },
    provider: {
      id: config.PRESET.id,
      name: config.PRESET.name,
      profile: config.PRESET.profile,
    },
  };
}

function generateDAIdentity(config: PresetConfig): string {
  return `# DA Identity & Interaction Rules

**Personal content - DO NOT commit to public repositories.**

---

## My Identity

- **Full Name:** ${config.AI_NAME} - Personal AI
- **Name:** ${config.AI_NAME}
- **Display Name:** ${config.AI_NAME}
- **Color:** #3B82F6 (Tailwind Blue-500)
- **Role:** Your AI assistant
- **Operating Environment:** Personal AI infrastructure built on OpenCode

---

## First-Person Voice (CRITICAL)

The DA should speak as itself, not about itself in third person.

| Do This | Not This |
|---------|----------|
| "for my system" / "in my architecture" | "for ${config.AI_NAME}" / "for the ${config.AI_NAME} system" |
| "I can help" / "my approach" | "${config.AI_NAME} can help" |
| "we built this together" | "the system can" |

---

## Your Information

- **Name:** ${config.PRINCIPAL_NAME}
- **Timezone:** ${config.TIMEZONE}
- **Provider:** ${config.PRESET.name}

---

## Personality & Behavior

- **Friendly and professional** - Approachable but competent
- **Adaptive** - Adjusts communication style based on context
- **Honest** - Committed to truthful communication
- **First-person voice** - Always "I" and "me", never third person

---

## Pronoun Convention

- Refer to ${config.PRINCIPAL_NAME} as **"you"** (second person)
- Refer to itself as **"I"** or **"me"** (first person)
- **NEVER** use "the user", "the principal", or generic terms

---

*Generated by PAI-OpenCode Wizard on ${new Date().toISOString().split('T')[0]}*
*Customize this file to define your AI's personality*
`;
}

function generateBasicInfo(config: PresetConfig): string {
  return `# Basic Information

- **Name:** ${config.PRINCIPAL_NAME}
- **Timezone:** ${config.TIMEZONE}
- **AI Provider:** ${config.PRESET.name}
- **AI Profile:** ${config.PRESET.profile}

---

*Generated by PAI-OpenCode Wizard*
*Update this file with your personal details*
`;
}

function generateInternContextNote(): string {
  return `# InternContext.md

**NOTE:** This file is intentionally minimal.

The Intern agent uses context files from other agents to understand PAI system behavior:
- Agent personality definitions from PAI/Components/
- Agent routing rules from PAI/SYSTEM/PAIAGENTSYSTEM.md
- Core PAI principles from PAI/SKILL.md

This file exists to satisfy the InternContext.md reference but contains no additional content, as the Intern agent's context is derived from shared PAI system files.

---

*Generated by PAI-OpenCode Wizard*
`;
}

async function writeConfiguration(config: PresetConfig): Promise<boolean> {
  print('');
  print(`${c.bold}Step 5: Writing Configuration${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);

  // Load profile
  const profile = loadProfile(config.PRESET.profile);
  if (!profile) {
    return false;
  }

  // Generate and write opencode.json
  const opencodeJson = generateOpencodeJson(profile, config.PRINCIPAL_NAME);
  writeFileSync(join(PROJECT_ROOT, 'opencode.json'), JSON.stringify(opencodeJson, null, 2));
  printSuccess('Created opencode.json (project root)');

  // Generate and write settings.json
  const settingsJson = generateSettingsJson(config);
  writeFileSync(join(OPENCODE_DIR, 'settings.json'), JSON.stringify(settingsJson, null, 2));
  printSuccess('Created settings.json (.opencode/)');

  // Ensure PAI/USER directory exists
  const userDir = join(OPENCODE_DIR, 'skills', 'PAI', 'USER');
  if (!existsSync(userDir)) {
    mkdirSync(userDir, { recursive: true });
  }

  // Generate and write DAIDENTITY.md
  const daIdentityPath = join(userDir, 'DAIDENTITY.md');
  writeFileSync(daIdentityPath, generateDAIdentity(config));
  printSuccess('Created DAIDENTITY.md');

  // Generate and write BASICINFO.md
  const basicInfoPath = join(userDir, 'BASICINFO.md');
  writeFileSync(basicInfoPath, generateBasicInfo(config));
  printSuccess('Created BASICINFO.md');

  // Generate InternContext.md note
  const internContextPath = join(userDir, 'InternContext.md');
  writeFileSync(internContextPath, generateInternContextNote());
  printSuccess('Created InternContext.md');

  // Create required directories
  const requiredDirs = [
    'MEMORY',
    'MEMORY/STATE',
    'MEMORY/LEARNING',
    'MEMORY/WORK',
    'MEMORY/LEARNING/SIGNALS',
  ];
  for (const dir of requiredDirs) {
    const dirPath = join(OPENCODE_DIR, dir);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }
  printSuccess('Created MEMORY directories');

  // Fix permissions
  fixPermissions(OPENCODE_DIR);

  return true;
}

// ============================================================================
// PERMISSIONS
// ============================================================================

function fixPermissions(targetDir: string): void {
  const info = userInfo();

  print('');
  print(`${c.bold}Fixing permissions for ${info.username}${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);

  try {
    execSync(`chmod -R 755 "${targetDir}"`, { stdio: 'pipe' });
    printSuccess('chmod -R 755 (make accessible)');

    execSync(`chown -R ${info.uid}:${info.gid} "${targetDir}"`, { stdio: 'pipe' });
    printSuccess(`chown -R to ${info.username}`);

    // Make scripts executable
    for (const pattern of ['*.ts', '*.sh']) {
      try {
        execSync(`find "${targetDir}" -name "${pattern}" -exec chmod 755 {} \\;`, { stdio: 'pipe' });
      } catch (e) { /* ignore */ }
    }
    printSuccess('Set executable permissions on scripts');
  } catch (err: any) {
    printWarning(`Permission fix may need sudo: ${err.message}`);
  }
}

// ============================================================================
// STEP 5b: SYMLINK SETUP
// ============================================================================

async function setupSymlink(): Promise<void> {
  print('');
  print(`${c.bold}Setting up ~/.opencode symlink${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);

  const homeOpencode = join(HOME, '.opencode');

  // Case 1: Nothing exists → create symlink
  if (!existsSync(homeOpencode)) {
    try {
      symlinkSync(OPENCODE_DIR, homeOpencode);
      printSuccess(`Created symlink: ~/.opencode → ${OPENCODE_DIR}`);
    } catch (err: any) {
      printWarning(`Could not create symlink: ${err.message}`);
      printInfo(`Create it manually: ln -s ${OPENCODE_DIR} ~/.opencode`);
    }
    return;
  }

  // Case 2: Symlink already exists
  try {
    const stats = lstatSync(homeOpencode);
    if (stats.isSymbolicLink()) {
      printInfo(`Symlink ~/.opencode already exists`);

      // Check if it points to the right place
      const resolvedTarget = realpathSync(homeOpencode);
      const resolvedOpencode = realpathSync(OPENCODE_DIR);
      if (resolvedTarget === resolvedOpencode) {
        printSuccess('Symlink points to this installation ✓');
      } else {
        printWarning(`Symlink points to: ${resolvedTarget}`);
        printInfo(`Expected: ${resolvedOpencode}`);

        const choice = await promptChoice('Update symlink to point to this installation?', [
          'Yes, update symlink (Recommended)',
          'No, keep existing symlink',
        ], 0);

        if (choice === 0) {
          try {
            unlinkSync(homeOpencode);
            symlinkSync(OPENCODE_DIR, homeOpencode);
            printSuccess(`Updated symlink: ~/.opencode → ${OPENCODE_DIR}`);
          } catch (err: any) {
            printError(`Failed to update symlink: ${err.message}`);
          }
        }
      }
      return;
    }
  } catch (e) {
    // lstatSync failed, treat as regular directory
  }

  // Case 3: Regular directory exists (not a symlink)
  printWarning('~/.opencode exists as a regular directory');
  print('');

  const choice = await promptChoice('How would you like to handle this?', [
    'Back up existing and create symlink (Recommended)',
    'Skip — I\'ll handle it manually',
  ], 0);

  if (choice === 0) {
    const backupPath = `${homeOpencode}.backup-${Date.now()}`;
    try {
      execCommand(`mv "${homeOpencode}" "${backupPath}"`, { silent: true });
      printSuccess(`Backed up to: ${backupPath}`);

      symlinkSync(OPENCODE_DIR, homeOpencode);
      printSuccess(`Created symlink: ~/.opencode → ${OPENCODE_DIR}`);
    } catch (err: any) {
      printError(`Failed: ${err.message}`);
      printInfo(`Manual steps:`);
      printInfo(`  mv ~/.opencode ~/.opencode.backup`);
      printInfo(`  ln -s ${OPENCODE_DIR} ~/.opencode`);
    }
  } else {
    printInfo('Skipped symlink setup');
    printInfo(`To create manually: ln -s ${OPENCODE_DIR} ~/.opencode`);
  }
}

function setupConfigSymlink(): void {
  const configSource = join(PROJECT_ROOT, 'opencode.json');
  const opencodeDir = join(PROJECT_ROOT, '.opencode');
  const symlinkTarget = join(opencodeDir, 'opencode.json');

  // Only create if source exists and .opencode dir exists
  if (!existsSync(configSource)) return;
  if (!existsSync(opencodeDir)) return;

  // Check if symlink already exists and points to the right place
  if (existsSync(symlinkTarget)) {
    try {
      const stats = lstatSync(symlinkTarget);
      if (stats.isSymbolicLink()) {
        const resolvedPath = realpathSync(symlinkTarget);
        if (resolvedPath === realpathSync(configSource)) {
          // Already correct
          return;
        }
        // Wrong target, remove and recreate
        unlinkSync(symlinkTarget);
      } else {
        // It's a real file, back it up and replace
        const backup = symlinkTarget + '.bak';
        renameSync(symlinkTarget, backup);
        printWarning(`Backed up existing .opencode/opencode.json to opencode.json.bak`);
      }
    } catch (e) {
      // Can't read, try to remove
      try { unlinkSync(symlinkTarget); } catch {}
    }
  }

  // Create relative symlink: .opencode/opencode.json → ../opencode.json
  try {
    symlinkSync('../opencode.json', symlinkTarget);
    printSuccess('Created symlink: .opencode/opencode.json → ../opencode.json');
  } catch (e: any) {
    printWarning(`Could not create config symlink: ${e.message}`);
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

function validate(): { passed: boolean; results: string[] } {
  const results: string[] = [];
  let passed = true;

  // Check opencode.json
  const opencodeJsonPath = join(PROJECT_ROOT, 'opencode.json');
  if (existsSync(opencodeJsonPath)) {
    try {
      const config = JSON.parse(readFileSync(opencodeJsonPath, 'utf-8'));
      if (config.model) {
        results.push(`${c.green}✓${c.reset} opencode.json valid (model: ${config.model})`);
      } else {
        results.push(`${c.red}✗${c.reset} opencode.json missing model field`);
        passed = false;
      }
      if (config.agent) {
        const agentCount = Object.keys(config.agent).length;
        results.push(`${c.green}✓${c.reset} Agent routing configured (${agentCount} agents)`);
      }
    } catch (e) {
      results.push(`${c.red}✗${c.reset} opencode.json invalid JSON`);
      passed = false;
    }
  } else {
    results.push(`${c.red}✗${c.reset} opencode.json not found`);
    passed = false;
  }

  // Check settings.json
  const settingsPath = join(OPENCODE_DIR, 'settings.json');
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      if (settings.principal?.name && settings.daidentity?.name && settings.provider?.id) {
        results.push(`${c.green}✓${c.reset} settings.json valid (provider: ${settings.provider.id})`);
      } else {
        results.push(`${c.red}✗${c.reset} settings.json missing required fields`);
        passed = false;
      }
    } catch (e) {
      results.push(`${c.red}✗${c.reset} settings.json invalid JSON`);
      passed = false;
    }
  } else {
    results.push(`${c.red}✗${c.reset} settings.json not found`);
    passed = false;
  }

  // Check directories
  for (const dir of ['skills', 'MEMORY', 'plugins']) {
    if (existsSync(join(OPENCODE_DIR, dir))) {
      results.push(`${c.green}✓${c.reset} ${dir}/ exists`);
    } else {
      results.push(`${c.yellow}!${c.reset} ${dir}/ missing (will be created)`);
    }
  }

  // Check PAI skill
  if (existsSync(join(OPENCODE_DIR, 'skills', 'PAI', 'SKILL.md'))) {
    results.push(`${c.green}✓${c.reset} PAI skill found`);
  } else {
    results.push(`${c.red}✗${c.reset} PAI skill missing`);
    passed = false;
  }

  return { passed, results };
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  // Show help if requested
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    print('');
    print(`${c.blue}${c.bold}PAI-OpenCode Installation Wizard v2.0${c.reset}`);
    print('');
    print('  Interactive setup for Personal AI Infrastructure');
    print('');
    print(`${c.bold}Usage:${c.reset}`);
    print('  bun run PAIOpenCodeWizard.ts           Run the interactive wizard');
    print('  bun run PAIOpenCodeWizard.ts --help    Show this help message');
    print('');
    print(`${c.bold}What it does:${c.reset}`);
    print('  1. Checks prerequisites (Bun 1.3.9+, git)');
    print('  2. Builds OpenCode from development source (Bun native compiler)');
    print('  3. Guides you through 4 preset provider choices');
    print('  4. Sets up your identity and AI assistant name');
    print('  5. Generates configuration files with model_tiers support');
    print('');
    print(`${c.bold}Presets:${c.reset}`);
    print('  A. Anthropic — Best quality, API key or subscription');
    print('  B. ZEN PAID — Budget-friendly, privacy-preserving');
    print('  C. ZEN FREE — No cost, data may be used for improvement');
    print('  D. Ollama — Fully offline, local models');
    print('');
    process.exit(0);
  }

  // Banner
  print('');
  print(`${c.blue}${c.bold}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${c.reset}`);
  print(`${c.blue}${c.bold}┃${c.reset}        ${c.cyan}PAI-OpenCode Installation Wizard v2.0${c.reset}               ${c.blue}${c.bold}┃${c.reset}`);
  print(`${c.blue}${c.bold}┃${c.reset}      ${c.gray}Personal AI Infrastructure for OpenCode${c.reset}               ${c.blue}${c.bold}┃${c.reset}`);
  print(`${c.blue}${c.bold}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${c.reset}`);

  // Step 0: Prerequisites
  const prereqs = checkPrerequisites();

  if (!prereqs.bun || !prereqs.git) {
    print('');
    printError('Missing required prerequisites');
    printInfo('Please install the missing tools and run the wizard again.');
    process.exit(1);
  }

  // Step 1: Build OpenCode
  const buildSuccess = await buildOpenCode();
  if (!buildSuccess) {
    printWarning('OpenCode build had issues — you can still continue but may encounter errors');
  }

  // Step 2: Select preset
  const preset = await selectPreset();

  // Step 3: Identity
  const { name, timezone } = await setupIdentity();

  // Step 4: AI Assistant
  const { name: aiName, catchphrase } = await setupAIAssistant();

  // Step 5: Write configuration
  const config: PresetConfig = {
    PRINCIPAL_NAME: name,
    TIMEZONE: timezone,
    AI_NAME: aiName,
    CATCHPHRASE: catchphrase,
    PRESET: preset,
  };

  const writeSuccess = await writeConfiguration(config);
  if (!writeSuccess) {
    print('');
    printError('Configuration failed');
    process.exit(1);
  }

  // Create config symlink: .opencode/opencode.json → ../opencode.json
  setupConfigSymlink();

  // Step 5b: Symlink setup
  await setupSymlink();

  // Step 6: Validate and show success
  print('');
  const { passed, results } = validate();
  print(`${c.bold}Validation${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);
  for (const r of results) print(`  ${r}`);

  print('');
  if (passed) {
    print(`${c.green}${c.bold}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${c.reset}`);
    print(`${c.green}${c.bold}┃${c.reset}              ${c.green}✓ PAI-OpenCode Installed!${c.reset}                      ${c.green}${c.bold}┃${c.reset}`);
    print(`${c.green}${c.bold}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${c.reset}`);
    print('');
    print(`  ${c.cyan}Your AI:${c.reset}     ${aiName}`);
    print(`  ${c.cyan}Principal:${c.reset}   ${name}`);
    print(`  ${c.cyan}Provider:${c.reset}    ${preset.name}`);
    print(`  ${c.cyan}Profile:${c.reset}     ${preset.profile}`);
    print('');
    print(`${c.bold}Next Steps:${c.reset}`);
    print('');
    print(`  ${c.cyan}1.${c.reset} Start OpenCode in this directory:`);
    print(`     ${c.green}opencode${c.reset}`);
    print('');

    if (preset.authType === 'oauth') {
      print(`  ${c.cyan}2.${c.reset} Authenticate with your provider:`);
      print(`     ${c.green}/connect${c.reset}`);
      print('');
    } else if (preset.authType === 'apikey-or-oauth') {
      print(`  ${c.cyan}2.${c.reset} Set up authentication (choose one):`);
      print(`     ${c.gray}Option A:${c.reset} Add ${c.green}ANTHROPIC_API_KEY=sk-...${c.reset} to ${c.cyan}.opencode/.env${c.reset}`);
      print(`     ${c.gray}Option B:${c.reset} Run ${c.green}/connect${c.reset} in OpenCode to use your Anthropic subscription`);
      print('');
    }

    print(`  ${c.cyan}3.${c.reset} ${c.bold}Deep Personalization (Recommended):${c.reset}`);
    print(`     Once OpenCode starts, run the onboarding wizard:`);
    print('');
    print(`     ${c.gray}┌──────────────────────────────────────────────────────────┐${c.reset}`);
    print(`     ${c.gray}│${c.reset} Let's do the onboarding. Guide me through setting up my ${c.gray}│${c.reset}`);
    print(`     ${c.gray}│${c.reset} personal context — my goals, values, and how I want you   ${c.gray}│${c.reset}`);
    print(`     ${c.gray}│${c.reset} to work with me.                                        ${c.gray}│${c.reset}`);
    print(`     ${c.gray}└──────────────────────────────────────────────────────────┘${c.reset}`);
    print('');
    print(`     For advanced configuration, see:`);
    print(`     ${c.cyan}.opencode/ADVANCED-SETUP.md${c.reset}`);
    print('');
  } else {
    print(`${c.red}${c.bold}✗ Installation has issues${c.reset}`);
    print(`  Check the validation results above.`);
    process.exit(1);
  }

  process.exit(0);
}

// Only execute if this is the main script (not imported)
const isMainScript = typeof Bun !== 'undefined' && Bun.main === import.meta.path;
if (isMainScript) {
  main().catch(err => {
    console.error(`${c.red}Error:${c.reset}`, err.message);
    process.exit(1);
  });
}
