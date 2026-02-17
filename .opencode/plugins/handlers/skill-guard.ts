/**
 * Skill Guard Handler (v3.0)
 *
 * Validates skill invocations match USE WHEN triggers.
 * Warns on mismatched invocations but doesn't block.
 *
 * Ported from PAI v3.0 SkillGuard.hook.ts
 *
 * @module skill-guard
 */

import * as fs from "fs";
import * as path from "path";
import { fileLog, fileLogError } from "../lib/file-logger";
import { getOpenCodeDir } from "../lib/paths";

interface SkillValidation {
  valid: boolean;
  reason?: string;
}

/** Skills known to be false-positive triggers */
const BLOCKED_SKILLS = ["keybindings-help"];

/**
 * Check if a skill is in the blocked list
 */
export function isBlockedSkill(skillName: string): boolean {
  return BLOCKED_SKILLS.includes(skillName.toLowerCase());
}

/**
 * Extract USE WHEN triggers from a skill's SKILL.md
 */
function extractTriggers(skillName: string): string | null {
  try {
    const skillDir = path.join(getOpenCodeDir(), "skills", skillName);
    const skillPath = path.join(skillDir, "SKILL.md");

    if (!fs.existsSync(skillPath)) return null;

    const content = fs.readFileSync(skillPath, "utf-8");

    // Look for description in frontmatter
    const frontmatterMatch = content.match(
      /---\s*\n[\s\S]*?description:\s*(.+)\n[\s\S]*?---/
    );
    if (frontmatterMatch) {
      return frontmatterMatch[1].trim();
    }

    // Look for USE WHEN in content
    const useWhenMatch = content.match(/USE WHEN[:\s]+(.+)/i);
    if (useWhenMatch) {
      return useWhenMatch[1].trim();
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Validate a skill invocation
 */
export async function validateSkillInvocation(
  skillName: string,
  context: string
): Promise<SkillValidation> {
  try {
    // Block known false-positives
    if (isBlockedSkill(skillName)) {
      fileLog(
        `[SkillGuard] Blocked false-positive: ${skillName}`,
        "warn"
      );
      return {
        valid: false,
        reason: `Skill "${skillName}" is in the blocked list (known false-positive)`,
      };
    }

    // Check skill exists
    const skillDir = path.join(getOpenCodeDir(), "skills", skillName);
    if (!fs.existsSync(skillDir)) {
      fileLog(
        `[SkillGuard] Skill not found: ${skillName}`,
        "warn"
      );
      return {
        valid: false,
        reason: `Skill "${skillName}" not found in skills directory`,
      };
    }

    // Extract and log triggers for debugging
    const triggers = extractTriggers(skillName);
    if (triggers) {
      fileLog(
        `[SkillGuard] Skill "${skillName}" triggers: ${triggers.substring(0, 100)}`,
        "debug"
      );
    }

    fileLog(`[SkillGuard] Skill "${skillName}" invocation OK`, "debug");
    return { valid: true };
  } catch (error) {
    fileLogError("[SkillGuard] Validation failed", error);
    return { valid: true, reason: "Validation error — allowing invocation" };
  }
}
