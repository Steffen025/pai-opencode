/**
 * Integrity Check Handler (v3.0)
 *
 * Validates system health — required files exist, configs valid,
 * MEMORY directories intact, plugins functioning.
 *
 * Ported from PAI v3.0 IntegrityCheck.hook.ts
 *
 * @module integrity-check
 */

import * as fs from "fs";
import * as path from "path";
import { fileLog, fileLogError } from "../lib/file-logger";
import { getOpenCodeDir, getMemoryDir } from "../lib/paths";

interface IntegrityResult {
  healthy: boolean;
  issues: string[];
  checks: { name: string; passed: boolean; detail?: string }[];
}

/**
 * Run full system integrity check
 */
export async function runIntegrityCheck(): Promise<IntegrityResult> {
  const issues: string[] = [];
  const checks: { name: string; passed: boolean; detail?: string }[] = [];

  try {
    const openCodeDir = getOpenCodeDir();
    const memoryDir = getMemoryDir();

    // Check 1: Skills directory exists with PAI SKILL.md
    const skillsDir = path.join(openCodeDir, "skills");
    const paiSkill = path.join(skillsDir, "PAI", "SKILL.md");
    if (fs.existsSync(paiSkill)) {
      const stat = fs.statSync(paiSkill);
      checks.push({
        name: "PAI SKILL.md exists",
        passed: true,
        detail: `${stat.size} bytes`,
      });
    } else {
      issues.push("PAI SKILL.md missing");
      checks.push({ name: "PAI SKILL.md exists", passed: false });
    }

    // Check 2: Settings file exists with required fields
    const settingsPath = path.join(openCodeDir, "settings.json");
    if (fs.existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(
          fs.readFileSync(settingsPath, "utf-8")
        );
        const hasIdentity = !!settings.daidentity?.name;
        const hasPrincipal = !!settings.principal?.name;

        if (hasIdentity && hasPrincipal) {
          checks.push({
            name: "settings.json valid",
            passed: true,
            detail: `DA: ${settings.daidentity.name}, Principal: ${settings.principal.name}`,
          });
        } else {
          const missing = [];
          if (!hasIdentity) missing.push("daidentity.name");
          if (!hasPrincipal) missing.push("principal.name");
          issues.push(`settings.json missing: ${missing.join(", ")}`);
          checks.push({
            name: "settings.json valid",
            passed: false,
            detail: `Missing: ${missing.join(", ")}`,
          });
        }
      } catch {
        issues.push("settings.json is not valid JSON");
        checks.push({ name: "settings.json valid", passed: false });
      }
    } else {
      issues.push("settings.json missing");
      checks.push({ name: "settings.json valid", passed: false });
    }

    // Check 3: MEMORY directories exist
    const memDirs = ["WORK", "LEARNING", "RESEARCH", "STATE"];
    for (const dir of memDirs) {
      const dirPath = path.join(memoryDir, dir);
      const exists = fs.existsSync(dirPath);
      checks.push({
        name: `MEMORY/${dir} exists`,
        passed: exists,
      });
      if (!exists) {
        issues.push(`MEMORY/${dir} directory missing`);
      }
    }

    // Check 4: PRD system directories (v3.0)
    const prdDir = path.join(memoryDir, "WORK", "PRD");
    const prdExists = fs.existsSync(prdDir);
    checks.push({
      name: "PRD system exists",
      passed: prdExists,
      detail: prdExists ? "active/, completed/, templates/" : "Not found",
    });
    if (!prdExists) {
      issues.push("PRD system directories missing");
    }

    // Check 5: Plugin files intact
    const pluginPath = path.join(openCodeDir, "plugins", "pai-unified.ts");
    if (fs.existsSync(pluginPath)) {
      checks.push({ name: "pai-unified.ts exists", passed: true });
    } else {
      issues.push("pai-unified.ts plugin missing");
      checks.push({ name: "pai-unified.ts exists", passed: false });
    }

    // Check 6: Handler files exist
    const handlersDir = path.join(openCodeDir, "plugins", "handlers");
    if (fs.existsSync(handlersDir)) {
      const handlers = fs.readdirSync(handlersDir).filter((f) =>
        f.endsWith(".ts")
      );
      checks.push({
        name: "Plugin handlers",
        passed: handlers.length >= 14,
        detail: `${handlers.length} handlers found`,
      });
      if (handlers.length < 14) {
        issues.push(
          `Expected 14+ plugin handlers, found ${handlers.length}`
        );
      }
    } else {
      issues.push("handlers/ directory missing");
      checks.push({ name: "Plugin handlers", passed: false });
    }

    const healthy = issues.length === 0;

    if (healthy) {
      fileLog("[IntegrityCheck] System healthy — all checks passed", "info");
    } else {
      fileLog(
        `[IntegrityCheck] ${issues.length} issues: ${issues.join("; ")}`,
        "warn"
      );
    }

    return { healthy, issues, checks };
  } catch (error) {
    fileLogError("[IntegrityCheck] Check failed", error);
    return {
      healthy: false,
      issues: ["Integrity check itself failed"],
      checks,
    };
  }
}

/**
 * Format integrity report for display
 */
export function formatIntegrityReport(result: IntegrityResult): string {
  const lines = ["## System Integrity Report", ""];

  for (const check of result.checks) {
    const icon = check.passed ? "✅" : "❌";
    const detail = check.detail ? ` (${check.detail})` : "";
    lines.push(`${icon} ${check.name}${detail}`);
  }

  if (result.issues.length > 0) {
    lines.push("", "### Issues Found:");
    for (const issue of result.issues) {
      lines.push(`- ⚠️ ${issue}`);
    }
  }

  return lines.join("\n");
}
