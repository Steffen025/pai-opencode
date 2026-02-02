/**
 * tab-state.ts - Terminal Tab State Manager
 *
 * PURPOSE:
 * Updates Kitty terminal tab title and color on response completion.
 * Generates 3-5 word completion summary with SUBJECT FIRST for tab 
 * distinguishability (e.g., "Auth bug fixed." not "Fixed the auth bug.").
 *
 * Also persists the last tab title to state for recovery after compaction
 * or session restart.
 *
 * Pure handler: receives voice completion, updates Kitty tab.
 *
 * PORTED FROM: PAI v2.5 .claude/hooks/handlers/TabState.ts
 * ADAPTATIONS:
 * - Uses OpenCode lib utilities (paths, file-logger, time, identity)
 * - Graceful Kitty handling (fails silently if not available)
 * - Inference fallback (uses simple extraction if inference() not available)
 * - All console.error → fileLog
 *
 * @module handlers/tab-state
 */

import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { getStateDir } from '../lib/paths';
import { fileLog, fileLogError } from '../lib/file-logger';
import { getISOTimestamp } from '../lib/time';
import { getDAName } from '../lib/identity';

// Tab color states for visual feedback (inactive tab only - active tab stays dark blue)
const TAB_COLORS = {
  awaitingInput: '#0D6969',  // Dark teal - needs input
  completed: '#022800',      // Very dark green - success
  error: '#804000',          // Dark orange - problem
} as const;

type ResponseState = 'completed' | 'awaitingInput' | 'error';

const ACTIVE_TAB_COLOR = '#002B80';  // Dark blue
const ACTIVE_TEXT_COLOR = '#FFFFFF';
const INACTIVE_TEXT_COLOR = '#A0A0A0';

// State file for tab title persistence
const getTabStatePath = () => join(getStateDir(), 'tab-title.json');

interface TabTitleState {
  title: string;
  rawTitle: string;  // Without prefix
  timestamp: string;
  state: ResponseState;
}

/**
 * Persist tab title to state file for recovery after compaction/restart.
 */
function persistTabTitle(title: string, rawTitle: string, state: ResponseState): void {
  try {
    const tabStatePath = getTabStatePath();
    const stateDir = dirname(tabStatePath);
    if (!existsSync(stateDir)) {
      mkdirSync(stateDir, { recursive: true });
    }

    const tabState: TabTitleState = {
      title,
      rawTitle,
      timestamp: getISOTimestamp(),
      state,
    };

    writeFileSync(tabStatePath, JSON.stringify(tabState, null, 2), 'utf-8');
    fileLog(`[TabState] Persisted title: "${rawTitle}"`);
  } catch (error) {
    fileLogError('[TabState] Failed to persist title', error);
  }
}

// Generic subjects that provide zero information about what was actually done
const GENERIC_SUBJECTS = [
  'task', 'work', 'request', 'response', 'completion',
  'job', 'item', 'thing', 'action', 'operation', 'process',
];

/**
 * Check if a completion summary uses a generic subject instead of a specific one.
 * "Task completed." is useless. "Auth bug fixed." is useful.
 */
function hasGenericSubject(summary: string): boolean {
  const content = summary.replace(/\.$/, '').trim().toLowerCase();
  const firstWord = content.split(/\s+/)[0];
  return GENERIC_SUBJECTS.includes(firstWord);
}

/**
 * Extract a specific subject from the voice line when inference produces garbage.
 * Takes the first few meaningful words from the voice line as a fallback.
 */
function extractSpecificSubject(voiceLine: string): string {
  // Strip common prefixes like "Done.", "DA name:", etc.
  const daName = getDAName();
  let cleaned = voiceLine
    .replace(new RegExp(`^(Done\\.?\\s*|${daName}:\\s*|I've\\s+|I\\s+)`, 'i'), '')
    .trim();

  if (!cleaned || cleaned.length < 3) return 'Task done.';

  // Take first 4 meaningful words
  const words = cleaned.split(/\s+/).slice(0, 4);
  let result = words.join(' ');
  // Clean trailing punctuation and add period
  result = result.replace(/[,;:!?\-]+$/, '').trim();
  if (!result.endsWith('.')) result += '.';
  return result;
}

/**
 * Simple fallback tab title generation.
 * Used when inference() is not available.
 * Extracts first few meaningful words from voice line.
 */
function generateFallbackSummary(voiceLine: string): string {
  fileLog('[TabState] Using fallback summary (inference not available)', 'debug');
  
  const summary = extractSpecificSubject(voiceLine);
  
  // Validate - reject if generic
  if (hasGenericSubject(summary)) {
    fileLog(`[TabState] Fallback produced generic summary: "${summary}"`, 'warn');
    // Just use the first few words directly
    const words = voiceLine.split(/\s+/).slice(0, 4).join(' ');
    return words.endsWith('.') ? words : words + '.';
  }
  
  return summary;
}

/**
 * Generate a proper 3-5 word completion summary.
 * Subject comes first for tab distinguishability.
 * 
 * TODO: Once inference() is available, implement AI-based summarization.
 * For now, uses simple extraction fallback.
 */
