#!/usr/bin/env bun
/**
 * PAI to OpenCode Converter
 *
 * Translates PAI 2.x (Claude Code) configurations to OpenCode format.
 *
 * Usage:
 *   bun run tools/pai-to-opencode-converter.ts --source ~/.claude --target .opencode
 *   bun run tools/pai-to-opencode-converter.ts --source ~/.claude --target .opencode --mode selective
 *   bun run tools/pai-to-opencode-converter.ts --source ~/.claude --target .opencode --dry-run
 *   bun run tools/pai-to-opencode-converter.ts --help
 *
 * Migration Modes:
 *   - full: Copy everything (default, for fresh installations)
 *   - selective: Only import USER + CUSTOM content, skip SYSTEM (for upgrading)
 *
 * What it translates:
 *   - settings.json → opencode.json (schema mapping)
 *   - skills/ → skills/ (path + minor adjustments)
 *   - agents/ → agents/ (YAML frontmatter + body path replacement)
 *   - MEMORY/ → MEMORY/ (direct copy with path updates)
 *   - Tools/ → Tools/ (v0.9.5: all TypeScript files with path updates)
 *
 * What it does NOT translate (requires manual work):
 *   - hooks/ → plugin/ (fundamentally different architecture)
 *
 * Post-conversion validation:
 *   - Checks for remaining .claude references (v0.9.5)
 *
 * @version 1.0.0
 * @author PAI-OpenCode Project
 */

import { existsSync, mkdirSync, readdirSync, statSync, readFileSync, writeFileSync, copyFileSync } from "fs";
import { join, basename, dirname, relative } from "path";
import { parseArgs } from "util";

import {
  isSystemFile,
  compareFiles,
  formatValidationGate,
  createValidationGateResult,
  SYSTEM_FILES,
  type SystemFile,
  type FileComparison,
  type ValidationGateResult,
} from "./lib/validation-gate.js";

import {
  createManifest,
  detectSource,
  addTransformation,
  addValidationGateResult,
  addValidationRequirement,
  writeManifest,
  getManifestSummary,
  detectPAIVersion,
  isSelectiveMigrationSupported,
  formatVersionInfo,
  type MigrationManifest,
  type Transformation,
  type PAIVersion,
  type VersionDetectionResult,
} from "./lib/migration-manifest.js";

// ============================================================================
// Types
// ============================================================================

interface ConversionResult {
  success: boolean;
  source: string;
  target: string;
  converted: string[];
  skipped: string[];
  warnings: string[];
  errors: string[];
  manualRequired: string[];
}

interface SettingsJson {
  paiVersion?: string;
  env?: Record<string, string>;
  daidentity?: {
    name?: string;
    fullName?: string;
    displayName?: string;
    color?: string;
    voiceId?: string;
    voice?: Record<string, unknown>;
    startupCatchphrase?: string;
  };
  principal?: {
    name?: string;
    timezone?: string;
  };
  permissions?: {
    allow?: string[];
    deny?: string[];
    ask?: string[];
    defaultMode?: string;
  };
  hooks?: Record<string, unknown>;
  mcpServers?: Record<string, unknown>;
}

interface OpencodeJson {
  $schema?: string;
  theme?: string;
  model?: string;
  small_model?: string;
  username?: string;
  default_agent?: string;
  plugin?: string[];
  snapshot?: boolean;
  share?: string;
  autoupdate?: boolean | "notify";
  logLevel?: string;
  mcp?: Record<string, unknown>;
  agent?: Record<string, {
    model?: string;
    prompt?: string;
    description?: string;
    color?: string;
  }>;
}

// ============================================================================
// CLI Parsing
// ============================================================================

function printHelp(): void {
  console.log(`
PAI to OpenCode Converter v1.0.0

USAGE:
  bun run tools/pai-to-opencode-converter.ts [OPTIONS]

OPTIONS:
  --source <path>       Source PAI directory (default: ~/.claude)
  --target <path>       Target OpenCode directory (default: .opencode)
  --mode <mode>         Migration mode: "full" or "selective" (default: full)
  --dry-run             Show what would be done without making changes
  --backup              Create backup before conversion (default: true)
  --no-backup           Skip backup creation
  --skip-validation     Skip MigrationValidator after conversion
  --skip-gates          Auto-approve all validation gates (no prompts)
  --verbose             Show detailed output
  --help                Show this help message

MIGRATION MODES:
  full        Copy everything from source to target (for fresh installations)
  selective   Only import USER + CUSTOM content, skip SYSTEM files
              (for upgrading to a fresh 2.3 OpenCode installation)

SELECTIVE MODE IMPORTS:
  ✅ skills/CORE/USER/       Personal data (TELOS, Contacts, etc.)
  ✅ skills/_CustomSkill/    User-created skills (underscore prefix)
  ✅ skills/[NotStandard]/   Skills not in vanilla PAI
  ✅ MEMORY/                 All history, work, learning, projects
  ✅ .env                    API keys and secrets
  ✅ profiles/               Tool profiles

SELECTIVE MODE SKIPS:
  ⏭️ skills/CORE/SYSTEM/     Uses fresh 2.3 version
  ⏭️ hooks/                  Uses fresh plugins/
  ⏭️ Tools/                  Uses fresh 2.3 version (unless custom)
  ⏭️ Standard skills         Uses fresh 2.3 version (if unmodified)

EXAMPLES:
  # Full migration (fresh install)
  bun run tools/pai-to-opencode-converter.ts --source ~/.claude --target .opencode

  # Selective import to existing fresh 2.3 install
  bun run tools/pai-to-opencode-converter.ts --source ~/.claude --target .opencode --mode selective

  # Dry run to preview changes
  bun run tools/pai-to-opencode-converter.ts --dry-run --verbose --mode selective

VERSION SUPPORT:
  ✅ PAI 2.3     Full support (selective + full)
  ✅ PAI 2.1-2.2 Full support (selective + full)
  ⚠️  PAI 2.0     Partial support (may need pre-migration)
  ❌ PAI 1.x     Not supported (start fresh)

OUTPUT:
  Creates a migration report at <target>/MIGRATION-REPORT.md
`);
}

