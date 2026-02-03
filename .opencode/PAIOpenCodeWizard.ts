#!/usr/bin/env bun
/**
 * PAI-OpenCode Installation Wizard (Cross-Platform Version)
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

const HOME = homedir();
const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1'); // Fix Windows drive letters
const OPENCODE_DIR = SCRIPT_DIR; 
const PROJECT_ROOT = dirname(OPENCODE_DIR);

// Provider configurations
interface ProviderConfig {
  name: string;
  id: string;
  defaultModel: string;
  description: string;
  authType: 'oauth' | 'apikey' | 'none';
  envVar?: string;
  authNote?: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: 'Anthropic (Claude)',
    id: 'anthropic',
    defaultModel: 'anthropic/claude-3-5-sonnet-latest',
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
  {
    name: 'Google (Gemini)',
    id: 'google',
    defaultModel: 'google/gemini-2.0-pro-exp-02-05',
    description: 'Gemini Pro and Flash models',
    authType: 'apikey',
    envVar: 'GOOGLE_API_KEY',
    authNote: `Set ${c.cyan}GOOGLE_API_KEY${c.reset} in your environment.
     Get your API key at: https://aistudio.google.com/apikey`,
  },
  {
    name: 'ZEN (Free)',
    id: 'zen',
    defaultModel: 'opencode/grok-code',
    description: 'Free tier with community models - No API key needed',
    authType: 'none',
    authNote: `${c.green}No authentication required.${c.reset} Free community models.`,
  },
  {
    name: 'Local (Ollama)',
    id: 'ollama',
    defaultModel: 'ollama/llama3.3',
    description: 'Run models locally - 100% private',
    authType: 'none',
    authNote: `${c.green}No API key needed.${c.reset}
     Make sure Ollama is running: ${c.cyan}ollama serve${c.reset}`,
  },
];

const DEFAULT_VOICES = {
  male: 'pNInz6obpgDQGcFmaJgB',
  female: '21m00Tcm4TlvDq8ikWAM',
  neutral: 'ErXwobaYiN019PkySvjV',
};

interface InstallConfig {
  PRINCIPAL_NAME: string;
  TIMEZONE: string;
  AI_NAME: string;
  CATCHPHRASE: string;
  PROVIDER: ProviderConfig;
  VOICE_TYPE?: 'male' | 'female' | 'neutral';
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
    print(`     ${marker} ${i + 1}. ${choice}`);
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
// PERMISSIONS (Fixed for Windows)
// ============================================================================

function fixPermissions(targetDir: string): void {
  if (process.platform === 'win32') {
    printInfo('Skipping Unix chmod/chown on Windows.');
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
  } catch (err: any) {
    printWarning(`Permission fix may need sudo: ${err.message}`);
  }
}

// ============================================================================
// BUN CHECK (Fixed for Windows)
// ============================================================================

function checkBun(): boolean {
  print('');
  print(`${c.bold}Checking Bun Runtime${c.reset}`);
  print(`${c.gray}─────────────────────────────────────────────────${c.reset}`);

  try {
    // Removed the Unix redirect which breaks on Windows CMD/PS
    const bunVersion = execSync('bun --version', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    printSuccess(`Bun ${bunVersion} found`);
    return true;
  } catch {
    printError('Bun not found');
    const installMsg = process.platform === 'win32' 
      ? 'powershell -c "irm bun.sh/install.ps1 | iex"'
      : 'curl -fsSL https://bun.sh/install | bash';
    printInfo(`Install Bun: ${installMsg}`);
    return false;
  }
}

// ============================================================================
// CONFIGURATION GENERATION
// ============================================================================

function generateOpencodeJson(config: InstallConfig): object {
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
      "startupCatchphrase": config.CATCHPHRASE
    },
    "principal": {
      "name": config.PRINCIPAL_NAME,
      "timezone": config.TIMEZONE
    },
    "provider": {
      "id": config.PROVIDER.id,
      "name": config.PROVIDER.name,
      "model": config.PROVIDER.defaultModel
    }
  };
}

// ... (Rest of the Markdown generators remain same as your original) ...
function generateDAIdentity(config: InstallConfig): string {
    return `# DA Identity & Interaction Rules\n\n- **Name:** ${config.AI_NAME}\n- **Principal:** ${config.PRINCIPAL_NAME}\n- **Voice:** First-person "I/Me"`;
}

function generateBasicInfo(config: InstallConfig): string {
    return `# Basic Information\n\n- **Name:** ${config.PRINCIPAL_NAME}\n- **Timezone:** ${config.TIMEZONE}`;
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  print('');
  print(`${c.blue}${c.bold}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${c.reset}`);
  print(`${c.blue}${c.bold}┃           ${c.cyan}PAI-OpenCode Installation Wizard${c.reset}                 ${c.blue}${c.bold}┃${c.reset}`);
  print(`${c.blue}${c.bold}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${c.reset}`);

  if (!checkBun()) process.exit(1);

  const PRINCIPAL_NAME = await prompt('What is your name?', 'Steve');
  const providerIdx = await promptChoice('Which AI provider?', PROVIDERS.map(p => p.name), 2);
  const selectedProvider = PROVIDERS[providerIdx];

  const AI_NAME = await prompt('Name your AI assistant', 'PAI');
  const CATCHPHRASE = await prompt('Startup catchphrase', `${AI_NAME} here.`);

  const config: InstallConfig = {
    PRINCIPAL_NAME,
    TIMEZONE: Intl.DateTimeFormat().resolvedOptions().timeZone,
    AI_NAME,
    CATCHPHRASE,
    PROVIDER: selectedProvider,
  };

  // Writing Files
  writeFileSync(join(PROJECT_ROOT, 'opencode.json'), JSON.stringify(generateOpencodeJson(config), null, 2));
  writeFileSync(join(OPENCODE_DIR, 'settings.json'), JSON.stringify(generateSettingsJson(config), null, 2));
  
  // Ensure Directory Structure
  const paiUserDir = join(OPENCODE_DIR, 'skills', 'PAI', 'USER');
  if (!existsSync(paiUserDir)) mkdirSync(paiUserDir, { recursive: true });

  writeFileSync(join(paiUserDir, 'DAIDENTITY.md'), generateDAIdentity(config));
  writeFileSync(join(paiUserDir, 'BASICINFO.md'), generateBasicInfo(config));

  fixPermissions(OPENCODE_DIR);

  printSuccess('PAI-OpenCode Installed!');
  process.exit(0);
}

main().catch(err => {
  console.error(`${c.red}Error:${c.reset}`, err.message);
  process.exit(1);
});
