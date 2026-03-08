#!/usr/bin/env bun

/**
 * BuildOpenCode.ts — Generate AGENTS.md from template + settings
 *
 * Reads AGENTS.md.template, resolves variables from settings.json
 * and PAI/Algorithm/LATEST, writes AGENTS.md.
 *
 * Called by:
 *   - PAI installer (first install)
 *   - SessionStart hook (keeps fresh automatically)
 *   - Manual: bun PAI/Tools/BuildOpenCode.ts
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ─── Safe home directory resolution ───
const HOME_DIR = process.env.HOME || process.env.USERPROFILE || homedir() || "/tmp";
const PAI_DIR = join(HOME_DIR, ".opencode");
const TEMPLATE_PATH = join(PAI_DIR, "AGENTS.md.template");
const OUTPUT_PATH = join(PAI_DIR, "AGENTS.md");
const SETTINGS_PATH = join(PAI_DIR, "settings.json");
const ALGORITHM_DIR = join(PAI_DIR, "PAI/Algorithm");
const LATEST_PATH = join(ALGORITHM_DIR, "LATEST");

// ─── Safe JSON parsing with fallback ───

function safeJsonParse<T>(path: string, defaultValue: T): T {
  if (!existsSync(path)) {
    return defaultValue;
  }
  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content) as T;
  } catch (err) {
    console.warn(`Warning: Failed to parse ${path}: ${err instanceof Error ? err.message : String(err)}`);
    return defaultValue;
  }
}

// ─── Load current algorithm version ───

function getAlgorithmVersion(): string {
  if (!existsSync(LATEST_PATH)) {
    console.warn("⚠ PAI/Algorithm/LATEST not found, defaulting to v3.7.0");
    return "v3.7.0";
  }
  const version = readFileSync(LATEST_PATH, "utf-8").trim();
  // Remove .md extension if present to avoid "v3.7.0.md.md"
  return version.replace(/\.md$/i, '');
}

// ─── Load variables from settings.json ───

function loadVariables(): { variables: Record<string, string>; settings: Record<string, any> } {
  const settings = safeJsonParse<Record<string, any>>(SETTINGS_PATH, {});
  const algoVersion = getAlgorithmVersion();

  const variables = {
    "{DAIDENTITY.NAME}": settings.daidentity?.name || "Assistant",
    "{DAIDENTITY.FULLNAME}": settings.daidentity?.fullName || "Assistant",
    "{DAIDENTITY.DISPLAYNAME}": settings.daidentity?.displayName || "Assistant",
    "{PRINCIPAL.NAME}": settings.principal?.name || "User",
    "{PRINCIPAL.TIMEZONE}": settings.principal?.timezone || "UTC",
    "{{PAI_VERSION}}": settings.pai?.version || "4.0.3",
    "{{ALGO_VERSION}}": algoVersion,
    "{{ALGO_PATH}}": `PAI/Algorithm/${algoVersion}.md`,
  };

  return { variables, settings };
}

// ─── Check if rebuild is needed ───

export function needsRebuild(): boolean {
  if (!existsSync(OUTPUT_PATH)) return true;
  if (!existsSync(TEMPLATE_PATH)) return false; // no template = nothing to build

  const outputContent = readFileSync(OUTPUT_PATH, "utf-8");
  const { variables, settings } = loadVariables();

  // Check if any template variable appears unresolved in output
  for (const key of Object.keys(variables)) {
    if (outputContent.includes(key)) return true;
  }

  // Check if algorithm version in output matches LATEST
  const algoVersion = getAlgorithmVersion();
  const algoPathPattern = /PAI\/Algorithm\/(.+?)\.md/;
  const match = outputContent.match(algoPathPattern);
  if (match && match[1] !== algoVersion) return true;

  // Check if DA name matches settings (reuse already parsed settings)
  const daName = settings.daidentity?.name || "Assistant";
  if (!outputContent.includes(`🗣️ ${daName}:`)) return true;

  return false;
}

// ─── Build ───

export function build(): { rebuilt: boolean; reason?: string } {
  if (!existsSync(TEMPLATE_PATH)) {
    return { rebuilt: false, reason: "No AGENTS.md.template found" };
  }

  let content = readFileSync(TEMPLATE_PATH, "utf-8");
  const { variables } = loadVariables();

  for (const [key, value] of Object.entries(variables)) {
    content = content.replaceAll(key, value);
  }

  // Check if output already matches
  if (existsSync(OUTPUT_PATH)) {
    const existing = readFileSync(OUTPUT_PATH, "utf-8");
    if (existing === content) {
      return { rebuilt: false, reason: "AGENTS.md already current" };
    }
  }

  writeFileSync(OUTPUT_PATH, content);
  return { rebuilt: true };
}

// ─── CLI entry point ───

if (import.meta.main) {
  const result = build();
  if (result.rebuilt) {
    const { variables } = loadVariables();
    console.log("✅ Built AGENTS.md from template");
    console.log(`   Algorithm: ${variables["{{ALGO_VERSION}}"]}`);
    console.log(`   DA: ${variables["{DAIDENTITY.NAME}"]}`);
    console.log(`   Principal: ${variables["{PRINCIPAL.NAME}"]}`);
  } else {
    console.log(`ℹ ${result.reason}`);
  }
}
