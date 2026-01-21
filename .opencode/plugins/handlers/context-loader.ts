/**
 * PAI-OpenCode Context Loader
 *
 * Loads CORE skill context for injection into chat system.
 * Equivalent to PAI's load-core-context.ts hook.
 *
 * @module context-loader
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { fileLog, fileLogError } from "../lib/file-logger";
import type { ContextResult } from "../adapters/types";

/**
 * Get the OpenCode directory path
 *
 * In OpenCode, config lives in .opencode/ (not .opencode/)
 */
function getOpenCodeDir(): string {
  // Try current working directory first
  const cwd = process.cwd();
  const opencodePath = join(cwd, ".opencode");

  if (existsSync(opencodePath)) {
    return opencodePath;
  }

  // Fallback to home directory
  const homePath = join(
    process.env.HOME || process.env.USERPROFILE || "",
    ".opencode"
  );

  return homePath;
}

/**
 * Read a file safely, returning empty string on error
 */
function readFileSafe(filePath: string): string {
  try {
    if (!existsSync(filePath)) {
      return "";
    }
    return readFileSync(filePath, "utf-8");
  } catch (error) {
    fileLogError(`Failed to read ${filePath}`, error);
    return "";
  }
}

/**
 * Load CORE skill context
 *
 * Reads:
 * - SKILL.md (skill definition)
 * - SYSTEM/*.md (system docs)
 * - USER/TELOS/*.md (personal context, if exists)
 *
 * @returns ContextResult with the combined context string
 */
export async function loadContext(): Promise<ContextResult> {
  try {
    const opencodeDir = getOpenCodeDir();
    const coreSkillDir = join(opencodeDir, "skills", "CORE");

    fileLog(`Loading context from: ${coreSkillDir}`);

    // Check if CORE skill exists
    if (!existsSync(coreSkillDir)) {
      fileLog("CORE skill directory not found", "warn");
      return {
        context: "",
        success: false,
        error: "CORE skill not found",
      };
    }

    const contextParts: string[] = [];

    // 1. Load SKILL.md
    const skillPath = join(coreSkillDir, "SKILL.md");
    const skillContent = readFileSafe(skillPath);
    if (skillContent) {
      contextParts.push(`--- CORE SKILL ---\n${skillContent}`);
      fileLog("Loaded SKILL.md");
    }

    // 2. Load SYSTEM docs (if exists)
    const systemDir = join(coreSkillDir, "SYSTEM");
    if (existsSync(systemDir)) {
      const systemFiles = [
        "SkillSystem.md",
        "PAIAGENTSYSTEM.md",
        "THEHOOKSYSTEM.md",
      ];

      for (const file of systemFiles) {
        const filePath = join(systemDir, file);
        const content = readFileSafe(filePath);
        if (content) {
          contextParts.push(`--- ${file} ---\n${content}`);
          fileLog(`Loaded SYSTEM/${file}`);
        }
      }
    }

    // 3. Load USER/TELOS context (if exists)
    const telosDir = join(coreSkillDir, "USER", "TELOS");
    if (existsSync(telosDir)) {
      const telosFiles = ["GOALS.md", "ABOUTME.md", "PREFERENCES.md"];

      for (const file of telosFiles) {
        const filePath = join(telosDir, file);
        const content = readFileSafe(filePath);
        if (content) {
          contextParts.push(`--- USER/${file} ---\n${content}`);
          fileLog(`Loaded USER/TELOS/${file}`);
        }
      }
    }

    // 4. Check for USER/ABOUTME.md directly
    const aboutMePath = join(coreSkillDir, "USER", "ABOUTME.md");
    const aboutMe = readFileSafe(aboutMePath);
    if (aboutMe) {
      contextParts.push(`--- ABOUTME ---\n${aboutMe}`);
      fileLog("Loaded USER/ABOUTME.md");
    }

    // Combine all context
    if (contextParts.length === 0) {
      fileLog("No context files found", "warn");
      return {
        context: "",
        success: false,
        error: "No context files found",
      };
    }

    const context = `<system-reminder>
PAI CORE CONTEXT (Auto-loaded by PAI-OpenCode Plugin)

${contextParts.join("\n\n")}

---
This context is active for this session.
</system-reminder>`;

    fileLog(
      `Context loaded successfully (${contextParts.length} parts, ${context.length} chars)`
    );

    return {
      context,
      success: true,
    };
  } catch (error) {
    fileLogError("Failed to load context", error);
    return {
      context: "",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
