/**
 * PAI-OpenCode Context Loader
 *
 * Loads PAI skill context for injection into chat system.
 * Equivalent to PAI's load-core-context.ts hook.
 *
 * Compatible with PAI v2.4 (The Algorithm embedded in PAI).
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
 * Load PAI skill context
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
    const paiSkillDir = join(opencodeDir, "skills", "PAI");

    fileLog(`Loading context from: ${paiSkillDir}`);

    // Check if PAI skill exists
    if (!existsSync(paiSkillDir)) {
      fileLog("PAI skill directory not found", "warn");
      return {
        context: "",
        success: false,
        error: "PAI skill not found",
      };
    }

    const contextParts: string[] = [];

    // 1. Load SKILL.md
    const skillPath = join(paiSkillDir, "SKILL.md");
    const skillContent = readFileSafe(skillPath);
    if (skillContent) {
      contextParts.push(`--- PAI SKILL ---\n${skillContent}`);
      fileLog("Loaded SKILL.md");
    }

    // 2. Load SYSTEM docs (if exists) - v2.4 compatible
    const systemDir = join(paiSkillDir, "SYSTEM");
    if (existsSync(systemDir)) {
      // Priority SYSTEM files for v2.4
      const systemFiles = [
        "SkillSystem.md",           // Skill system documentation
        "PAIAGENTSYSTEM.md",        // Agent system
        "THEPLUGINSYSTEM.md",       // Plugin system (OpenCode specific)
        "PAISYSTEMARCHITECTURE.md", // v2.4: System architecture
        "AISTEERINGRULES.md",       // System steering rules
        "RESPONSEFORMAT.md",        // v2.4: Response format rules
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

    // 3. Load USER/TELOS context (if exists) - v2.4 compatible
    const telosDir = join(paiSkillDir, "USER", "TELOS");
    if (existsSync(telosDir)) {
      // Priority TELOS files for v2.4 (most important first)
      const telosFiles = [
        "TELOS.md",      // Main TELOS document
        "MISSION.md",    // v2.4: Mission statement
        "GOALS.md",      // Goals
        "NARRATIVES.md", // v2.4: Personal narratives
        "STATUS.md",     // v2.4: Current status
      ];

      for (const file of telosFiles) {
        const filePath = join(telosDir, file);
        const content = readFileSafe(filePath);
        if (content) {
          contextParts.push(`--- USER/TELOS/${file} ---\n${content}`);
          fileLog(`Loaded USER/TELOS/${file}`);
        }
      }
    }

    // 4. Load USER identity files - v2.4 compatible
    const userDir = join(paiSkillDir, "USER");
    const userFiles = [
      "ABOUTME.md",           // User profile
      "BASICINFO.md",         // v2.4: Basic information
      "DAIDENTITY.md",        // v2.4: AI identity configuration
      "AISTEERINGRULES.md",   // Personal steering rules
      "SOUL.md",              // Personal identity/voice context
      "TECHSTACKPREFERENCES.md", // v2.4: Tech stack preferences
      "RESPONSEFORMAT.md",    // v2.4: Response format preferences
    ];

    for (const file of userFiles) {
      const filePath = join(userDir, file);
      const content = readFileSafe(filePath);
      if (content) {
        contextParts.push(`--- USER/${file} ---\n${content}`);
        fileLog(`Loaded USER/${file}`);
      }
    }

    // 5. Load root soul.md (outside PAI skill tree) if present
    const rootSoulPath = join(opencodeDir, "soul.md");
    const rootSoulContent = readFileSafe(rootSoulPath);
    if (rootSoulContent) {
      contextParts.push(`--- ROOT/soul.md ---\n${rootSoulContent}`);
      fileLog("Loaded root soul.md");
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

    const identityLock = `--- IDENTITY LOCK ---
You are Kirito, Bunni's personal AI assistant.
Never present yourself as OpenCode.
If asked who you are, answer: "Je suis Kirito."`;

    const context = `<system-reminder>
PAI CONTEXT (Auto-loaded by PAI-OpenCode Plugin)

${identityLock}

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
