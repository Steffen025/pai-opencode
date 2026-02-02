/**
 * response-capture.ts - Response Capture Handler
 *
 * PURPOSE:
 * Captures completed responses and updates task status.
 * Also handles learning capture for significant insights.
 * Extracts and persists ISC (Ideal State Criteria) to current task's ISC.json.
 *
 * STRUCTURE:
 * Session: WORK/{session_dir}/
 * Task: WORK/{session_dir}/tasks/{current_task}/
 *   - ISC.json (task's criteria)
 *   - THREAD.md (task's algorithm log with frontmatter metadata)
 *
 * PORTED FROM: PAI v2.5 .claude/hooks/handlers/ResponseCapture.ts
 * SIMPLIFIED: Removed observability/notifications (handled separately in OpenCode)
 *
 * @module handlers/response-capture
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { getWorkDir, getStateDir, getMemoryDir, getOpenCodeDir } from '../lib/paths';
import { fileLog, fileLogError } from '../lib/file-logger';
import { getLearningCategory, isLearningCapture } from '../lib/learning-utils';
import { getPSTTimestamp, getPSTDate, getYearMonth, getISOTimestamp } from '../lib/time';

const WORK_DIR = getWorkDir();
const STATE_DIR = getStateDir();
const CURRENT_WORK_FILE = join(STATE_DIR, 'current-work.json');
const LEARNING_DIR = join(getMemoryDir(), 'LEARNING');

// ============================================================================
// Types
// ============================================================================

interface CurrentWork {
  session_id: string;
  session_dir: string;
  current_task: string;
  task_count: number;
  created_at: string;
}

type EffortLevel = 'QUICK' | 'STANDARD' | 'THOROUGH' | 'TRIVIAL';

interface ISCDocument {
  taskId: string;
  status: string;
  effortLevel: string;
  criteria: string[];
  antiCriteria: string[];
  satisfaction: {
    satisfied: number;
    partial: number;
    failed: number;
    total: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface StructuredResponse {
  summary?: string;
  analysis?: string;
  actions?: string;
  results?: string;
  status?: string;
  next?: string;
  completed?: string;
  date?: string;
}

// ============================================================================
// ISC Extraction Helpers
// ============================================================================

function extractEffortLevel(text: string): EffortLevel | null {
  const match = text.match(/level\s+(QUICK|STANDARD|THOROUGH|TRIVIAL)/i);
  return match ? (match[1].toUpperCase() as EffortLevel) : null;
}

function extractISCSatisfaction(text: string): ISCDocument['satisfaction'] | null {
  // Match patterns like "6 ISC criteria, all satisfied"
  const allSatisfied = text.match(/(\d+)\s*(?:ISC\s*)?criteria?,?\s*all\s*satisfied/i);
  if (allSatisfied) {
    const total = parseInt(allSatisfied[1], 10);
    return { satisfied: total, partial: 0, failed: 0, total };
  }

  // Match: X/Y criteria satisfied
  const partial = text.match(/(\d+)\/(\d+)\s*criteria\s*satisfied/i);
  if (partial) {
    return {
      satisfied: parseInt(partial[1], 10),
      total: parseInt(partial[2], 10),
      partial: 0,
      failed: 0,
    };
  }

  return null;
}

// ============================================================================
// Task ISC Update
// ============================================================================

/**
 * Update task's ISC.json with extracted satisfaction data
 */
