#!/usr/bin/env bun

/**
 * SecretScan.ts
 * TruffleHog wrapper for secret scanning
 */

import { spawn } from 'child_process';

interface ScanArgs {
  path: string;
  onlyVerified: boolean;
  json: boolean;
}

function parseArgs(): ScanArgs | null {
  const args = process.argv.slice(2);
  const parsed: Partial<ScanArgs> = {
    onlyVerified: false,
    json: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--path':
        if (!next) {
          console.error('Error: --path requires a value');
          return null;
        }
        parsed.path = next;
        i++;
        break;
      case '--only-verified':
        parsed.onlyVerified = true;
        break;
      case '--json':
        parsed.json = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
      default:
        console.error(`Error: Unknown argument: ${arg}`);
        return null;
    }
  }

  if (!parsed.path) {
    console.error('Error: --path is required');
    showHelp();
    return null;
  }

  return parsed as ScanArgs;
}

function showHelp(): void {
  console.log(`
Usage: bun run SecretScan.ts --path PATH [OPTIONS]

Required Arguments:
  --path PATH          Path to scan for secrets

Options:
  --only-verified      Only show verified secrets
  --json               Output results as JSON
  -h, --help           Show this help message

Examples:
  bun run SecretScan.ts --path /path/to/repo
  bun run SecretScan.ts --path . --only-verified
  bun run SecretScan.ts --path /code --json
`);
}

async function checkTruffleHog(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('which', ['trufflehog']);
    proc.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

async function runTruffleHog(args: ScanArgs): Promise<void> {
  const hasTruffleHog = await checkTruffleHog();

  if (!hasTruffleHog) {
    console.error('Error: trufflehog not found in PATH');
    console.error('Install with: brew install trufflehog');
    process.exit(1);
  }

  const truffleArgs = [
    'filesystem',
    args.path
  ];

  if (args.onlyVerified) {
    truffleArgs.push('--only-verified');
  }

  if (args.json) {
    truffleArgs.push('--json');
  }

  console.log(`Scanning ${args.path} for secrets...`);
  if (args.onlyVerified) {
    console.log('Mode: Only verified secrets');
  }
  console.log('');

  const proc = spawn('trufflehog', truffleArgs, {
    stdio: 'inherit'
  });

  proc.on('error', (error) => {
    console.error('Error running trufflehog:', error);
    process.exit(1);
  });

  proc.on('close', (code) => {
    if (code === 0) {
      console.log('\n✓ Scan completed successfully');
    } else if (code === 183) {
      console.log('\n⚠ Scan completed - secrets found');
      process.exit(1);
    } else {
      console.error(`\n✗ Scan failed with exit code ${code}`);
      process.exit(1);
    }
  });
}

// Main execution
const args = parseArgs();
if (args) {
  await runTruffleHog(args);
}