async function generateCompletionSummary(voiceLine: string): Promise<string> {
  // TODO: Implement inference() call when available
  // For now, use fallback extraction
  
  /* FUTURE IMPLEMENTATION:
  try {
    const COMPLETION_PROMPT = `Create a 3-5 word COMPLETE SENTENCE describing what was done.

FORMAT: "[Specific subject] [past participle]."
The subject MUST come first so tabs are distinguishable.

GOOD (specific subjects):
- "Auth bug fixed."
- "Hook validation updated."
- "Tab title logic simplified."
- "Context filtering improved."
- "Letter to manager drafted."

BAD — NEVER USE GENERIC SUBJECTS:
- "Task completed." (generic — WHAT task?)
- "Task completion described." (generic meta-description)
- "Work finished." (generic)
- "Request handled." (generic)
- "Response generated." (meta)

BAD — fragments:
- "Fixed." (too vague)
- "Updated the" (incomplete)
- "Done with the" (fragment)

RULES:
1. 3-5 words, COMPLETE sentence
2. SPECIFIC subject FIRST (name the actual thing), then past participle
3. NEVER use "task", "work", "request", "response", "completion" as subjects
4. End with period

Output ONLY the sentence. Nothing else.`;

    const result = await inference({
      systemPrompt: COMPLETION_PROMPT,
      userPrompt: voiceLine.slice(0, 500),
      timeout: 20000,
      level: 'standard',  // Sonnet for better subject extraction
    });

    if (result.success && result.output) {
      let summary = result.output.replace(/^["']|["']$/g, '').trim();
      const words = summary.split(/\s+/).slice(0, 5);
      summary = words.join(' ');
      if (!summary.endsWith('.')) summary += '.';

      // Reject generic subjects — "Task completed." tells you nothing
      if (hasGenericSubject(summary)) {
        fileLog(`[TabState] Rejected generic summary: "${summary}"`);
        // Try to extract something specific from the voice line itself
        const fallback = extractSpecificSubject(voiceLine);
        return fallback;
      }

      return summary;
    }
  } catch (error) {
    fileLogError('[TabState] Inference failed', error);
  }
  */
  
  return generateFallbackSummary(voiceLine);
}

/**
 * Check if Kitty terminal is available
 */
async function isKittyAvailable(): Promise<boolean> {
  try {
    // Check if running in Kitty by looking for KITTY_WINDOW_ID env var
    if (!process.env.KITTY_WINDOW_ID) {
      return false;
    }
    
    // Try to run a simple kitty command
    const result = await Bun.$`which kitty`.quiet().nothrow();
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Set Kitty tab colors (graceful failure if not available)
 */
async function setTabColors(stateColor: string): Promise<void> {
  try {
    if (!(await isKittyAvailable())) {
      fileLog('[TabState] Kitty not available, skipping color update', 'debug');
      return;
    }

    // Set tab colors: active tab always dark blue, inactive shows state color
    await Bun.$`kitten @ set-tab-color --self active_bg=${ACTIVE_TAB_COLOR} active_fg=${ACTIVE_TEXT_COLOR} inactive_bg=${stateColor} inactive_fg=${INACTIVE_TEXT_COLOR}`.quiet().nothrow();
    fileLog('[TabState] Tab colors updated', 'debug');
  } catch (error) {
    fileLog('[TabState] Could not set tab colors (non-critical)', 'debug');
  }
}

/**
 * Set Kitty tab title (graceful failure if not available)
 */
async function setTabTitle(title: string): Promise<void> {
  try {
    if (!(await isKittyAvailable())) {
      fileLog('[TabState] Kitty not available, skipping title update', 'debug');
      return;
    }

    // Set tab title
    await Bun.$`kitty @ set-tab-title ${title}`.quiet().nothrow();
    fileLog(`[TabState] Tab title set to: "${title}"`, 'debug');
  } catch (error) {
    fileLog('[TabState] Could not set tab title (non-critical)', 'debug');
  }
}

/**
 * Validate voice completion line.
 * Must have content and not be just punctuation.
 */
function isValidVoiceCompletion(voiceLine: string): boolean {
  if (!voiceLine || voiceLine.length < 3) return false;
  
  // Remove common patterns and check if anything meaningful remains
  const cleaned = voiceLine
    .replace(/^(Done\\.?\\s*|\\w+:\\s*)/, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .trim();
  
  return cleaned.length >= 3;
}

/**
 * Handle tab state update with voice completion.
 * 
 * @param voiceCompletion - The voice line from the response (e.g., "🗣️ Jeremy: Auth bug fixed.")
 * @param responseState - State of the response (completed, awaitingInput, error)
 */
export async function handleTabState(
  voiceCompletion: string,
  responseState: ResponseState = 'completed'
): Promise<void> {
  try {
    // Extract plain completion (remove emoji and DA name prefix)
    let plainCompletion = voiceCompletion
      .replace(/^🗣️\s*\w+:\s*/, '')  // Remove "🗣️ Name: " prefix
      .trim();

    // Validate completion
    if (!isValidVoiceCompletion(plainCompletion)) {
      fileLog(`[TabState] Invalid completion: "${plainCompletion.slice(0, 50)}..."`, 'warn');
      plainCompletion = 'Task completed.';
    }

    const stateColor = TAB_COLORS[responseState];

    // Generate proper completion summary
    const shortTitle = await generateCompletionSummary(plainCompletion);

    // Simple checkmark for completion - color indicates success vs error
    const tabTitle = `✓${shortTitle}`;

    fileLog(`[TabState] State: ${responseState}, Title: "${tabTitle}"`, 'info');

    // Persist title for recovery after compaction/restart
    persistTabTitle(tabTitle, shortTitle, responseState);

    // Update Kitty terminal (graceful failure if not available)
    await setTabColors(stateColor);
    await setTabTitle(tabTitle);

    fileLog('[TabState] Tab state update complete', 'info');
  } catch (error) {
    fileLogError('[TabState] Failed to update tab state', error);
  }
}