function updateTaskISC(sessionDir: string, currentTask: string, text: string): void {
  const taskPath = join(WORK_DIR, sessionDir, 'tasks', currentTask);
  const iscPath = join(taskPath, 'ISC.json');

  if (!existsSync(iscPath)) {
    fileLog(`[ISC] Task ISC.json not found: ${iscPath}`, 'warn');
    return;
  }

  try {
    const doc: ISCDocument = JSON.parse(readFileSync(iscPath, 'utf-8'));
    const timestamp = getISOTimestamp();

    // Extract effort level if found
    const effort = extractEffortLevel(text);
    if (effort) {
      doc.effortLevel = effort;
    }

    // Extract satisfaction from response
    const satisfaction = extractISCSatisfaction(text);
    if (satisfaction) {
      doc.satisfaction = satisfaction;
      doc.status = satisfaction.satisfied === satisfaction.total ? 'COMPLETE' : 'PARTIAL';
    }

    // Check for completion marker
    if (text.includes('✓ COMPLETE')) {
      doc.status = 'COMPLETE';
    }

    doc.updatedAt = timestamp;

    writeFileSync(iscPath, JSON.stringify(doc, null, 2), 'utf-8');
    fileLog(`[ISC] Updated task ISC: ${currentTask}`, 'info');
  } catch (err) {
    fileLogError('[ISC] Error updating task ISC', err);
  }
}

/**
 * Update task THREAD.md frontmatter status
 */
function updateTaskMeta(sessionDir: string, currentTask: string, structured: StructuredResponse): void {
  const taskPath = join(WORK_DIR, sessionDir, 'tasks', currentTask);
  const threadPath = join(taskPath, 'THREAD.md');

  if (!existsSync(threadPath)) {
    fileLog(`[Capture] Task THREAD.md not found: ${threadPath}`, 'warn');
    return;
  }

  try {
    let content = readFileSync(threadPath, 'utf-8');
    const timestamp = getISOTimestamp();

    // Update status if complete
    if (structured.completed || structured.summary) {
      content = content.replace(/^status: "IN_PROGRESS"$/m, 'status: "DONE"');

      // Add completedAt if not present in frontmatter
      if (!content.includes('completedAt:')) {
        content = content.replace(/^(---\n[\s\S]*?)(---)/, `$1completedAt: "${timestamp}"\n$2`);
      }

      // Add summary if not present in frontmatter
      const summary = (structured.completed || structured.summary || '').substring(0, 200);
      if (summary && !content.includes('summary:')) {
        content = content.replace(/^(---\n[\s\S]*?)(---)/, `$1summary: "${summary.replace(/"/g, '\\"')}"\n$2`);
      }
    }

    writeFileSync(threadPath, content, 'utf-8');
    fileLog(`[Capture] Updated task THREAD: ${currentTask}`, 'info');
  } catch (err) {
    fileLogError('[Capture] Error updating task META', err);
  }
}

// ============================================================================
// Learning Capture
// ============================================================================

function generateFilename(description: string, type: 'LEARNING' | 'WORK'): string {
  const pstTimestamp = getPSTTimestamp();
  const date = pstTimestamp.slice(0, 10);
  const time = pstTimestamp.slice(11, 19).replace(/:/g, '');

  const cleanDesc = description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);

  return `${date}-${time}_${type}_${cleanDesc}.md`;
}

function generateLearningContent(structured: StructuredResponse, fullText: string, timestamp: string): string {
  return `---
capture_type: LEARNING
timestamp: ${timestamp}
auto_captured: true
tags: [auto-capture]
---

# Quick Learning: ${structured.completed || structured.summary || 'Task Completion'}

**Date:** ${structured.date || getPSTDate()}
**Auto-captured:** Yes

---

## Summary

${structured.summary || 'N/A'}

## Analysis

${structured.analysis || 'N/A'}

## Actions Taken

${structured.actions || 'N/A'}

## Results

${structured.results || 'N/A'}

## Current Status

${structured.status || 'N/A'}

## Next Steps

${structured.next || 'N/A'}

---

<details>
<summary>Full Response</summary>

${fullText.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')}

</details>
`;
}

// ============================================================================
// Main Capture Logic
// ============================================================================

