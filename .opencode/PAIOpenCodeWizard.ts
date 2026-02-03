#!/usr/bin/env bun
/**
 * PAI-OpenCode Installation Wizard
 *
 * Interactive setup that walks you through personalizing your PAI-OpenCode:
 * - Selects your AI provider (Anthropic, OpenAI, Local, ZEN free)
 * - Sets your name and timezone
 * - Names your AI assistant
 * - Configures voice settings (optional)
 * - Creates opencode.json and settings.json
 * - Fixes permissions
 *
 * Based on Daniel Miessler's PAIInstallWizard.ts, adapted for OpenCode architecture.
 *
 * Usage:
 *   bun run PAIOpenCodeWizard.ts    # Run the interactive wizard
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir, userInfo } from 'os';
import { execSync } from 'child_process';
import * as readline from 'readline';

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
};

// Paths - OpenCode uses .opencode instead of .claude
const HOME = homedir();
const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const OPENCODE_DIR = SCRIPT_DIR; // Wizard lives inside .opencode/
const PROJECT_ROOT = dirname(OPENCODE_DIR);
const SHELL_RC = join(HOME, process.env.SHELL?.includes('zsh') ? '.zshrc' : '.bashrc');

// Provider configurations
interface ProviderConfig {
  name: string;
  id: string;
  defaultModel: string;
  description: string;
  authType: 'oauth' | 'apikey' | 'none';  // oauth = subscription login, apikey = env var, none = free
  envVar?: string;
  authNote?: string;  // Explanation shown after selection
}

const PROVIDERS: ProviderConfig[] = [
  // === TOP TIER: OAuth Login Support ===
  {
    name: 'Anthropic (Claude)',
    id: 'anthropic',
    defaultModel: 'anthropic/claude-sonnet-4-5',
    description: 'Claude models - Recommended for best PAI experience',
    authType: 'oauth',
    envVar: 'ANTHROPIC_API_KEY',
    authNote: `You have two options:
     ${c.cyan}Option A:${c.reset} Anthropic Max subscription (recommended)
               Run ${c.green}/connect${c.reset} in OpenCode to authenticate.
     ${c.cyan}Option B:${c.reset} API Key
               Set ANTHROPIC_API_KEY in your environment.`,
  },
  {
    name: 'OpenAI (GPT-4)',
    id: 'openai',
    defaultModel: 'openai/gpt-4o',
    description: 'GPT-4 and GPT-4o models',
    authType: 'oauth',
    envVar: 'OPENAI_API_KEY',
    authNote: `You have two options:
     ${c.cyan}Option A:${c.reset} ChatGPT Plus/Pro subscription
               Run ${c.green}/connect${c.reset} in OpenCode to authenticate.
     ${c.cyan}Option B:${c.reset} API Key
               Set OPENAI_API_KEY in your environment.`,
  },
  // === FAST INFERENCE: API Key Required ===
  {
    name: 'Google (Gemini)',
    id: 'google',
    defaultModel: 'google/gemini-2.5-pro',
    description: 'Gemini Pro and Flash models',
    authType: 'apikey',
    envVar: 'GOOGLE_API_KEY',
    authNote: `Set ${c.cyan}GOOGLE_API_KEY${c.reset} in your environment.
     Get your API key at: https://aistudio.google.com/apikey`,
  },
  {
    name: 'Groq (Ultra Fast)',
    id: 'groq',
    defaultModel: 'groq/llama-3.3-70b-versatile',
    description: 'Lightning-fast inference with Llama, Mixtral',
    authType: 'apikey',
    envVar: 'GROQ_API_KEY',
    authNote: `Set ${c.cyan}GROQ_API_KEY${c.reset} in your environment.
     Get your API key at: https://console.groq.com/keys`,
  },
  // === ENTERPRISE: API Key Required ===
  {
    name: 'AWS Bedrock',
    id: 'bedrock',
    defaultModel: 'bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0',
    description: 'Claude, Llama via AWS credentials',
    authType: 'apikey',
    envVar: 'AWS_ACCESS_KEY_ID',
    authNote: `Configure AWS credentials:
     ${c.cyan}AWS_ACCESS_KEY_ID${c.reset} and ${c.cyan}AWS_SECRET_ACCESS_KEY${c.reset}
     Optional: ${c.cyan}AWS_REGION${c.reset} (default: us-east-1)`,
  },
  {
    name: 'Azure OpenAI',
    id: 'azure',
    defaultModel: 'azure/gpt-4o',
    description: 'GPT models via Azure deployment',
    authType: 'apikey',
    envVar: 'AZURE_OPENAI_API_KEY',
    authNote: `Set ${c.cyan}AZURE_OPENAI_API_KEY${c.reset} and ${c.cyan}AZURE_OPENAI_ENDPOINT${c.reset}
     in your environment.`,
  },
  // === FREE / LOCAL OPTIONS ===
  {
    name: 'ZEN (Free)',
    id: 'zen',
    defaultModel: 'opencode/grok-code',
    description: 'Free tier with community models - No API key needed',
    authType: 'none',
    authNote: `${c.green}No authentication required.${c.reset} Free community models.
     Great for trying out PAI-OpenCode.`,
  },
  {
    name: 'Local (Ollama)',
    id: 'ollama',
    defaultModel: 'ollama/llama3.3',
    description: 'Run models locally - 100% private',
    authType: 'none',
    authNote: `${c.green}No API key needed.${c.reset}
     Make sure Ollama is running: ${c.cyan}ollama serve${c.reset}
     Download models: ${c.cyan}ollama pull llama3.3${c.reset}`,
  },
];

// Voice deferred to v1.1 - keeping structure for future use
const DEFAULT_VOICES = {
  male: 'pNInz6obpgDQGcFmaJgB',      // Adam (ElevenLabs)
  female: '21m00Tcm4TlvDq8ikWAM',    // Rachel (ElevenLabs)
  neutral: 'ErXwobaYiN019PkySvjV',   // Antoni (ElevenLabs)
};

interface InstallConfig {
  PRINCIPAL_NAME: string;
  TIMEZONE: string;
  AI_NAME: string;
  CATCHPHRASE: string;
  PROVIDER: ProviderConfig;
  VOICE_TYPE?: 'male' | 'female' | 'neutral';  // Deferred to v1.1
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
    print(`    ${marker} ${i + 1}. ${choice}`);
  });

  const rl = createReadline();
  return new Promise((resolve) => {
    rl.question(`  ${c.gray}Enter 1-${choices.length} [${defaultIdx + 1}]:${c.reset} `, (answer) => {
      rl.close();
      const num = parseInt(answer.trim()) || (defaultIdx + 1);
      resolve(Math.max(0, Math.min(choices.length - 1, num - 1)));
    });
  });
}

// ============================================================================
// PERMISSIONS
// ============================================================================

function fixPermissions(targetDir: string): void {
  if (process.platform === 'win32') {
    return;
  }
  
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
// BUN CHECK
// ============================================================================

function checkBun(): boolean {
  print('');
  print(`${c.bold}Checking Bun Runtime${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);

  try {
    const bunVersion = execSync('bun --version', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    printSuccess(`Bun ${bunVersion} found`);
    return true;
  } catch {
    const installCmd = process.platform === 'win32' 
    ? 'powershell -c "irm bun.sh/install.ps1 | iex"' 
    : 'curl -fsSL https://bun.sh/install | bash';
    printInfo(`Install Bun: ${installCmd}`);
  }
}

// ============================================================================
// CONFIGURATION GENERATION
// ============================================================================

function generateOpencodeJson(config: InstallConfig): object {
  // NOTE: OpenCode validates its config schema strictly.
  // Custom PAI fields go in .opencode/settings.json instead.
  return {
    "$schema": "https://opencode.ai/config.json",
    "theme": "dark",
    "model": config.PROVIDER.defaultModel,
    "snapshot": true,
    "username": config.PRINCIPAL_NAME
  };
}

function generateSettingsJson(config: InstallConfig): object {
  const VOICE_ID = DEFAULT_VOICES[config.VOICE_TYPE || 'male'];

  return {
    "paiVersion": "2.4-opencode",
    "env": {
      "PAI_DIR": OPENCODE_DIR,
      "OPENCODE_MAX_OUTPUT_TOKENS": "80000",
      "BASH_DEFAULT_TIMEOUT_MS": "600000"
    },
    "contextFiles": [
      "skills/PAI/SKILL.md",
      "skills/PAI/SYSTEM/AISTEERINGRULES.md",
      "skills/PAI/USER/AISTEERINGRULES.md",
      "skills/PAI/USER/DAIDENTITY.md"
    ],
    "daidentity": {
      "name": config.AI_NAME,
      "fullName": `${config.AI_NAME} - Personal AI`,
      "displayName": config.AI_NAME,
      "color": "#3B82F6",
      "voiceId": VOICE_ID,
      "voice": {
        "stability": 0.35,
        "similarity_boost": 0.80,
        "style": 0.90,
        "speed": 1.1,
        "use_speaker_boost": true,
        "volume": 0.8
      },
      "startupCatchphrase": config.CATCHPHRASE
    },
    "principal": {
      "name": config.PRINCIPAL_NAME,
      "timezone": config.TIMEZONE
    },
    "pai": {
      "source": "github.com/Steffen025/pai-opencode",
      "upstream": "github.com/danielmiessler/PAI",
      "version": "2.4"
    },
    "techStack": {
      "browser": "arc",
      "terminal": "terminal",
      "packageManager": "bun",
      "language": "TypeScript"
    },
    "provider": {
      "id": config.PROVIDER.id,
      "name": config.PROVIDER.name,
      "model": config.PROVIDER.defaultModel
    }
  };
}

function generateDAIdentity(config: InstallConfig): string {
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
- **Provider:** ${config.PROVIDER.name}

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

function generateBasicInfo(config: InstallConfig): string {
  return `# Basic Information

- **Name:** ${config.PRINCIPAL_NAME}
- **Timezone:** ${config.TIMEZONE}
- **AI Provider:** ${config.PROVIDER.name}
- **AI Model:** ${config.PROVIDER.defaultModel}

---

*Generated by PAI-OpenCode Wizard*
*Update this file with your personal details*
`;
}

// ============================================================================
// VALIDATION
// ============================================================================

function validate(): { passed: boolean; results: string[] } {
  const results: string[] = [];
  let passed = true;

  // Check opencode.json (OpenCode's config - no custom fields allowed)
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
    } catch (e) {
      results.push(`${c.red}✗${c.reset} opencode.json invalid JSON`);
      passed = false;
    }
  } else {
    results.push(`${c.red}✗${c.reset} opencode.json not found`);
    passed = false;
  }

  // Check settings.json (PAI-OpenCode config - stores all custom fields)
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
  print('');
  print(`${c.blue}${c.bold}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${c.reset}`);
  print(`${c.blue}${c.bold}┃${c.reset}           ${c.cyan}PAI-OpenCode Installation Wizard${c.reset}                  ${c.blue}${c.bold}┃${c.reset}`);
  print(`${c.blue}${c.bold}┃${c.reset}      ${c.gray}Personal AI Infrastructure for OpenCode${c.reset}               ${c.blue}${c.bold}┃${c.reset}`);
  print(`${c.blue}${c.bold}┃${c.reset}              ${c.magenta}Based on PAI v2.4${c.reset}                            ${c.blue}${c.bold}┃${c.reset}`);
  print(`${c.blue}${c.bold}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${c.reset}`);

  // Step 1: Check Bun
  if (!checkBun()) {
    process.exit(1);
  }

  // Step 2: Welcome
  print('');
  print(`${c.bold}Welcome to PAI-OpenCode Setup${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);
  print(`  PAI-OpenCode brings Daniel Miessler's Personal AI Infrastructure`);
  print(`  to OpenCode - the provider-agnostic AI coding assistant.`);
  print('');
  print(`  This wizard will:`);
  print(`    1. Configure your AI provider`);
  print(`    2. Set up your identity`);
  print(`    3. Create configuration files`);
  print(`    4. Prepare for deep personalization (optional)`);
  print('');

  // Step 3: Provider Selection
  print(`${c.bold}Step 1: Choose Your AI Provider${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);

  const providerChoices = PROVIDERS.map(p => `${p.name} - ${c.gray}${p.description}${c.reset}`);
  const providerIdx = await promptChoice('Which AI provider will you use?', providerChoices, 0);
  const selectedProvider = PROVIDERS[providerIdx];

  printSuccess(`Selected: ${selectedProvider.name}`);

  if (selectedProvider.authNote) {
    print('');
    print(`  ${c.bold}Authentication:${c.reset}`);
    print(selectedProvider.authNote);
  }

  // Step 4: Identity
  print('');
  print(`${c.bold}Step 2: Your Identity${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);

  const PRINCIPAL_NAME = await prompt('What is your name?', 'User');
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  printInfo(`Detected timezone: ${detectedTimezone}`);
  const TIMEZONE = await prompt('Timezone (press Enter to accept)', detectedTimezone);

  // Step 5: AI Identity
  print('');
  print(`${c.bold}Step 3: Your AI Assistant${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);

  const AI_NAME = await prompt('Name your AI assistant', 'PAI');
  const CATCHPHRASE = await prompt('Startup catchphrase', `${AI_NAME} here, ready to help.`);

  // Voice deferred to v1.1
  const VOICE_TYPE: 'male' | 'female' | 'neutral' = 'male';

  const config: InstallConfig = {
    PRINCIPAL_NAME,
    TIMEZONE,
    AI_NAME,
    CATCHPHRASE,
    PROVIDER: selectedProvider,
    VOICE_TYPE,
  };

  // Step 4: Write Configuration Files
  print('');
  print(`${c.bold}Step 4: Writing Configuration${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);

  // opencode.json (project root)
  const opencodeJson = generateOpencodeJson(config);
  writeFileSync(join(PROJECT_ROOT, 'opencode.json'), JSON.stringify(opencodeJson, null, 2));
  printSuccess('Created opencode.json (project root)');

  // settings.json (.opencode/)
  const settingsJson = generateSettingsJson(config);
  writeFileSync(join(OPENCODE_DIR, 'settings.json'), JSON.stringify(settingsJson, null, 2));
  printSuccess('Created settings.json (.opencode/)');

  // DAIDENTITY.md
  const daIdentityPath = join(OPENCODE_DIR, 'skills', 'PAI', 'USER', 'DAIDENTITY.md');
  writeFileSync(daIdentityPath, generateDAIdentity(config));
  printSuccess('Created DAIDENTITY.md');

  // BASICINFO.md
  const basicInfoPath = join(OPENCODE_DIR, 'skills', 'PAI', 'USER', 'BASICINFO.md');
  writeFileSync(basicInfoPath, generateBasicInfo(config));
  printSuccess('Created BASICINFO.md');

  // Create required directories
  const requiredDirs = [
    'MEMORY',
    'MEMORY/STATE',
    'MEMORY/LEARNING',
    'MEMORY/WORK',
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

  // Step 8: Validate
  print('');
  const { passed, results } = validate();
  print(`${c.bold}Validation${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);
  for (const r of results) print(`  ${r}`);

  // Step 9: Success Message
  print('');
  if (passed) {
    print(`${c.green}${c.bold}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${c.reset}`);
    print(`${c.green}${c.bold}┃${c.reset}              ${c.green}✓ PAI-OpenCode Installed!${c.reset}                      ${c.green}${c.bold}┃${c.reset}`);
    print(`${c.green}${c.bold}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${c.reset}`);
    print('');
    print(`  ${c.cyan}Your AI:${c.reset}     ${AI_NAME}`);
    print(`  ${c.cyan}Principal:${c.reset}   ${PRINCIPAL_NAME}`);
    print(`  ${c.cyan}Provider:${c.reset}    ${selectedProvider.name}`);
    print(`  ${c.cyan}Model:${c.reset}       ${selectedProvider.defaultModel}`);
    print('');
    print(`${c.bold}Next Steps:${c.reset}`);
    print('');
    print(`  ${c.cyan}1.${c.reset} Start OpenCode in this directory:`);
    print(`     ${c.green}opencode${c.reset}`);
    print('');
    print(`  ${c.cyan}2.${c.reset} ${c.bold}Deep Personalization (Recommended):${c.reset}`);
    print(`     Once OpenCode starts, paste this prompt for full personalization:`);
    print('');
    print(`     ${c.gray}┌──────────────────────────────────────────────────────────┐${c.reset}`);
    print(`     ${c.gray}│${c.reset} Let's do the onboarding. Guide me through setting up my ${c.gray}│${c.reset}`);
    print(`     ${c.gray}│${c.reset} personal context - my name, my goals, my values, and    ${c.gray}│${c.reset}`);
    print(`     ${c.gray}│${c.reset} how I want you to behave. Create the TELOS and identity ${c.gray}│${c.reset}`);
    print(`     ${c.gray}│${c.reset} files that make this AI mine.                           ${c.gray}│${c.reset}`);
    print(`     ${c.gray}└──────────────────────────────────────────────────────────┘${c.reset}`);
    print('');
    print(`     This 10-15 minute wizard will set up your complete TELOS framework:`);
    print(`     • Mission, Goals, Challenges`);
    print(`     • Values, Beliefs, Narratives`);
    print(`     • Work style, Preferences`);
    print('');
  } else {
    print(`${c.red}${c.bold}✗ Installation has issues${c.reset}`);
    print(`  Check the validation results above.`);
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(`${c.red}Error:${c.reset}`, err.message);
  process.exit(1);
});
