/**
 * update-counts.ts - Update settings.json with fresh system counts
 *
 * PURPOSE:
 * Updates the counts section of settings.json at the end of each session.
 * Banner and statusline then read from settings.json (instant, no execution).
 *
 * ARCHITECTURE:
 * Stop hook → UpdateCounts → settings.json
 * Session start → Banner reads settings.json (instant)
 * Session start → Statusline reads settings.json (instant)
 *
 * This design ensures:
 * - No spawning/execution at session start
 * - Counts are always available (no waiting)
 * - Single source of truth in settings.json
 *
 * PORTED FROM: PAI v2.5 hooks/handlers/UpdateCounts.ts
 * ADAPTATIONS FOR PAI-OPENCODE:
 * - getPaiDir() → getOpenCodeDir()
 * - hooks/ → plugins/
 * - console.error → fileLog (TUI-safe)
 * - .claude/ → .opencode/
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { getOpenCodeDir } from '../lib/paths';
import { fileLog, fileLogError } from '../lib/file-logger';
import { getISOTimestamp } from '../lib/time';

interface Counts {
  skills: number;
  workflows: number;
  plugins: number;  // Changed from 'hooks' to 'plugins'
  signals: number;
  files: number;
  updatedAt: string;
}

/**
 * Count files matching criteria recursively
 */
function countFilesRecursive(dir: string, extension?: string): number {
  let count = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        count += countFilesRecursive(fullPath, extension);
      } else if (entry.isFile()) {
        if (!extension || entry.name.endsWith(extension)) {
          count++;
        }
      }
    }
  } catch {
    // Directory doesn't exist or not readable
  }
  return count;
}

/**
 * Count .md files inside any Workflows directory
 */
function countWorkflowFiles(dir: string): number {
  let count = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.toLowerCase() === 'workflows') {
          count += countFilesRecursive(fullPath, '.md');
        } else {
          count += countWorkflowFiles(fullPath);
        }
      }
    }
  } catch {
    // Directory doesn't exist or not readable
  }
  return count;
}

/**
 * Count skills (directories with SKILL.md file)
 */
function countSkills(openCodeDir: string): number {
  let count = 0;
  const skillsDir = join(openCodeDir, 'skills');
  try {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const skillFile = join(skillsDir, entry.name, 'SKILL.md');
        if (existsSync(skillFile)) {
          count++;
        }
      }
    }
  } catch {
    // skills directory doesn't exist
  }
  return count;
}

/**
 * Count plugins (.ts files in plugins/ at depth 1)
 * Note: Changed from countHooks to countPlugins for OpenCode
 */
function countPlugins(openCodeDir: string): number {
  let count = 0;
  const pluginsDir = join(openCodeDir, 'plugins');
  try {
    for (const entry of readdirSync(pluginsDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.ts')) {
        count++;
      }
    }
  } catch {
    // plugins directory doesn't exist
  }
  return count;
}

/**
 * Count non-empty lines in a JSONL file (signals = rating entries)
 */
function countRatingsLines(filePath: string): number {
  try {
    if (!existsSync(filePath) || !statSync(filePath).isFile()) return 0;
    return readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim()).length;
  } catch {
    return 0;
  }
}

/**
 * Get all counts
 */
function getCounts(openCodeDir: string): Counts {
  return {
    skills: countSkills(openCodeDir),
    workflows: countWorkflowFiles(join(openCodeDir, 'skills')),
    plugins: countPlugins(openCodeDir),  // Changed from 'hooks'
    signals: countRatingsLines(join(openCodeDir, 'MEMORY/LEARNING/SIGNALS/ratings.jsonl')),
    files: countFilesRecursive(join(openCodeDir, 'skills/PAI/USER')),
    updatedAt: getISOTimestamp(),  // Using time.ts utility
  };
}

/**
 * Get settings.json path
 */
function getSettingsPath(openCodeDir: string): string {
  return join(openCodeDir, 'settings.json');
}

/**
 * Handler called by StopOrchestrator
 */
export async function handleUpdateCounts(): Promise<void> {
  const openCodeDir = getOpenCodeDir();
  const settingsPath = getSettingsPath(openCodeDir);

  try {
    // Get fresh counts
    const counts = getCounts(openCodeDir);

    // Read current settings
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

    // Update counts section
    settings.counts = counts;

    // Write back
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');

    fileLog(`[UpdateCounts] Updated settings.json: ${counts.skills} skills, ${counts.workflows} workflows, ${counts.plugins} plugins, ${counts.signals} signals, ${counts.files} files`, 'info');
  } catch (error) {
    fileLogError('[UpdateCounts] Failed to update counts', error);
    // Non-fatal - don't throw, let other handlers continue
  }
}

// Allow running standalone to seed initial counts
if (import.meta.main) {
  handleUpdateCounts().then(() => process.exit(0));
}