type MigrationMode = "full" | "selective";

function parseCliArgs(): {
  source: string;
  target: string;
  mode: MigrationMode;
  dryRun: boolean;
  backup: boolean;
  skipValidation: boolean;
  skipGates: boolean;
  verbose: boolean;
  help: boolean;
} {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      source: { type: "string", default: "~/.claude" },
      target: { type: "string", default: ".opencode" },
      mode: { type: "string", default: "full" },
      "dry-run": { type: "boolean", default: false },
      backup: { type: "boolean", default: true },
      "no-backup": { type: "boolean", default: false },
      "skip-validation": { type: "boolean", default: false },
      "skip-gates": { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  });

  // Expand ~ in paths
  const expandPath = (p: string): string => {
    if (p.startsWith("~/")) {
      return join(process.env.HOME || "", p.slice(2));
    }
    return p;
  };

  // Validate mode
  const mode = values.mode as string;
  if (mode !== "full" && mode !== "selective") {
    console.error(`❌ Invalid mode: ${mode}. Must be "full" or "selective".`);
    process.exit(1);
  }

  return {
    source: expandPath(values.source as string),
    target: expandPath(values.target as string),
    mode: mode as MigrationMode,
    dryRun: values["dry-run"] as boolean,
    backup: (values.backup as boolean) && !(values["no-backup"] as boolean),
    skipValidation: values["skip-validation"] as boolean,
    skipGates: values["skip-gates"] as boolean,
    verbose: values.verbose as boolean,
    help: values.help as boolean,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

function log(message: string, verbose: boolean, forceShow = false): void {
  if (verbose || forceShow) {
    console.log(message);
  }
}

function ensureDir(dir: string, dryRun: boolean): void {
  if (!dryRun && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// ============================================================================
// Content Classification for Selective Mode
// ============================================================================

/**
 * Standard skills that come with vanilla PAI 2.3
 * Files in these skills are SKIPPED in selective mode (use fresh 2.3 version)
 */
const STANDARD_SKILLS = [
  "CORE",
  "Agents",
  "Browser",
  "Art",
  "Research",
  "Security",
  "THEALGORITHM",
  "SpecFirst",
  "System",
  "FirstPrinciples",
  "Council",
  "RedTeam",
  "BeCreative",
  "Fabric",
  "pdf",
  "Prompting",
  "CreateSkill",
  "Intelligence",
  "KnowledgeExtraction",
  "Thinking",
  "Upgrades",
];

/**
 * USER content paths - ALWAYS imported in selective mode
 */
const USER_PATHS = [
  "skills/CORE/USER/",
  "MEMORY/",
  ".env",
  "profiles/",
];

/**
 * SYSTEM content paths - SKIPPED in selective mode
 */
const SYSTEM_PATHS = [
  "skills/CORE/SYSTEM/",
  "skills/CORE/Tools/",
  "hooks/",
  "Packs/",
];

/**
 * Determine if a file should be imported based on migration mode
 *
 * @param relativePath - Path relative to source root
 * @param mode - Migration mode (full or selective)
 * @param customSkills - List of detected custom skills (not in STANDARD_SKILLS)
 * @returns "import" | "skip" | "user-decide"
 */
function shouldImportFile(
  relativePath: string,
  mode: MigrationMode,
  customSkills: string[]
): "import" | "skip" | "user-decide" {
  // Full mode: import everything
  if (mode === "full") {
    return "import";
  }

  // Selective mode logic

  // 1. Always import USER content
  for (const userPath of USER_PATHS) {
    if (relativePath.startsWith(userPath) || relativePath === userPath.replace(/\/$/, "")) {
      return "import";
    }
  }

  // 2. Always skip SYSTEM content
  for (const systemPath of SYSTEM_PATHS) {
    if (relativePath.startsWith(systemPath)) {
      return "skip";
    }
  }

  // 3. Import CUSTOM skills (underscore prefix or not in standard list)
  if (relativePath.startsWith("skills/")) {
    const parts = relativePath.split("/");
    if (parts.length >= 2) {
      const skillName = parts[1];

      // Underscore prefix = custom skill (e.g., skills/_MySkill/)
      if (skillName.startsWith("_")) {
        return "import";
      }

      // Check if it's in the custom skills list (not in standard)
      if (customSkills.includes(skillName)) {
        return "import";
      }

      // Standard skill - check if it's modified
      if (STANDARD_SKILLS.includes(skillName)) {
        // For now, skip standard skills in selective mode
        // In future: could check for modifications and ask user
        return "skip";
      }

      // Unknown skill (not in standard list, not underscore) - import it
      return "import";
    }
  }

  // 4. Skip Tools/ directory in selective mode (use fresh 2.3 version)
  if (relativePath.startsWith("Tools/") || relativePath.startsWith("tools/")) {
    return "skip";
  }

  // 5. Import agents/ (usually customized)
  if (relativePath.startsWith("agents/")) {
    return "import";
  }

  // 6. Import mcp-servers/ (usually custom)
  if (relativePath.startsWith("mcp-servers/")) {
    return "import";
  }

  // 7. Import observability/ (custom dashboards)
  if (relativePath.startsWith("observability/")) {
    return "import";
  }

  // 8. Skip config files that are part of system (settings.json handled separately)
  if (relativePath === "settings.json" || relativePath === "bun.lock" || relativePath === "package.json") {
    return "skip";
  }

  // Default: import unknown files (safer to include than exclude)
  return "import";
}

/**
 * Format selective mode classification for display
 */
function formatSelectiveClassification(
  imported: string[],
  skipped: string[],
  userDecide: string[]
): string {
  const lines: string[] = [];

  lines.push("\n📊 Selective Mode Classification:");
  lines.push(`   ✅ Import: ${imported.length} files/dirs`);
  lines.push(`   ⏭️ Skip:   ${skipped.length} files/dirs`);
  if (userDecide.length > 0) {
    lines.push(`   ❓ Decide: ${userDecide.length} files/dirs`);
  }

  return lines.join("\n");
}

function copyDir(src: string, dest: string, dryRun: boolean, verbose: boolean): string[] {
  const copied: string[] = [];

  if (!existsSync(src)) {
    return copied;
  }

  ensureDir(dest, dryRun);

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copied.push(...copyDir(srcPath, destPath, dryRun, verbose));
    } else {
      log(`  Copy: ${relative(process.cwd(), srcPath)} → ${relative(process.cwd(), destPath)}`, verbose);
      if (!dryRun) {
        copyFileSync(srcPath, destPath);
      }
      copied.push(destPath);
    }
  }

  return copied;
}

// ============================================================================
// Translators
// ============================================================================

/**
 * Translate PAI settings.json to OpenCode opencode.json
 */
function translateSettings(source: string, target: string, dryRun: boolean, verbose: boolean): {
  success: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const settingsPath = join(source, "settings.json");

  if (!existsSync(settingsPath)) {
    warnings.push("No settings.json found in source directory");
    return { success: false, warnings };
  }

  const settings: SettingsJson = JSON.parse(readFileSync(settingsPath, "utf-8"));
  log(`  Reading: ${settingsPath}`, verbose);

  // Map to OpenCode format - OpenCode uses a different schema than PAI
  // See: https://opencode.ai/config.json for schema reference
  const opencode: OpencodeJson = {
    $schema: "https://opencode.ai/config.json",
    theme: "dark",
    model: "anthropic/claude-sonnet-4-5",  // OpenCode uses provider/model format
    snapshot: true,
  };

  // Map username from principal.name or daidentity.name
  if (settings.principal?.name) {
    opencode.username = settings.principal.name;
  }

  // Map MCP servers
  if (settings.mcpServers) {
    opencode.mcp = settings.mcpServers;
    warnings.push(
      "MCP servers copied but may need adjustment. " +
      "OpenCode MCP format may differ slightly from Claude Code."
    );
  }

  // Note about permissions - OpenCode handles them differently (via plugins)
  if (settings.permissions) {
    warnings.push(
      `PAI permissions (allow/deny/ask) cannot be auto-translated. ` +
      `OpenCode uses plugin-based permission handling. See MIGRATION-REPORT.md.`
    );
  }

  // Note about hooks - they need manual migration
  if (settings.hooks) {
    const hookCount = Object.keys(settings.hooks).length;
    warnings.push(
      `PAI hooks (${hookCount} event types) require manual migration to OpenCode plugins. ` +
      `See MIGRATION-REPORT.md for details.`
    );
  }

  // Note about AI identity - OpenCode doesn't have this concept in config
  if (settings.daidentity) {
    warnings.push(
      `PAI daidentity (AI name, color, voice) is not supported in OpenCode config. ` +
      `This can be implemented via CORE skill customization.`
    );
  }

  // Write opencode.json - should go to project ROOT, not inside .opencode
  // If target ends with .opencode, put opencode.json in parent directory
  let configDir = target;
  if (target.endsWith(".opencode") || target.endsWith(".opencode/")) {
    configDir = dirname(target);
    // Handle case where target is literally ".opencode" (relative path)
    if (configDir === ".") {
      configDir = process.cwd();
    }
  }

  const outputPath = join(configDir, "opencode.json");
  log(`  Writing: ${outputPath}`, verbose);

  if (!dryRun) {
    ensureDir(configDir, dryRun);
    writeFileSync(outputPath, JSON.stringify(opencode, null, 2) + "\n");
  }

  return { success: true, warnings };
}

/**
 * Translate PAI skills/ to OpenCode skill/
 *
 * Skills are nearly identical in format - just copy with path updates.
 * In selective mode, only USER content and custom skills are imported.
 */
function translateSkills(
  source: string,
  target: string,
  dryRun: boolean,
  verbose: boolean,
  mode: MigrationMode,
  customSkills: string[]
): {
  converted: string[];
  skipped: string[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const converted: string[] = [];
  const skipped: string[] = [];
  const skillsSource = join(source, "skills");
  const skillsTarget = join(target, "skills");

  if (!existsSync(skillsSource)) {
    warnings.push("No skills/ directory found in source");
    return { converted: [], skipped: [], warnings };
  }

  log(`\nTranslating skills/ (mode: ${mode})`, verbose, true);

  // Process skills directory with selective filtering
  function processSkillsDir(srcDir: string, destDir: string, relativeBase: string): void {
    if (!existsSync(srcDir)) return;

    const entries = readdirSync(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(srcDir, entry.name);
      const destPath = join(destDir, entry.name);
      const relativePath = join(relativeBase, entry.name);

      // Check if this should be imported
      const action = shouldImportFile(relativePath, mode, customSkills);

      if (action === "skip") {
        log(`  ⏭️ Skip: ${relativePath}`, verbose);
        skipped.push(relativePath);
        continue;
      }

      if (entry.isDirectory()) {
        ensureDir(destPath, dryRun);
        processSkillsDir(srcPath, destPath, relativePath);
      } else {
        log(`  ✅ Copy: ${relativePath}`, verbose);
        if (!dryRun) {
          ensureDir(dirname(destPath), dryRun);
          copyFileSync(srcPath, destPath);
        }
        converted.push(destPath);
      }
    }
  }

  ensureDir(skillsTarget, dryRun);
  processSkillsDir(skillsSource, skillsTarget, "skills/");

  // Update any .claude references in skill files to .opencode
  if (!dryRun) {
    for (const file of converted) {
      if (file.endsWith(".md") || file.endsWith(".ts")) {
        let content = readFileSync(file, "utf-8");
        const originalContent = content;

        // Replace common path references
        content = content.replace(/\.claude\//g, ".opencode/");
        content = content.replace(/~\/\.claude/g, "~/.opencode");
        // OpenCode now uses plural 'skills' (v0.9.3+)
        // No replacement needed - already plural

        // Fix YAML frontmatter: quote description fields that contain special chars
        // This prevents YAML parsing errors with colons, quotes, etc.
        if (file.endsWith(".md")) {
          content = content.replace(
            /^(description:\s*)(.+)$/gm,
            (match, prefix, desc) => {
              // If already quoted, leave it alone
              if ((desc.startsWith('"') && desc.endsWith('"')) ||
                  (desc.startsWith("'") && desc.endsWith("'"))) {
                return match;
              }
              // If contains special YAML chars (colon, quote, etc.), wrap in quotes
              if (desc.includes(':') || desc.includes("'") || desc.includes('"') ||
                  desc.includes('#') || desc.includes('|') || desc.includes('>')) {
                // Escape internal double quotes and wrap
                const escaped = desc.replace(/"/g, '\\"');
                return `${prefix}"${escaped}"`;
              }
              return match;
            }
          );
        }

        if (content !== originalContent) {
          writeFileSync(file, content);
          log(`  Updated paths in: ${relative(process.cwd(), file)}`, verbose);
        }
      }
    }
  }

  // Add selective mode summary
  if (mode === "selective") {
    log(formatSelectiveClassification(converted, skipped, []), verbose, true);
  }

  return { converted, skipped, warnings };
}

// Model mapping for OpenCode format
// OpenCode requires full provider/model format, not just model names
// Cost-aware model assignment:
// - Intern/Explore: haiku (cheap, fast for grunt work)
// - All other named agents: sonnet (balanced cost/capability)
// - PAI main agent uses opus (but that's not in agent files)
const MODEL_MAPPING: Record<string, string> = {
  opus: "anthropic/claude-opus-4-5",
  sonnet: "anthropic/claude-sonnet-4-5",
  haiku: "anthropic/claude-haiku-4-5",
};

// Agents that should use haiku (grunt work, parallel tasks)
const HAIKU_AGENTS = ["intern", "explore"];

/**
 * Get the correct OpenCode model format for an agent
 * Based on cost-aware model assignment strategy
 */
function getModelForAgent(agentName: string, currentModel: string): string {
  const normalizedName = agentName.toLowerCase().replace(/\.md$/, "");

  // Intern and Explore use haiku for cost efficiency
  if (HAIKU_AGENTS.some(h => normalizedName.includes(h))) {
    return MODEL_MAPPING.haiku;
  }

  // All other named agents use sonnet (good balance of cost/capability)
  // Even if source says "opus", we map to sonnet for named agents
  return MODEL_MAPPING.sonnet;
}

// Named color to hex mapping for agent color conversion
const COLOR_NAME_TO_HEX: Record<string, string> = {
  // Basic colors
  red: "#FF0000",
  green: "#00FF00",
  blue: "#0000FF",
  cyan: "#00FFFF",
  magenta: "#FF00FF",
  yellow: "#FFFF00",
  black: "#000000",
  white: "#FFFFFF",
  // Extended colors
  orange: "#FFA500",
  purple: "#800080",
  pink: "#FFC0CB",
  gray: "#808080",
  grey: "#808080",
  lime: "#00FF00",
  navy: "#000080",
  teal: "#008080",
  olive: "#808000",
  maroon: "#800000",
  silver: "#C0C0C0",
  aqua: "#00FFFF",
  fuchsia: "#FF00FF",
  coral: "#FF7F50",
  gold: "#FFD700",
  indigo: "#4B0082",
  violet: "#EE82EE",
  turquoise: "#40E0D0",
  salmon: "#FA8072",
  crimson: "#DC143C",
};

/**
 * Convert named color to hex format
 * OpenCode requires hex format #RRGGBB for agent colors
 */
function convertColorToHex(color: string): string {
  // If already hex format, return as-is
  if (color.startsWith("#") && color.length === 7) {
    return color;
  }
  // If it's a short hex like #FFF, expand it
  if (color.startsWith("#") && color.length === 4) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  }
  // Convert named color to hex
  const normalized = color.toLowerCase().trim();
  return COLOR_NAME_TO_HEX[normalized] || "#808080"; // Default to gray if unknown
}

/**
 * Translate PAI agents/ to OpenCode agent/
 *
 * Agent format is similar but OpenCode uses different frontmatter.
 * Key differences:
 * - OpenCode requires hex colors (#RRGGBB), not named colors
 * - voiceId and permissions fields may not be supported
 */
function translateAgents(source: string, target: string, dryRun: boolean, verbose: boolean): {
  converted: string[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const agentsSource = join(source, "agents");
  const agentsTarget = join(target, "agents");

  if (!existsSync(agentsSource)) {
    // Agents are optional
    return { converted: [], warnings };
  }

  log(`\nTranslating agents/`, verbose, true);
  const converted = copyDir(agentsSource, agentsTarget, dryRun, verbose);

  // Post-process agent files to convert named colors to hex
  if (!dryRun) {
    for (const file of converted) {
      if (file.endsWith(".md")) {
        let content = readFileSync(file, "utf-8");
        const originalContent = content;

        // Find and replace color field in YAML frontmatter
        // Matches: color: cyan or color: "cyan" etc.
        content = content.replace(
          /^(color:\s*)([a-zA-Z]+)(\s*)$/gm,
          (match, prefix, colorName, suffix) => {
            const hexColor = convertColorToHex(colorName);
            log(`  Color converted: ${colorName} → ${hexColor} in ${basename(file)}`, verbose);
            return `${prefix}"${hexColor}"${suffix}`;
          }
        );

        // Also handle quoted named colors
        content = content.replace(
          /^(color:\s*["'])([a-zA-Z]+)(["']\s*)$/gm,
          (match, prefix, colorName, suffix) => {
            const hexColor = convertColorToHex(colorName);
            log(`  Color converted: ${colorName} → ${hexColor} in ${basename(file)}`, verbose);
            return `${prefix.replace(/["']$/, '"')}${hexColor}"`;
          }
        );

        // Remove unsupported fields that OpenCode doesn't recognize
        // voiceId is PAI-specific
        content = content.replace(/^voiceId:.*$/gm, "# voiceId removed (PAI-specific)");

        // PAI permissions format differs from OpenCode
        // Remove entire permissions block in frontmatter
        content = content.replace(
          /^permissions:\s*\n(\s+.*\n)*/gm,
          "# permissions removed (use OpenCode plugins instead)\n"
        );

        // Convert model names to OpenCode format (provider/model)
        // Cost-aware: intern/explore → haiku, all others → sonnet
        const agentName = basename(file);
        content = content.replace(
          /^(model:\s*)(\w+)(\s*)$/gm,
          (match, prefix, modelName, suffix) => {
            const openCodeModel = getModelForAgent(agentName, modelName);
            log(`  Model converted: ${modelName} → ${openCodeModel} in ${agentName}`, verbose);
            return `${prefix}${openCodeModel}${suffix}`;
          }
        );

        // v0.9.5: Replace path references in agent body content (not just frontmatter)
        // This catches skill references, tool paths, etc. in agent documentation
        content = content.replace(/\.claude\//g, ".opencode/");
        content = content.replace(/~\/\.claude/g, "~/.opencode");

        if (content !== originalContent) {
          writeFileSync(file, content);
          log(`  Transformed: ${relative(process.cwd(), file)}`, verbose);
        }
      }
    }
  }

  return { converted, warnings };
}

/**
 * Copy MEMORY/ directory (direct copy, structure is compatible)
 * MEMORY is ALWAYS imported in both full and selective modes
 */
function translateMemory(source: string, target: string, dryRun: boolean, verbose: boolean, mode: MigrationMode): {
  converted: string[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const memorySource = join(source, "MEMORY");
  const memoryTarget = join(target, "MEMORY");

  if (!existsSync(memorySource)) {
    return { converted: [], warnings };
  }

  log(`\nCopying MEMORY/ (always imported in ${mode} mode)`, verbose, true);
  const converted = copyDir(memorySource, memoryTarget, dryRun, verbose);

  return { converted, warnings };
}

/**
 * Translate PAI Tools/ to OpenCode Tools/
 *
 * Tools contain TypeScript utilities that may reference .claude paths.
 * All .ts files are processed for path replacement.
 *
 * In SELECTIVE mode: Tools/ is SKIPPED (use fresh 2.3 version)
 *
 * @since v0.9.5
 */
function translateTools(source: string, target: string, dryRun: boolean, verbose: boolean, mode: MigrationMode): {
  converted: string[];
  skipped: string[];
  warnings: string[];
} {
  const warnings: string[] = [];

  // In selective mode, skip Tools/ entirely - use fresh 2.3 version
  if (mode === "selective") {
    log(`\n⏭️ Skipping Tools/ (selective mode - using fresh 2.3 version)`, verbose, true);
    return { converted: [], skipped: ["Tools/"], warnings };
  }

  const toolsSource = join(source, "Tools");
  const toolsTarget = join(target, "Tools");

  if (!existsSync(toolsSource)) {
    // Tools may also be lowercase
    const toolsSourceLower = join(source, "tools");
    if (!existsSync(toolsSourceLower)) {
      return { converted: [], skipped: [], warnings };
    }
    // Use lowercase variant
    const result = translateToolsDir(toolsSourceLower, join(target, "tools"), dryRun, verbose);
    return { ...result, skipped: [] };
  }

  const result = translateToolsDir(toolsSource, toolsTarget, dryRun, verbose);
  return { ...result, skipped: [] };
}

/**
 * Helper to translate a tools directory
 */
function translateToolsDir(toolsSource: string, toolsTarget: string, dryRun: boolean, verbose: boolean): {
  converted: string[];
  warnings: string[];
} {
  const warnings: string[] = [];

  log(`\nTranslating Tools/`, verbose, true);
  const converted = copyDir(toolsSource, toolsTarget, dryRun, verbose);

  // Update path references in TypeScript files
  if (!dryRun) {
    for (const file of converted) {
      if (file.endsWith(".ts") || file.endsWith(".js")) {
        let content = readFileSync(file, "utf-8");
        const originalContent = content;

        // Replace common path references
        content = content.replace(/\.claude\//g, ".opencode/");
        content = content.replace(/~\/\.claude/g, "~/.opencode");
        content = content.replace(/"\\.claude"/g, '".opencode"');
        content = content.replace(/'\\.claude'/g, "'.opencode'");

        if (content !== originalContent) {
          writeFileSync(file, content);
          log(`  Updated paths in: ${relative(process.cwd(), file)}`, verbose);
        }
      }
    }
  }

  return { converted, warnings };
}

/**
 * Discover hooks in source and generate plugin templates
 *
 * Scans hooks/ directory for TypeScript/JavaScript hooks.
 * Generates template entry points for the pai-unified plugin.
 *
 * @since v0.9.6
 */
function discoverHooks(source: string, verbose: boolean): {
  hooks: Array<{
    name: string;
    path: string;
    event: string;
    templateCode: string;
  }>;
  warnings: string[];
} {
  const warnings: string[] = [];
  const hooks: Array<{
    name: string;
    path: string;
    event: string;
    templateCode: string;
  }> = [];

  const hooksDir = join(source, "hooks");

  if (!existsSync(hooksDir)) {
    return { hooks, warnings };
  }

  // Event mapping from PAI hook names to OpenCode plugin events
  const HOOK_TO_EVENT: Record<string, string> = {
    "session-start": "experimental.chat.system.transform",
    "initialize-session": "experimental.chat.system.transform",
    "load-core-context": "experimental.chat.system.transform",
    "security-validator": "tool.execute.before",
    "pre-tool-use": "tool.execute.before",
    "post-tool-use": "tool.execute.after",
    "user-prompt-submit": "chat.message",
    "capture-all-events": "event",
    "stop": "event",
    "stop-hook": "event",
  };

  const hookFiles = readdirSync(hooksDir).filter(
    f => f.endsWith(".ts") || f.endsWith(".js")
  );

  for (const hookFile of hookFiles) {
    const hookName = hookFile.replace(/\.(ts|js)$/, "");
    const hookPath = join(hooksDir, hookFile);

    // Try to determine event from hook name
    let event = "event"; // Default fallback
    for (const [pattern, mappedEvent] of Object.entries(HOOK_TO_EVENT)) {
      if (hookName.toLowerCase().includes(pattern.replace(/-/g, ""))) {
        event = mappedEvent;
        break;
      }
    }

    // Generate template code snippet
    const templateCode = `
// Template for ${hookName} hook
// Original: hooks/${hookFile}
// Event: ${event}
"${event}": async (input, output) => {
  // TODO: Migrate logic from ${hookFile}
  // Key differences:
  // - Args are in output.args (not input.args)
  // - Block by throwing Error (not exit code 2)
  // - Use fileLog() for logging (not console.log)

  fileLog("${hookName}", "Event received");

  // Original hook logic goes here
},`;

    hooks.push({
      name: hookName,
      path: hookPath,
      event,
      templateCode,
    });

    log(`  Found hook: ${hookFile} → ${event}`, verbose);
  }

  return { hooks, warnings };
}

/**
 * Check if file is a system file and show validation gate if needed
 */
function checkValidationGate(
  sourcePath: string,
  targetPath: string,
  manifest: MigrationManifest,
  skipGates: boolean,
  verbose: boolean
): "overwrite" | "keep" | "skip" {
  const relativePath = relative(process.cwd(), targetPath);
  const systemFile = isSystemFile(relativePath);

  if (!systemFile) {
    return "overwrite"; // Not a system file, proceed normally
  }

  // Auto-approve if --skip-gates
  if (skipGates) {
    log(`  [AUTO] Validation gate skipped for: ${relativePath}`, verbose);
    addValidationGateResult(manifest, relativePath, "overwrite");
    return "overwrite";
  }

  // If target doesn't exist yet, no conflict
  if (!existsSync(targetPath)) {
    return "overwrite";
  }

  // Compare files and show validation gate
  const comparison = compareFiles(sourcePath, targetPath);

  log(formatValidationGate(comparison), true, true);

  // For now, auto-approve based on recommendation
  // In future: implement interactive prompt
  const choice = comparison.recommendation === "keep" ? "keep" : "overwrite";
  addValidationGateResult(manifest, relativePath, choice);

  return choice;
}

/**
 * Post-conversion validation
 *
 * Scans target directory for remaining .claude references.
 * Returns list of files that still contain .claude paths.
 *
 * @since v0.9.5
 */
function validateConversion(target: string, verbose: boolean): {
  remainingReferences: string[];
  clean: boolean;
} {
  const remainingReferences: string[] = [];

  log(`\n🔍 Validating conversion (checking for remaining .claude references)...`, verbose, true);

  function scanDir(dir: string): void {
    if (!existsSync(dir)) return;

    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Skip backup files and common non-text files
      if (entry.name.endsWith(".bak") || entry.name.endsWith(".backup")) continue;
      if (entry.name === "node_modules" || entry.name === ".git") continue;

      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile()) {
        // Only check text files
        const ext = entry.name.split(".").pop()?.toLowerCase();
        if (!["md", "ts", "js", "json", "yaml", "yml", "txt"].includes(ext || "")) continue;

        try {
          const content = readFileSync(fullPath, "utf-8");
          // Check for .claude references (but not in comments about migration)
          if (content.includes(".claude/") || content.includes("~/.claude")) {
            // Exclude false positives from migration documentation
            const lines = content.split("\n");
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if ((line.includes(".claude/") || line.includes("~/.claude")) &&
                  !line.includes("→") &&  // Migration arrows
                  !line.includes("MIGRATION") &&
                  !line.includes("// PAI") &&
                  !line.includes("# PAI")) {
                remainingReferences.push(`${relative(process.cwd(), fullPath)}:${i + 1}`);
                break; // One per file is enough
              }
            }
          }
        } catch (e) {
          // Skip files that can't be read
        }
      }
    }
  }

  scanDir(target);

  return {
    remainingReferences,
    clean: remainingReferences.length === 0,
  };
}

/**
 * Generate migration report documenting manual work needed
 */
function generateMigrationReport(
  result: ConversionResult,
  source: string,
  target: string,
  dryRun: boolean,
  validationResult?: { clean: boolean; remainingReferences: string[] }
): void {
  const hooksSource = join(source, "hooks");
  let hooksInfo = "";

  if (existsSync(hooksSource)) {
    const hooks = readdirSync(hooksSource).filter(f => f.endsWith(".ts") || f.endsWith(".js"));
    hooksInfo = `
## Hooks Requiring Manual Migration

The following hooks were found but **cannot be auto-translated** due to architectural differences:

| PAI Hook File | OpenCode Equivalent | Migration Notes |
|---------------|---------------------|-----------------|
${hooks.map(h => `| \`${h}\` | plugin handler | Rewrite as async function in \`plugin/pai-unified.ts\` |`).join("\n")}

### Hook → Plugin Migration Guide

PAI hooks use **shell scripts with exit codes**:
\`\`\`typescript
// PAI Hook (Claude Code)
export default async function(input) {
  if (dangerous) {
    process.exit(2); // Block execution
  }
}
\`\`\`

OpenCode plugins use **async functions that throw**:
\`\`\`typescript
// OpenCode Plugin
"tool.execute.before": async (input, output) => {
  if (dangerous) {
    throw new Error("Blocked!"); // Block execution
  }
}
\`\`\`

**Key Differences:**
1. Args location: \`output.args\` (NOT \`input.args\`)
2. Tool names: lowercase (\`bash\`, not \`Bash\`)
3. Blocking: throw Error (NOT exit code 2)
4. Logging: file-only (NOT console.log - corrupts TUI)

See \`docs/PLUGIN-ARCHITECTURE.md\` for complete guide.
`;
  }

  // Agent invocation info - always include this critical information
  const agentInvocationInfo = `
## Agent Invocation (CRITICAL DIFFERENCE)

**OpenCode has TWO different agent invocation contexts!**

### For AI (Task tool delegation):
\`\`\`typescript
// ✅ WORKS - Creates clickable session
Task({ subagent_type: "Intern", prompt: "research X" })
Task({ subagent_type: "Architect", prompt: "design Y" })
Task({ subagent_type: "Engineer", prompt: "implement Z" })
\`\`\`

### For User (input field):
\`\`\`
@intern research X     → Agent is invoked ✅
@architect design Y    → Agent is invoked ✅
\`\`\`

### What DOES NOT work:
\`\`\`typescript
// ❌ DOES NOT WORK - @syntax in AI response is just text!
@intern research X    // This does NOTHING when written by AI!
\`\`\`

### Available subagent_types:
| Type | Model | Purpose |
|------|-------|---------|
| \`Intern\` | Haiku | Fast parallel grunt work |
| \`Architect\` | Sonnet | System design |
| \`Engineer\` | Sonnet | Code implementation |
| \`Designer\` | Sonnet | UX/UI design |
| \`Pentester\` | Sonnet | Security testing |
| \`Researcher\` | Sonnet | General research |
| \`Explore\` | Haiku | Native codebase exploration |
| \`Plan\` | Sonnet | Native implementation planning |
| \`general-purpose\` | Varies | Custom prompts |

**Migration action:** Ensure any AI delegation documentation uses \`Task({subagent_type})\` syntax, NOT \`@agentname\` syntax.

See \`PAIAGENTSYSTEM.md\` for complete agent documentation.
`;

  const report = `# PAI → OpenCode Migration Report

**Generated:** ${new Date().toISOString()}
**Source:** \`${source}\`
**Target:** \`${target}\`
**Mode:** ${dryRun ? "DRY RUN" : "EXECUTED"}

## Summary

| Category | Count |
|----------|-------|
| Files Converted | ${result.converted.length} |
| Files Skipped | ${result.skipped.length} |
| Warnings | ${result.warnings.length} |
| Errors | ${result.errors.length} |
| Manual Work Required | ${result.manualRequired.length} |
| Validation | ${validationResult?.clean ? "✅ CLEAN" : `⚠️ ${validationResult?.remainingReferences.length || 0} remaining`} |

## What Was Converted

${result.converted.length > 0 ? result.converted.map(f => `- ✅ \`${relative(process.cwd(), f)}\``).join("\n") : "No files converted."}

## Warnings

${result.warnings.length > 0 ? result.warnings.map(w => `- ⚠️ ${w}`).join("\n") : "No warnings."}

## Errors

${result.errors.length > 0 ? result.errors.map(e => `- ❌ ${e}`).join("\n") : "No errors."}

## Post-Conversion Validation

${validationResult?.clean
  ? "✅ **CLEAN** - No remaining `.claude` references found."
  : `⚠️ **${validationResult?.remainingReferences.length || 0} remaining references** found:

${(validationResult?.remainingReferences || []).map(r => `- \`${r}\``).join("\n")}

These files may need manual review and path updates.`}
${hooksInfo}
${agentInvocationInfo}
## Next Steps

1. Review the converted files in \`${target}/\`
2. Manually migrate hooks to plugins (see guide above)
3. Test the OpenCode installation:
   \`\`\`bash
   cd ${target}/..
   opencode
   \`\`\`
4. Verify skills load correctly
5. Test security blocking if applicable

## References

- [PAI-OpenCode Documentation](https://github.com/Steffen025/pai-opencode)
- [OpenCode Plugin Docs](https://opencode.ai/docs/plugins/)
- \`docs/PLUGIN-ARCHITECTURE.md\` - Detailed plugin guide
- \`docs/EVENT-MAPPING.md\` - Hook → Event mapping

---
*Generated by pai-to-opencode-converter v0.9.7*
`;

  const reportPath = join(target, "MIGRATION-REPORT.md");

  if (!dryRun) {
    ensureDir(target, dryRun);
    writeFileSync(reportPath, report);
  }

  console.log(`\n📄 Migration report: ${reportPath}`);
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  const args = parseCliArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  console.log(`
╭──────────────────────────────────────────╮
│  PAI → OpenCode Converter v1.0.0        │
╰──────────────────────────────────────────╯
`);

  console.log(`Source: ${args.source}`);
  console.log(`Target: ${args.target}`);
  console.log(`Mode:   ${args.mode.toUpperCase()}${args.dryRun ? " (DRY RUN)" : ""}`);
  console.log("");

  // Validate source exists
  if (!existsSync(args.source)) {
    console.error(`❌ Source directory not found: ${args.source}`);
    process.exit(1);
  }

  // Version Detection (v1.0.0)
  console.log("🔍 Detecting PAI version...");
  const versionResult = detectPAIVersion(args.source);
  console.log(formatVersionInfo(versionResult));
  console.log("");

  // Check migration support
  const migrationCheck = isSelectiveMigrationSupported(args.source);

  if (!migrationCheck.supported && args.mode === "selective") {
    console.error(`❌ Selective migration not supported for PAI ${migrationCheck.version}`);
    console.error(`   ${migrationCheck.reason}`);
    console.error("\nOptions:");
    console.error("  1. Use --mode full for complete migration");
    console.error("  2. Start fresh with OpenCode 2.3");
    if (migrationCheck.version === "2.0") {
      console.error("  3. Run PAI 2.0 → 2.1 migrator first");
    }
    process.exit(1);
  }

  if (versionResult.migrationSupport === "partial" && args.mode === "selective") {
    console.warn(`⚠️  Warning: PAI ${versionResult.version} has partial selective import support`);
    console.warn(`   ${versionResult.migrationNotes[0]}`);
    console.warn("");
  }

  // Initialize result
  const result: ConversionResult = {
    success: true,
    source: args.source,
    target: args.target,
    converted: [],
    skipped: [],
    warnings: [],
    errors: [],
    manualRequired: [],
  };

  // Initialize migration manifest
  const manifest = createManifest(args.source);
  manifest.source = detectSource(args.source);

  log(`\n📦 Source detection:`, args.verbose, true);
  log(`  PAI Version: ${versionResult.version}`, args.verbose, true);
  log(`  Hooks: ${manifest.source.detected.hooks.length}`, args.verbose, true);
  log(`  Skills: ${manifest.source.detected.skills.length}`, args.verbose, true);
  log(`  Custom Skills: ${manifest.source.detected.customizations.customSkills.join(", ") || "none"}`, args.verbose, true);

  // Create backup if requested
  if (args.backup && existsSync(args.target) && !args.dryRun) {
    const backupPath = `${args.target}.backup-${Date.now()}`;
    console.log(`📦 Creating backup: ${backupPath}`);
    copyDir(args.target, backupPath, false, args.verbose);
  }

  // 1. Translate settings
  console.log("\n📋 Translating settings.json...");
  const settingsResult = translateSettings(args.source, args.target, args.dryRun, args.verbose);
  if (settingsResult.success) {
    result.converted.push(join(args.target, "opencode.json"));
  }
  result.warnings.push(...settingsResult.warnings);

  // Get custom skills for selective mode
  const customSkills = manifest.source.detected.customizations.customSkills;

  // 2. Translate skills (with selective mode support)
  console.log("\n📚 Translating skills/...");
  const skillsResult = translateSkills(
    args.source,
    args.target,
    args.dryRun,
    args.verbose,
    args.mode,
    customSkills
  );
  result.converted.push(...skillsResult.converted);
  result.skipped.push(...skillsResult.skipped);
  result.warnings.push(...skillsResult.warnings);

  // 3. Translate agents (usually customized, import in both modes)
  console.log("\n🤖 Translating agents/...");
  const agentsResult = translateAgents(args.source, args.target, args.dryRun, args.verbose);
  result.converted.push(...agentsResult.converted);
  result.warnings.push(...agentsResult.warnings);

  // 4. Copy MEMORY (always imported)
  console.log("\n💾 Copying MEMORY/...");
  const memoryResult = translateMemory(args.source, args.target, args.dryRun, args.verbose, args.mode);
  result.converted.push(...memoryResult.converted);
  result.warnings.push(...memoryResult.warnings);

  // 5. Translate Tools (skipped in selective mode)
  console.log("\n🔧 Translating Tools/...");
  const toolsResult = translateTools(args.source, args.target, args.dryRun, args.verbose, args.mode);
  result.converted.push(...toolsResult.converted);
  result.skipped.push(...toolsResult.skipped);
  result.warnings.push(...toolsResult.warnings);

  // 6. Check for hooks (manual migration required)
  const hooksPath = join(args.source, "hooks");
  if (existsSync(hooksPath)) {
    const hooks = readdirSync(hooksPath).filter(f => f.endsWith(".ts") || f.endsWith(".js"));
    if (hooks.length > 0) {
      result.manualRequired.push(...hooks.map(h => `hooks/${h} → plugin/ (manual migration)`));
      result.warnings.push(
        `Found ${hooks.length} hooks that require manual migration to plugins. ` +
        `See MIGRATION-REPORT.md for details.`
      );
    }
  }

  // 7. Post-conversion validation (v0.9.5)
  let validationResult = { clean: true, remainingReferences: [] as string[] };
  if (!args.dryRun) {
    validationResult = validateConversion(args.target, args.verbose);
    if (!validationResult.clean) {
      result.warnings.push(
        `Post-conversion validation found ${validationResult.remainingReferences.length} remaining .claude reference(s). ` +
        `See MIGRATION-REPORT.md for details.`
      );
    }
  }

  // Write migration manifest (skip in dry-run)
  if (!args.dryRun) {
    writeManifest(manifest, args.target);
  } else {
    console.log("\n📄 Migration manifest would be written to: " + join(args.target, "MIGRATION-MANIFEST.json"));
    console.log(getManifestSummary(manifest));
  }

  // Auto-run MigrationValidator unless skipped
  if (!args.skipValidation && !args.dryRun) {
    console.log("\n🔍 Running MigrationValidator...");
    try {
      const { spawn } = await import("child_process");
      const manifestPath = join(args.target, "MIGRATION-MANIFEST.json");
      const validatorProcess = spawn("bun", [
        "run",
        join(dirname(import.meta.path), "MigrationValidator.ts"),
        "--manifest", manifestPath,
        "--target", args.target,
        "--skip-llm", // Skip LLM checks by default for speed
        args.verbose ? "--verbose" : "",
      ].filter(Boolean), {
        stdio: "inherit",
      });

      await new Promise((resolve) => validatorProcess.on("close", resolve));
    } catch (error) {
      console.warn("⚠️ MigrationValidator failed:", error);
    }
  }

  // Generate migration report
  generateMigrationReport(result, args.source, args.target, args.dryRun, validationResult);

  // Print summary
  console.log(`
╭──────────────────────────────────────────╮
│  Conversion Complete                     │
╰──────────────────────────────────────────╯

Mode: ${args.mode.toUpperCase()}
✅ Converted: ${result.converted.length} files
${args.mode === "selective" ? `⏭️ Skipped:   ${result.skipped.length} files (using fresh 2.3 versions)\n` : ""}⚠️  Warnings:  ${result.warnings.length}
🔧 Manual:    ${result.manualRequired.length} items
${validationResult.clean ? "✅ Validation: CLEAN (no .claude references found)" : `⚠️  Validation: ${validationResult.remainingReferences.length} .claude reference(s) remaining`}

${args.dryRun ? "This was a DRY RUN - no files were modified." : "Files have been written to: " + args.target}
`);

  if (result.warnings.length > 0) {
    console.log("Warnings:");
    result.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
  }

  if (result.manualRequired.length > 0) {
    console.log("\nManual migration required:");
    result.manualRequired.forEach(m => console.log(`  🔧 ${m}`));
  }
}

main().catch(err => {
  console.error("❌ Converter failed:", err);
  process.exit(1);
});
