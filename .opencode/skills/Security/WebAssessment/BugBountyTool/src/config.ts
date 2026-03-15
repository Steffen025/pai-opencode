// Configuration for bug bounty tracker

import { homedir } from 'os';

/** Expand a leading '~' to the OS home directory so fs calls resolve correctly. */
function expandPath(p: string): string {
  return p.replace(/^~/, homedir());
}

const BASE = expandPath('~/.opencode/skills/Security/WebAssessment/BugBountyTool');

export const CONFIG = {
  // GitHub repository
  repo: {
    owner: 'arkadiyt',
    name: 'bounty-targets-data',
  },

  // Data file paths in the repository
  files: {
    domains_txt: 'domains.txt',
    hackerone: 'data/hackerone_data.json',
    bugcrowd: 'data/bugcrowd_data.json',
    intigriti: 'data/intigriti_data.json',
    yeswehack: 'data/yeswehack_data.json',
  },

  // Local paths (tilde-expanded so Node fs calls resolve correctly)
  paths: {
    root: BASE,
    state: `${BASE}/state.json`,
    cache: `${BASE}/cache`,
    logs: `${BASE}/logs`,
  },

  // GitHub API
  api: {
    base: 'https://api.github.com',
    raw_base: 'https://raw.githubusercontent.com',
  },

  // Cache settings
  cache: {
    max_age_days: 30,
    metadata_file: 'programs_metadata.json',
    recent_changes_file: 'recent_changes.json',
  },
} as const;