function readCurrentWork(): CurrentWork | null {
  try {
    if (!existsSync(CURRENT_WORK_FILE)) return null;
    return JSON.parse(readFileSync(CURRENT_WORK_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Parse structured response from text
 * Simplified extraction - looks for PAI format sections
 */
function parseStructuredResponse(text: string): StructuredResponse {
  const structured: StructuredResponse = {};

  // Extract summary
  const summaryMatch = text.match(/📋\s*SUMMARY:\s*(.+?)(?:\n|$)/i);
  if (summaryMatch) structured.summary = summaryMatch[1].trim();

  // Extract analysis
  const analysisMatch = text.match(/🔍\s*ANALYSIS:\s*(.+?)(?:\n(?:⚡|✅|📊|➡️)|$)/is);
  if (analysisMatch) structured.analysis = analysisMatch[1].trim();

  // Extract actions
  const actionsMatch = text.match(/⚡\s*ACTIONS:\s*(.+?)(?:\n(?:✅|📊|➡️)|$)/is);
  if (actionsMatch) structured.actions = actionsMatch[1].trim();

  // Extract results
  const resultsMatch = text.match(/✅\s*RESULTS:\s*(.+?)(?:\n(?:📊|➡️)|$)/is);
  if (resultsMatch) structured.results = resultsMatch[1].trim();

  // Extract status
  const statusMatch = text.match(/📊\s*STATUS:\s*(.+?)(?:\n|$)/i);
  if (statusMatch) structured.status = statusMatch[1].trim();

  // Extract next steps
  const nextMatch = text.match(/➡️\s*NEXT:\s*(.+?)(?:\n|$)/is);
  if (nextMatch) structured.next = nextMatch[1].trim();

  // Extract completed/voice line
  const completedMatch = text.match(/🗣️\s*\w+:\s*(.+?)$/m);
  if (completedMatch) structured.completed = completedMatch[1].trim();

  return structured;
}

async function captureWorkSummary(text: string, structured: StructuredResponse): Promise<void> {
  try {
    const currentWork = readCurrentWork();

    if (currentWork?.session_dir && currentWork?.current_task) {
      // Update task ISC with satisfaction data
      updateTaskISC(currentWork.session_dir, currentWork.current_task, text);

      // Update task META if we have completion info
      if (structured.summary || structured.completed) {
        updateTaskMeta(currentWork.session_dir, currentWork.current_task, structured);
      }
    }

    // Learning capture
    const isLearning = isLearningCapture(text, structured.summary, structured.analysis);

    if (isLearning) {
      let description = (structured.completed || structured.summary || 'task-completion')
        .replace(/^Completed\s+/i, '')
        .replace(/\[AGENT:\w+\]\s*/gi, '')
        .replace(/\[.*?\]/g, '')
        .trim();

      if (!description || description.length < 3) {
        description = structured.summary || structured.analysis || 'task-completion';
        description = description.replace(/^Completed\s+/i, '').trim();
      }

      if (!description || description.length < 3) {
        description = 'general-task';
      }

      const yearMonth = getYearMonth();
      const filename = generateFilename(description, 'LEARNING');
      const category = getLearningCategory(text);
      const targetDir = join(LEARNING_DIR, category, yearMonth);

      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }

      const filePath = join(targetDir, filename);
      const timestamp = getPSTTimestamp();
      const content = generateLearningContent(structured, text, timestamp);

      writeFileSync(filePath, content, 'utf-8');
      fileLog(`✅ Captured learning to: ${filePath}`, 'info');
    }
  } catch (error) {
    fileLogError('[Capture] Error capturing work summary', error);
  }
}

// ============================================================================
// Export - Handler Entry Point
// ============================================================================

/**
 * Handle response capture for completed assistant messages
 * 
 * This is called by the OpenCode plugin system when the assistant
 * completes a response.
 * 
 * @param text - The full response text from the assistant
 * @param sessionId - Current session identifier
 */
export async function handleResponseCapture(text: string, sessionId: string): Promise<void> {
  try {
    fileLog(`[Capture] Processing response (length: ${text.length})`, 'debug');
    
    // Parse structured response from text
    const structured = parseStructuredResponse(text);
    
    // Capture work summary (async, non-blocking)
    await captureWorkSummary(text, structured).catch(err => {
      fileLogError('[Capture] Work summary capture failed (non-critical)', err);
    });
    
    fileLog('[Capture] Response capture complete', 'info');
  } catch (error) {
    fileLogError('[Capture] handleResponseCapture failed', error);
  }
}
